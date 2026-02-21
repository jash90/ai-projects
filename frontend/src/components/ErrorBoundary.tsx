import React, { Component, ReactNode } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { captureException } from '@/analytics/sentry'
import { events } from '@/analytics/posthog'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: string
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error)
    console.error('Error info:', errorInfo)

    try { captureException(error, { componentStack: errorInfo.componentStack }); } catch {}
    try { events.errorDisplayed({ error: error.message, componentStack: errorInfo.componentStack || undefined }); } catch {}

    this.setState({
      error,
      errorInfo: errorInfo.componentStack || undefined
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Something went wrong
              </h1>
              <p className="text-muted-foreground">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="text-left bg-muted p-4 rounded-md text-sm">
                <pre className="whitespace-pre-wrap text-destructive">
                  {this.state.error.message}
                </pre>
                {this.state.errorInfo && (
                  <pre className="mt-2 whitespace-pre-wrap text-muted-foreground text-xs">
                    {this.state.errorInfo}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary