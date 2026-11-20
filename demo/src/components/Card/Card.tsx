import { type ReactNode } from 'react'

export interface CardProps {
  /** Card title displayed at the top */
  title: string
  /** Optional description text */
  description?: string
  /** Card body content */
  children?: ReactNode
  /** Optional footer content */
  footer?: ReactNode
}

export function Card({ title, description, children, footer }: CardProps) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        maxWidth: '360px',
      }}
    >
      <div style={{ padding: '16px' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
        {description && (
          <p style={{ margin: '0 0 12px', fontSize: '0.875rem', color: '#6b7280' }}>
            {description}
          </p>
        )}
        {children}
      </div>
      {footer && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e5e7eb',
            background: '#f9fafb',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  )
}
