import { ErrorBoundary } from 'vite-plugin-atlas/components'
import type { AtlasExample } from 'vite-plugin-atlas/types'

function BrokenComponent(): never {
  throw new Error('Something went wrong!')
}

export const CaughtError: AtlasExample = () => (
  <ErrorBoundary>
    <BrokenComponent />
  </ErrorBoundary>
)
CaughtError.description =
  'Demonstrates how the ErrorBoundary catches and displays a render error with a retry button.'

export const WorkingChild: AtlasExample = () => (
  <ErrorBoundary>
    <div
      style={{
        padding: '12px',
        background: 'var(--atlas-bg-secondary, #f3f4f6)',
        borderRadius: '6px',
      }}
    >
      This child rendered successfully — the ErrorBoundary is invisible.
    </div>
  </ErrorBoundary>
)
WorkingChild.description = 'When children render without error, the ErrorBoundary is transparent.'
