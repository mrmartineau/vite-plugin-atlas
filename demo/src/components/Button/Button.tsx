import { type ReactNode } from 'react'

export interface ButtonProps {
  /** The visual style of the button */
  variant?: 'primary' | 'secondary' | 'danger'
  /** Button size */
  size?: 'sm' | 'md' | 'lg'
  /** Whether the button is disabled */
  disabled?: boolean
  /** Click handler */
  onClick?: () => void
  /** Button content */
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
}: ButtonProps) {
  const baseStyles: React.CSSProperties = {
    border: 'none',
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    opacity: disabled ? 0.5 : 1,
    transition: 'background 0.15s ease',
  }

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: '0.8125rem' },
    md: { padding: '8px 16px', fontSize: '0.875rem' },
    lg: { padding: '12px 24px', fontSize: '1rem' },
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { background: '#2563eb', color: '#fff' },
    secondary: { background: '#e5e7eb', color: '#1f2937' },
    danger: { background: '#dc2626', color: '#fff' },
  }

  return (
    <button
      type="button"
      style={{ ...baseStyles, ...sizeStyles[size], ...variantStyles[variant] }}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
