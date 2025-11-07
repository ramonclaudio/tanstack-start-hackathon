import { Component } from 'react'
import * as Sentry from '@sentry/tanstackstart-react'
import type { ReactNode } from 'react'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.app.error('Auth Provider Error', error, {
      component: 'AuthErrorBoundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    })

    Sentry.withScope((scope) => {
      scope.setContext('component', {
        name: 'AuthErrorBoundary',
        props: JSON.stringify(this.props),
      })
      scope.setContext('errorInfo', {
        componentStack: errorInfo.componentStack,
      })
      Sentry.captureException(error)
    })
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const isAuthError = this.state.error?.message
        ?.toLowerCase()
        .includes('auth')
      const isNetworkError =
        this.state.error?.message?.toLowerCase().includes('network') ||
        this.state.error?.message?.toLowerCase().includes('fetch')

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-2xl text-destructive">
                {isAuthError
                  ? 'Authentication Error'
                  : isNetworkError
                    ? 'Connection Error'
                    : 'Application Error'}
              </CardTitle>
              <CardDescription className="mt-2">
                {isAuthError
                  ? 'We encountered an issue with authentication. Please try again.'
                  : isNetworkError
                    ? 'Unable to connect to our servers. Please check your internet connection.'
                    : 'Something went wrong while loading the application.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.DEV && this.state.error && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-mono text-muted-foreground break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <Button onClick={this.handleReset} className="flex-1">
                  Reload Application
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = '/')}
                  className="flex-1"
                >
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
