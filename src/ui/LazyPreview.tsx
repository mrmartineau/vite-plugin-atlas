import { type ReactNode, useEffect, useRef, useState } from 'react'
import type { AtlasComponentEntry } from '../types/index.js'
import { ErrorBoundary } from './ErrorBoundary.js'

interface LazyPreviewProps {
  entry: AtlasComponentEntry
}

export function LazyPreview({ entry }: LazyPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [ExampleComponent, setExampleComponent] = useState<
    (() => ReactNode) | null
  >(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return

    import(/* @vite-ignore */ `/${entry.examplesFile}`)
      .then((mod) => {
        const firstExport = entry.exports[0]
        if (firstExport && mod[firstExport]) {
          setExampleComponent(() => mod[firstExport])
        }
      })
      .catch((err) => {
        setError(err.message)
      })
  }, [visible, entry])

  return (
    <div ref={containerRef} className="atlas-card__preview">
      {error ? (
        <div className="atlas-card__preview-error">Failed to load preview</div>
      ) : ExampleComponent ? (
        <ErrorBoundary>
          <ExampleComponent />
        </ErrorBoundary>
      ) : visible ? (
        <div className="atlas-card__preview-loading">Loading…</div>
      ) : null}
    </div>
  )
}
