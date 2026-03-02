import { useEffect, useRef, useState } from 'react'
import type { AtlasComponentEntry } from '../types/index.js'
import { IframePreview } from './IframePreview.js'

interface LazyPreviewProps {
  entry: AtlasComponentEntry
}

export function LazyPreview({ entry }: LazyPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

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

  const firstExport = entry.exports[0]

  return (
    <div ref={containerRef} className="atlas-card__preview">
      {visible && firstExport ? (
        <IframePreview file={entry.examplesFile} exportName={firstExport} />
      ) : visible ? (
        <div className="atlas-card__preview-loading">Loading…</div>
      ) : null}
    </div>
  )
}
