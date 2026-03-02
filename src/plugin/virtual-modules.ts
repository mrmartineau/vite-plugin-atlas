import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHighlighter, type Highlighter } from 'shiki'
import type {
  AtlasComponentEntry,
  ResolvedAtlasConfig,
} from '../types/index.js'
import { extractProps } from './props-extractor.js'
import { extractSources } from './source-extractor.js'

let highlighterPromise: Promise<Highlighter> | null = null

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: ['tsx'],
    })
  }
  return highlighterPromise
}

async function highlight(code: string): Promise<string> {
  const highlighter = await getHighlighter()
  return highlighter.codeToHtml(code, {
    lang: 'tsx',
    themes: { light: 'github-light', dark: 'github-dark' },
  })
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Resolve the path to the UI source directory.
 * When built, __dirname is `dist/plugin/`. The UI source lives in `src/ui/`.
 */
export function getUiDir(): string {
  const packageRoot = path.resolve(__dirname, '../..')
  return path.resolve(packageRoot, 'src/ui')
}

const UI_PREFIX = 'virtual:atlas-ui/'

/**
 * Check if an ID is an Atlas virtual module and return the resolved ID.
 */
export function resolveVirtualModuleId(
  id: string,
  uiDir?: string,
): string | null {
  if (id === 'virtual:atlas-manifest') return '\0virtual:atlas-manifest'
  if (id === 'virtual:atlas-config') return '\0virtual:atlas-config'
  if (id === 'virtual:atlas-ui-entry') return '\0virtual:atlas-ui-entry'
  if (id === 'virtual:atlas-preview-entry') return '\0virtual:atlas-preview-entry'

  if (id.startsWith('virtual:atlas-source/')) return `\0${id}`
  if (id.startsWith('virtual:atlas-props/')) return `\0${id}`

  // Resolve UI file imports to absolute paths so Vite loads them directly
  if (id.startsWith(UI_PREFIX) && uiDir) {
    const file = id.slice(UI_PREFIX.length)
    return path.join(uiDir, file)
  }

  return null
}

/**
 * Generate the virtual module code for a given resolved ID.
 */
export async function loadVirtualModule(
  id: string,
  manifest: AtlasComponentEntry[],
  root: string,
  config: ResolvedAtlasConfig,
): Promise<string | null> {
  const virtualId = id.startsWith('\0') ? id.slice(1) : id

  if (virtualId === 'virtual:atlas-manifest') {
    return `export const manifest = ${JSON.stringify(manifest, null, 2)};`
  }

  if (virtualId === 'virtual:atlas-config') {
    const configData = {
      route: config.route,
      title: config.title,
      wrapper: config.wrapper,
      styles: config.styles,
    }
    return `export const config = ${JSON.stringify(configData, null, 2)};`
  }

  if (virtualId === 'virtual:atlas-ui-entry') {
    return [
      `import '${UI_PREFIX}styles.css';`,
      `import { createElement } from 'react';`,
      `import { createRoot } from 'react-dom/client';`,
      `import { App } from '${UI_PREFIX}App.tsx';`,
      ``,
      `const container = document.getElementById('atlas-root');`,
      `if (container) {`,
      `  const root = createRoot(container);`,
      `  root.render(createElement(App));`,
      `}`,
    ].join('\n')
  }

  if (virtualId === 'virtual:atlas-preview-entry') {
    const styleImports = config.styles
      .map((s) => `import '/${s}';`)
      .join('\n')

    return [
      `import { createElement } from 'react';`,
      `import { createRoot } from 'react-dom/client';`,
      styleImports,
      config.wrapper
        ? `import GlobalWrapper from '${config.wrapper}';`
        : `const GlobalWrapper = null;`,
      ``,
      `const params = new URLSearchParams(window.location.search);`,
      `const file = params.get('file');`,
      `const exportName = params.get('export');`,
      ``,
      `if (file && exportName) {`,
      `  import(/* @vite-ignore */ '/' + file).then((mod) => {`,
      `    const Component = mod[exportName];`,
      `    if (typeof Component === 'function') {`,
      `      const container = document.getElementById('atlas-preview-root');`,
      `      if (container) {`,
      `        const root = createRoot(container);`,
      `        let el = createElement(Component);`,
      `        const ExampleWrapper = Component.wrapper;`,
      `        if (ExampleWrapper) {`,
      `          el = createElement(ExampleWrapper, null, el);`,
      `        } else if (GlobalWrapper) {`,
      `          el = createElement(GlobalWrapper, null, el);`,
      `        }`,
      `        root.render(el);`,
      `      }`,
      `    }`,
      `  });`,
      `}`,
    ].join('\n')
  }

  // virtual:atlas-source/{slug}
  if (virtualId.startsWith('virtual:atlas-source/')) {
    const slug = virtualId.slice('virtual:atlas-source/'.length)
    const entry = manifest.find((e) => e.slug === slug)
    if (!entry) return null

    const filePath = path.join(root, entry.examplesFile)
    let fileContent: string
    try {
      fileContent = await fs.readFile(filePath, 'utf-8')
    } catch {
      return `export const sources = {};\nexport const imports = '';`
    }

    const result = extractSources(
      entry.examplesFile,
      fileContent,
      config.importPrefix,
      config.importPackage,
    )

    const highlightedSources: Record<string, string> = {}
    for (const [name, source] of Object.entries(result.sources)) {
      highlightedSources[name] = await highlight(source)
    }
    const highlightedImports = result.imports
      ? await highlight(result.imports)
      : ''

    return [
      `export const sources = ${JSON.stringify(result.sources, null, 2)};`,
      `export const imports = ${JSON.stringify(result.imports)};`,
      `export const highlightedSources = ${JSON.stringify(highlightedSources)};`,
      `export const highlightedImports = ${JSON.stringify(highlightedImports)};`,
    ].join('\n')
  }

  // virtual:atlas-props/{slug}
  if (virtualId.startsWith('virtual:atlas-props/')) {
    const slug = virtualId.slice('virtual:atlas-props/'.length)
    const entry = manifest.find((e) => e.slug === slug)
    if (!entry) return null

    const props = await extractProps(entry.examplesFile, entry.name, root)
    return `export const props = ${JSON.stringify(props, null, 2)};`
  }

  // virtual:atlas-docs/{slug}
  if (virtualId.startsWith('virtual:atlas-docs/')) {
    const slug = virtualId.slice('virtual:atlas-docs/'.length)
    const entry = manifest.find((e) => e.slug === slug)
    if (!entry || !entry.docsFile) {
      return `export const html = '';`
    }

    const filePath = path.join(root, entry.docsFile)
    let content: string
    try {
      content = await fs.readFile(filePath, 'utf-8')
    } catch {
      return `export const html = '';`
    }

    const html = markdownToHtml(content)
    return `export const html = ${JSON.stringify(html)};`
  }

  return null
}

/**
 * Convert a simple markdown string to HTML.
 * Supports headings, paragraphs, bold, italic, inline code, code blocks, lists, and links.
 */
function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]))
        i++
      }
      i++ // skip closing ```
      out.push(
        `<pre><code${lang ? ` class="language-${lang}"` : ''}>${codeLines.join('\n')}</code></pre>`,
      )
      continue
    }

    // Empty line
    if (line.trim() === '') {
      i++
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      out.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`)
      i++
      continue
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inlineFormat(lines[i].replace(/^[-*]\s+/, ''))}</li>`)
        i++
      }
      out.push(`<ul>${items.join('')}</ul>`)
      continue
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(
          `<li>${inlineFormat(lines[i].replace(/^\d+\.\s+/, ''))}</li>`,
        )
        i++
      }
      out.push(`<ol>${items.join('')}</ol>`)
      continue
    }

    // Paragraph (collect consecutive non-empty lines)
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !lines[i].startsWith('```')
    ) {
      paraLines.push(lines[i])
      i++
    }
    out.push(`<p>${inlineFormat(paraLines.join(' '))}</p>`)
  }

  return out.join('\n')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inlineFormat(s: string): string {
  let result = escapeHtml(s)
  // Inline code
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>')
  // Bold
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // Italic
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  // Links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  return result
}
