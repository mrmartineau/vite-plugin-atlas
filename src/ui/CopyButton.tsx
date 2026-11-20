import { CheckIcon, CopyIcon } from '@phosphor-icons/react'
import { useCallback, useRef, useState } from 'react'

interface CopyButtonProps {
  text: string
  className?: string
  children?: string
}

export function CopyButton({ text, className, children }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  return (
    <button
      type="button"
      className={`atlas-copy-btn ${className ?? ''}`}
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      {copied ? <CheckIcon size={14} weight="duotone" /> : <CopyIcon size={14} weight="duotone" />}{' '}
      {children && <span>{copied ? 'Copied!' : children}</span>}
    </button>
  )
}
