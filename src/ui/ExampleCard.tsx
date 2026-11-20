import { CopyButton } from './CopyButton.js'
import { IframePreview } from './IframePreview.js'
import { deCamelCase } from './utils.js'

interface ExampleCardProps {
  name: string
  title?: string
  description?: string
  source?: string
  highlightedSource?: string
  examplesFile: string
  id: string
}

export function ExampleCard({
  name,
  title,
  description,
  source,
  highlightedSource,
  examplesFile,
  id,
}: ExampleCardProps) {
  const displayTitle = title ?? deCamelCase(name)

  return (
    <div className="atlas-example-card" id={id}>
      <div className="atlas-example-card__header">
        <h3 className="atlas-example-card__title">{displayTitle}</h3>
      </div>
      {description && (
        <p className="atlas-example-card__description">{description}</p>
      )}
      <div className="atlas-example-card__preview">
        <IframePreview file={examplesFile} exportName={name} />
      </div>
      {source && (
        <div className="atlas-example-card__source">
          <div className="atlas-example-card__source-header">
            <span>Source</span>
            <CopyButton text={source} />
          </div>
          {highlightedSource ? (
            <div
              className="atlas-example-card__code"
              // <explanation>
              dangerouslySetInnerHTML={{ __html: highlightedSource }}
            />
          ) : (
            <pre className="atlas-example-card__code">
              <code>{source}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
