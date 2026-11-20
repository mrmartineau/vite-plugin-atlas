import fs from 'node:fs/promises'
import path from 'node:path'
import { glob } from 'tinyglobby'
import ts from 'typescript'
import type { AtlasComponentEntry, ResolvedAtlasConfig } from '../types/index.js'

/**
 * Extract the static prefix from a glob pattern (everything before the first wildcard or `{`).
 */
function getGlobRoot(pattern: string): string {
  const firstWild = pattern.search(/[*?{[]/)
  if (firstWild === -1) return path.dirname(pattern)
  const prefix = pattern.slice(0, firstWild)
  // Cut at the last separator to get a clean directory prefix
  const lastSep = prefix.lastIndexOf('/')
  return lastSep === -1 ? '' : prefix.slice(0, lastSep + 1)
}

/**
 * Generate a deterministic slug from a file path and glob patterns.
 */
export function generateSlug(filePath: string, patterns: string[]): string {
  let relative = filePath

  // Find the best matching pattern (longest glob root wins)
  let longestRoot = ''
  for (const pattern of patterns) {
    const root = getGlobRoot(pattern)
    if (relative.startsWith(root) && root.length > longestRoot.length) {
      longestRoot = root
    }
  }

  // Remove glob root prefix
  if (longestRoot) {
    relative = relative.slice(longestRoot.length)
  }

  // Remove .examples.{tsx,jsx,ts,js} suffix
  relative = relative.replace(/\.examples\.(tsx|jsx|ts|js)$/, '')

  // Split into segments
  const segments = relative.split('/').filter(Boolean)

  // If the last segment equals the parent segment (case-insensitive), collapse
  if (
    segments.length >= 2 &&
    segments[segments.length - 1].toLowerCase() === segments[segments.length - 2].toLowerCase()
  ) {
    segments.pop()
  }

  // Convert to slug
  return segments.join('-').toLowerCase()
}

/**
 * Derive the component name from the examples file path.
 */
export function deriveComponentName(filePath: string): string {
  const basename = path.basename(filePath)
  return basename.replace(/\.examples\.(tsx|jsx|ts|js)$/, '')
}

/**
 * Derive the group from directory structure relative to the glob root.
 */
export function deriveGroup(filePath: string, patterns: string[]): string {
  let relative = filePath

  // Find the best matching pattern
  let longestRoot = ''
  for (const pattern of patterns) {
    const root = getGlobRoot(pattern)
    if (relative.startsWith(root) && root.length > longestRoot.length) {
      longestRoot = root
    }
  }

  if (longestRoot) {
    relative = relative.slice(longestRoot.length)
  }

  const dir = path.dirname(relative)
  if (dir === '.' || dir === '') {
    // File is directly in the glob root — use the last directory from the glob root prefix
    if (longestRoot) {
      const rootSegments = longestRoot.split('/').filter(Boolean)
      if (rootSegments.length > 0) {
        return rootSegments[rootSegments.length - 1]
      }
    }
    return 'components'
  }

  // Use the first directory segment
  const firstSegment = dir.split('/').filter(Boolean)[0]
  return firstSegment || 'components'
}

/**
 * Look for documentation files co-located with the component.
 */
export async function findDocsFile(dir: string, componentName: string): Promise<string | null> {
  const candidates = [`${componentName}.mdx`, `${componentName}.md`, 'README.mdx', 'README.md']

  for (const candidate of candidates) {
    const fullPath = path.join(dir, candidate)
    try {
      await fs.access(fullPath)
      return fullPath
    } catch {
      // File doesn't exist, try next
    }
  }

  return null
}

/**
 * Extract named exports from an examples file using the TypeScript compiler API.
 */
function extractExportNames(filePath: string, content: string): string[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  const exports: string[] = []

  for (const statement of sourceFile.statements) {
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined
    const isExported = modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)

    if (!isExported) continue

    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          exports.push(decl.name.text)
        }
      }
    } else if (ts.isFunctionDeclaration(statement) && statement.name) {
      exports.push(statement.name.text)
    }
  }

  return exports
}

/**
 * Discover all example files and build the manifest.
 */
export async function discoverExamples(
  root: string,
  config: ResolvedAtlasConfig,
): Promise<AtlasComponentEntry[]> {
  const files = await glob(config.pattern, {
    cwd: root,
    ignore: config.ignore,
    expandDirectories: false,
  })

  const entries: AtlasComponentEntry[] = []
  const slugMap = new Map<string, string>()

  for (const file of files.sort()) {
    const slug = generateSlug(file, config.pattern)
    const name = deriveComponentName(file)
    const group = deriveGroup(file, config.pattern)
    const dir = path.dirname(path.join(root, file))
    const docsFile = await findDocsFile(dir, name)

    // Detect slug collisions
    if (slugMap.has(slug)) {
      throw new Error(
        `[atlas] Slug collision: "${slug}" is generated by both:\n` +
          `  - ${slugMap.get(slug)}\n` +
          `  - ${file}\n` +
          `Please rename one of these files to resolve the collision.`,
      )
    }
    slugMap.set(slug, file)

    // Extract export names
    const fullPath = path.join(root, file)
    let exportNames: string[] = []
    try {
      const content = await fs.readFile(fullPath, 'utf-8')
      exportNames = extractExportNames(file, content)
    } catch {
      // If we can't read the file, continue with empty exports
    }

    entries.push({
      slug,
      name,
      group,
      path: path.dirname(file),
      examplesFile: file,
      docsFile: docsFile ? path.relative(root, docsFile) : null,
      exports: exportNames,
    })
  }

  return entries
}
