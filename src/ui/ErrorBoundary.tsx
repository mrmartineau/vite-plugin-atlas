import { WarningIcon } from '@phosphor-icons/react'
import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Atlas] Render error:', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="atlas-error-card">
          <div className="atlas-error-card__header">
            <WarningIcon size={16} /> Render Error
          </div>
          <pre className="atlas-error-card__message">
            {this.state.error?.message ?? 'Unknown error'}
          </pre>
          <button
            type="button"
            className="atlas-error-card__retry"
            onClick={this.handleRetry}
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
