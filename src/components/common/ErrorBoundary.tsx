import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    
    // Log error to Supabase
    this.logErrorToServer(error, errorInfo)
  }

  private logErrorToServer = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const { supabase } = await import('@/lib/supabaseClient')
      
      await supabase.from('activity_logs').insert({
        action_type: 'CLIENT_ERROR',
        error_message: error.message,
        old_data: {
          componentStack: errorInfo.componentStack,
          userAgent: navigator.userAgent,
          url: window.location.href,
        },
        created_at: new Date().toISOString(),
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold">Something went wrong</h2>
              <p className="text-muted-foreground">
                We apologize for the inconvenience. Please try refreshing the page.
              </p>
              {this.state.error && (
                <div className="mt-4 p-4 bg-muted rounded-lg text-sm text-left overflow-auto">
                  <code className="text-destructive">{this.state.error.message}</code>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>
              <button
                onClick={() => window.history.back()}
                className="block w-full px-6 py-3 rounded-lg border border-input bg-background font-medium hover:bg-accent transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
