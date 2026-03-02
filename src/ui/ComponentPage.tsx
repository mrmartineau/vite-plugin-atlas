/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it's ok for our purpose */
import { config } from 'virtual:atlas-config'
import {
  ArrowLeftIcon,
  ArticleIcon,
  CheckIcon,
  CopyIcon,
  DownloadSimpleIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { AtlasComponentEntry, AtlasProp } from '../types/index.js'
import { CopyButton } from './CopyButton.js'
import { ExampleCard } from './ExampleCard.js'
import { PropsTable } from './PropsTable.js'
import { Sidebar } from './Sidebar.js'
import { ToggleGroup } from './ToggleGroup.js'
import { deCamelCase } from './utils.js'

const aiTools = [
  { name: 'v0', url: 'https://v0.dev' },
  { name: 'ChatGPT', url: 'https://chatgpt.com' },
  { name: 'Claude', url: 'https://claude.ai/new' },
  { name: 'Scira', url: 'https://scira.ai/' },
  { name: 't3.chat', url: 'https://t3.chat/new' },
]

interface ComponentPageProps {
  entry: AtlasComponentEntry
}

interface LoadedExample {
  name: string
  title?: string
  description?: string
  order?: number
}

export function ComponentPage({ entry }: ComponentPageProps) {
  const [examples, setExamples] = useState<LoadedExample[]>([])
  const [sources, setSources] = useState<Record<string, string>>({})
  const [highlightedSources, setHighlightedSources] = useState<
    Record<string, string>
  >({})
  const [imports, setImports] = useState('')
  const [highlightedImports, setHighlightedImports] = useState('')
  const [docs, setDocs] = useState('')
  const [props, setProps] = useState<AtlasProp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setExamples([])
    setSources({})
    setHighlightedSources({})
    setImports('')
    setHighlightedImports('')
    setDocs('')
    setProps([])

    Promise.all([
      import(/* @vite-ignore */ `/${entry.examplesFile}`),
      import(
        /* @vite-ignore */ `/@id/__x00__virtual:atlas-source/${entry.slug}`
      ),
      import(
        /* @vite-ignore */ `/@id/__x00__virtual:atlas-props/${entry.slug}`
      ),
      import(/* @vite-ignore */ `/@id/__x00__virtual:atlas-docs/${entry.slug}`),
    ])
      .then(([examplesMod, sourceMod, propsMod, docsMod]) => {
        const loaded: LoadedExample[] = []
        for (const exportName of entry.exports) {
          const ex = examplesMod[exportName]
          if (typeof ex === 'function') {
            loaded.push({
              name: exportName,
              title: ex.title,
              description: ex.description,
              order: ex.order,
            })
          }
        }
        loaded.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))

        setExamples(loaded)
        setSources(sourceMod.sources ?? {})
        setHighlightedSources(sourceMod.highlightedSources ?? {})
        setImports(sourceMod.imports ?? '')
        setHighlightedImports(sourceMod.highlightedImports ?? '')
        setDocs(docsMod.html ?? '')
        setProps(propsMod.props ?? [])
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [entry])

  const sidebarItems = useMemo(() => {
    const items: { id: string; label: string }[] = []
    if (docs) {
      items.push({ id: 'atlas-docs', label: 'Documentation' })
    }
    if (props.length > 0) {
      items.push({ id: 'atlas-props', label: 'Props' })
    }
    for (const ex of examples) {
      items.push({
        id: `atlas-example-${ex.name}`,
        label: ex.title ?? deCamelCase(ex.name),
      })
    }
    return items
  }, [docs, props, examples])

  const handleDownloadAI = () => {
    let md = `# ${entry.name}\n\n`
    md += `**Group:** ${entry.group}\n`
    md += `**File:** ${entry.examplesFile}\n\n`

    if (imports) {
      md += `## Imports\n\n\`\`\`tsx\n${imports}\n\`\`\`\n\n`
    }

    if (Object.keys(sources).length > 0) {
      md += `## Examples\n\n`
      for (const [name, source] of Object.entries(sources)) {
        md += `### ${name}\n\n\`\`\`tsx\n${source}\n\`\`\`\n\n`
      }
    }

    if (props.length > 0) {
      md += `## Props\n\n`
      md += `| Name | Type | Required | Default | Description |\n`
      md += `|------|------|----------|---------|-------------|\n`
      for (const prop of props) {
        md += `| ${prop.name} | \`${prop.type}\` | ${prop.required ? 'Yes' : 'No'} | ${prop.default ? `\`${prop.default}\`` : '-'} | ${prop.description || '-'} |\n`
      }
      md += '\n'
    }

    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${entry.slug}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fullContext = useMemo(() => {
    let md = `# ${entry.name}\n\n`
    md += `**Group:** ${entry.group}\n`
    md += `**File:** ${entry.examplesFile}\n\n`
    if (imports) md += `## Imports\n\n\`\`\`tsx\n${imports}\n\`\`\`\n\n`
    if (Object.keys(sources).length > 0) {
      md += `## Examples\n\n`
      for (const [name, source] of Object.entries(sources)) {
        md += `### ${name}\n\n\`\`\`tsx\n${source}\n\`\`\`\n\n`
      }
    }
    if (props.length > 0) {
      md += `## Props\n\n`
      md += `| Name | Type | Required | Default | Description |\n`
      md += `|------|------|----------|---------|-------------|\n`
      for (const prop of props) {
        md += `| ${prop.name} | \`${prop.type}\` | ${prop.required ? 'Yes' : 'No'} | ${prop.default ? `\`${prop.default}\`` : '-'} | ${prop.description || '-'} |\n`
      }
    }
    return md
  }, [entry, imports, sources, props])

  const [pageCopied, setPageCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleCopyPage = useCallback(() => {
    navigator.clipboard.writeText(fullContext).then(() => {
      setPageCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setPageCopied(false), 2000)
    })
  }, [fullContext])

  if (loading) {
    return (
      <div className="atlas-component-page">
        <div className="atlas-component-page__loading">Loading component…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="atlas-component-page">
        <a href="#/" className="atlas-component-page__back">
          <ArrowLeftIcon size={14} /> Back to Atlas
        </a>
        <div className="atlas-error-card">
          <div className="atlas-error-card__header">
            <WarningIcon size={16} /> Failed to load component
          </div>
          <pre className="atlas-error-card__message">{error}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className="atlas-component-page">
      <div className="atlas-component-page__layout">
        {sidebarItems.length > 0 && <Sidebar items={sidebarItems} />}
        <div className="atlas-component-page__main">
          <a href="#/" className="atlas-component-page__back">
            <ArrowLeftIcon size={14} /> Back to Atlas
          </a>
          <h1 className="atlas-component-page__title">{entry.name}</h1>

          {imports && (
            <div className="atlas-component-page__imports">
              <div className="atlas-component-page__imports-header">
                <span>Import</span>
                <CopyButton text={imports} />
              </div>
              {highlightedImports ? (
                <div
                  className="atlas-example-card__code"
                  dangerouslySetInnerHTML={{ __html: highlightedImports }}
                />
              ) : (
                <pre className="atlas-component-page__code">
                  <code>{imports}</code>
                </pre>
              )}
            </div>
          )}

          <div className="atlas-component-page__actions">
            <a
              href={`${config.route}/api/component/${entry.slug}.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="atlas-btn"
            >
              <ArticleIcon size={14} weight="duotone" /> View Markdown
            </a>
            <button
              type="button"
              className="atlas-btn"
              onClick={handleDownloadAI}
            >
              <DownloadSimpleIcon size={14} weight="duotone" /> Download Docs
            </button>
            <button
              type="button"
              className="atlas-btn"
              onClick={handleCopyPage}
            >
              {pageCopied ? (
                <CheckIcon size={14} weight="duotone" />
              ) : (
                <CopyIcon size={14} weight="duotone" />
              )}
              {pageCopied ? 'Copied!' : 'Copy page'}
            </button>
          </div>

          <ToggleGroup label="Open in AI" defaultCollapsed>
            <div className="atlas-btn-group">
              {aiTools.map((tool) => {
                const prompt = `I'm looking at the ${entry.name} component documentation:\n\n${fullContext}\n\nHelp me understand how to use it. Be ready to explain concepts, give examples, or help debug based on it.`
                return (
                  <a
                    key={tool.name}
                    className="atlas-btn"
                    href={`${tool.url}?q=${encodeURIComponent(prompt)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {tool.name}
                  </a>
                )
              })}
            </div>
          </ToggleGroup>

          {docs && (
            <section
              id="atlas-docs"
              className="atlas-docs"
              dangerouslySetInnerHTML={{ __html: docs }}
            />
          )}

          {props.length > 0 && (
            <section id="atlas-props">
              <h2>Props</h2>
              <PropsTable props={props} />
            </section>
          )}

          <section className="atlas-component-page__examples">
            <h2>Examples</h2>
            {examples.map((ex) => (
              <ExampleCard
                key={ex.name}
                id={`atlas-example-${ex.name}`}
                name={ex.name}
                title={ex.title}
                description={ex.description}
                source={sources[ex.name]}
                highlightedSource={highlightedSources[ex.name]}
                examplesFile={entry.examplesFile}
              />
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
