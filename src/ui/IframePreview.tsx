import { config } from 'virtual:atlas-config'
import { useEffect, useRef, useState } from 'react'

interface IframePreviewProps {
  file: string
  exportName: string
}

export function IframePreview({ file, exportName }: IframePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(60)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (
        e.data?.type === 'atlas-preview-resize' &&
        e.source === iframeRef.current?.contentWindow
      ) {
        setHeight(Math.max(60, e.data.height))
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const src = `${config.route}/preview?file=${encodeURIComponent(file)}&export=${encodeURIComponent(exportName)}`

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title={`Preview: ${exportName}`}
      style={{
        width: '100%',
        height,
        border: 'none',
        display: 'block',
      }}
    />
  )
}
