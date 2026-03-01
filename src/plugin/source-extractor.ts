import path from 'node:path'
import ts from 'typescript'
import type { AtlasSource } from '../types/index.js'

/**
 * Dedent a block of text by removing the common leading whitespace.
 */
function dedent(text: string): string {
  const lines = text.split('\n')
  // Filter out empty lines for indent calculation
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0)
  if (nonEmptyLines.length === 0) return text

  const minIndent = Math.min(
    ...nonEmptyLines.map((line) => {
      const match = line.match(/^(\s*)/)
      return match ? match[1].length : 0
    }),
  )

  if (minIndent === 0) return text

  return lines
    .map((line) => (line.trim().length === 0 ? '' : line.slice(minIndent)))
    .join('\n')
}

/**
 * Get the column number (0-based) of a position in the source text.
 */
function getColumn(sourceText: string, pos: number): number {
  const lastNewline = sourceText.lastIndexOf('\n', pos - 1)
  return lastNewline === -1 ? pos : pos - lastNewline - 1
}

/**
 * Slice source text and dedent subsequent lines based on the starting column.
 * This handles expression bodies where the first line has no leading whitespace
 * but subsequent lines retain their original file indentation.
 */
function sliceAndDedent(
  sourceText: string,
  start: number,
  end: number,
): string {
  const text = sourceText.slice(start, end)
  const col = getColumn(sourceText, start)
  if (col === 0) return text

  const lines = text.split('\n')
  return lines
    .map((line, i) => {
      if (i === 0) return line
      if (line.trim().length === 0) return ''
      const match = line.match(/^(\s*)/)
      const indent = match ? match[1].length : 0
      return line.slice(Math.min(indent, col))
    })
    .join('\n')
}

/**
 * Extract the source code for a single export's function body.
 */
function extractExportSource(node: ts.Node, sourceText: string): string {
  // Variable declaration with initializer
  if (ts.isVariableDeclaration(node) && node.initializer) {
    return extractFunctionSource(node.initializer, sourceText)
  }

  // Function declaration
  if (ts.isFunctionDeclaration(node) && node.body) {
    return extractBlockBody(node.body, sourceText)
  }

  // Fallback: show the full node text
  return sliceAndDedent(sourceText, node.getStart(), node.getEnd())
}

/**
 * Extract meaningful source from a function expression or arrow function.
 */
function extractFunctionSource(node: ts.Node, sourceText: string): string {
  // Unwrap call expressions like example(() => ..., { ... })
  if (ts.isCallExpression(node)) {
    const firstArg = node.arguments[0]
    if (
      firstArg &&
      (ts.isArrowFunction(firstArg) || ts.isFunctionExpression(firstArg))
    ) {
      return extractFunctionSource(firstArg, sourceText)
    }
    // Fallback for HOCs, forwardRef, etc.
    return sliceAndDedent(sourceText, node.getStart(), node.getEnd())
  }

  if (ts.isArrowFunction(node)) {
    const body = node.body

    if (ts.isBlock(body)) {
      // Block body: () => { ... }
      return extractBlockBody(body, sourceText)
    }

    // Expression body
    if (ts.isParenthesizedExpression(body)) {
      // () => (<JSX />) — extract inner expression
      const inner = body.expression
      return sliceAndDedent(sourceText, inner.getStart(), inner.getEnd())
    }

    // () => <JSX /> — extract the expression directly
    return sliceAndDedent(sourceText, body.getStart(), body.getEnd())
  }

  if (ts.isFunctionExpression(node) && node.body) {
    return extractBlockBody(node.body, sourceText)
  }

  // Fallback
  return sliceAndDedent(sourceText, node.getStart(), node.getEnd())
}

/**
 * Extract the contents of a block body (without the outer braces), dedented.
 */
function extractBlockBody(block: ts.Block, sourceText: string): string {
  if (block.statements.length === 0) return ''

  const firstStatement = block.statements[0]
  const lastStatement = block.statements[block.statements.length - 1]
  const bodyText = sourceText.slice(
    firstStatement.getStart(),
    lastStatement.getEnd(),
  )
  return dedent(bodyText)
}

/**
 * Resolve a relative import path to a project-root-relative path.
 */
function resolveImportPath(importPath: string, fileDir: string): string {
  const resolved = path.posix.normalize(path.posix.join(fileDir, importPath))
  // Remove file extension if present
  return resolved.replace(/\.(tsx?|jsx?|mjs|cjs)$/, '')
}

/**
 * Transform import statements: rewrite local imports using the importPrefix.
 */
function transformImports(
  imports: string,
  filePath: string,
  importPrefix: string | null,
  importPackage:
    | string
    | ((importPath: string, examplesFile: string) => string)
    | null,
  viteAliases: Record<string, string>,
): string {
  if (
    !importPrefix &&
    !importPackage &&
    Object.keys(viteAliases).length === 0
  ) {
    return imports
  }

  const lines = imports.split('\n')
  return lines
    .map((line) => {
      const match = line.match(
        /^(import\s+.+\s+from\s+['"])([^'"]+)(['"];?\s*)$/,
      )
      if (!match) return line

      const [, prefix, specifier, suffix] = match

      // Skip node_modules / bare specifiers
      if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
        return line
      }

      if (importPackage) {
        const replacement =
          typeof importPackage === 'function'
            ? importPackage(specifier, filePath)
            : importPackage
        return `${prefix}${replacement}${suffix}`
      }

      if (importPrefix) {
        const fileDir = path.posix.dirname(filePath)
        const resolved = resolveImportPath(specifier, fileDir)
        // Strip any leading ./ or path prefix
        const cleanPath = resolved.replace(/^\.\//, '')
        // Get just the filename/component part after removing extension
        const parts = cleanPath.split('/')
        // Rebuild with importPrefix
        return `${prefix}${importPrefix}/${parts.join('/')}${suffix}`
      }

      return line
    })
    .join('\n')
}

const FILTERED_IMPORT_MODULES = new Set([
  'react',
  'react-dom',
  'react/jsx-runtime',
])

/**
 * Extract source code and imports from an examples file.
 */
export function extractSources(
  filePath: string,
  fileContent: string,
  importPrefix: string | null,
  importPackage:
    | string
    | ((importPath: string, examplesFile: string) => string)
    | null = null,
  viteAliases: Record<string, string> = {},
): AtlasSource {
  const sourceFile = ts.createSourceFile(
    filePath,
    fileContent,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  )

  const sources: Record<string, string> = {}
  const importStatements: string[] = []

  for (const statement of sourceFile.statements) {
    // Collect import statements, filtering out React internals and Atlas types
    if (ts.isImportDeclaration(statement)) {
      const specifier = statement.moduleSpecifier
      if (ts.isStringLiteral(specifier)) {
        const mod = specifier.text
        if (
          FILTERED_IMPORT_MODULES.has(mod) ||
          mod.startsWith('vite-plugin-atlas')
        ) {
          continue
        }
      }
      importStatements.push(
        fileContent.slice(statement.getStart(), statement.getEnd()),
      )
      continue
    }

    // Check for exported declarations
    const modifiers = ts.canHaveModifiers(statement)
      ? ts.getModifiers(statement)
      : undefined
    const isExported = modifiers?.some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    )

    if (!isExported) continue

    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text
          sources[name] = extractExportSource(decl, fileContent)
        }
      }
    } else if (ts.isFunctionDeclaration(statement) && statement.name) {
      const name = statement.name.text
      sources[name] = extractExportSource(statement, fileContent)
    }
  }

  const rawImports = importStatements.join('\n')
  const imports = transformImports(
    rawImports,
    filePath,
    importPrefix,
    importPackage,
    viteAliases,
  )

  return { sources, imports }
}
