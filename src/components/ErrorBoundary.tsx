import { AlertCircle } from 'lucide-react'
import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'

interface Props {
  children?: ReactNode
  error?: unknown
  fallback?: ReactNode
  variant?: 'app' | 'auth'
  supportEmail?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { variant = 'app' } = this.props

    logger.app.error(
      variant === 'auth' ? 'Auth Provider Error' : 'App Error Boundary',
      error,
      {
        component: 'ErrorBoundary',
        variant,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
      {
        tags: {
          variant,
          errorBoundary: 'true',
        },
        contexts: {
          errorBoundary: {
            variant,
            componentStack: errorInfo.componentStack,
          },
        },
      },
    )
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private isSpecialError(error: Error, keywords: Array<string>): boolean {
    const message = error.message.toLowerCase()
    return keywords.some((keyword) => message.includes(keyword))
  }

  private renderAuthError() {
    const { error } = this.state
    const isAuthError = error ? this.isSpecialError(error, ['auth']) : false
    const isNetworkError = error
      ? this.isSpecialError(error, ['network', 'fetch'])
      : false

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
            {import.meta.env.DEV && error && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-mono text-muted-foreground break-all">
                  {error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={this.handleReset} className="flex-1">
                Reload Application
              </Button>
              <Button
                variant="outline"
                onClick={this.handleGoHome}
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

  private renderAppError() {
    const { error } = this.state
    const { supportEmail } = this.props
    const isBillingError = error
      ? this.isSpecialError(error, [
          'autumn',
          'billing',
          'stripe',
          'payment',
          'subscription',
        ])
      : false

    return (
      <div className="px-6 py-8 w-full flex justify-center">
        <Card className="border-destructive/50 bg-destructive/5 max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              {isBillingError ? 'Billing System Error' : 'Unexpected Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isBillingError
                ? "We're having trouble loading the billing information. This could be due to a configuration issue or temporary service disruption."
                : error?.message || 'Something went wrong. Please try again.'}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={this.handleReset}>
                Reload Page
              </Button>
              {isBillingError && supportEmail && (
                <Button size="sm" variant="outline" asChild>
                  <a href={`mailto:${supportEmail}`}>Contact Support</a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  override render() {
    const {
      children,
      error: propsError,
      fallback,
      variant = 'app',
    } = this.props

    if (children) {
      if (!this.state.hasError) {
        return children
      }

      if (fallback) {
        return fallback
      }

      return variant === 'auth' ? this.renderAuthError() : this.renderAppError()
    }

    // Route error component mode (no children, error passed as prop)
    const err = propsError
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: unknown }).message) ||
          'Something went wrong.'
        : 'Something went wrong.'

    const error = new Error(message)
    this.state = { hasError: true, error }

    return variant === 'auth' ? this.renderAuthError() : this.renderAppError()
  }
}
