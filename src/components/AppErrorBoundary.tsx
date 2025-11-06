import { AlertCircle } from 'lucide-react'
import { Component } from 'react'
import * as Sentry from '@sentry/tanstackstart-react'
import type { ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  children?: ReactNode
  error?: unknown
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Universal error boundary for the entire app
 * Detects Autumn/billing errors and shows appropriate messaging
 */
export class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('App Error Boundary:', error, errorInfo)
    // Report error to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  private isAutumnError(error: Error): boolean {
    const message = error.message.toLowerCase()
    return (
      message.includes('autumn') ||
      message.includes('billing') ||
      message.includes('stripe') ||
      message.includes('payment') ||
      message.includes('subscription')
    )
  }

  private renderErrorCard(
    message: string,
    isAutumn: boolean,
    onReload: () => void,
    reloadLabel: string = 'Reload',
  ) {
    return (
      <div className="px-6 py-8 w-full flex justify-center">
        <Card className="border-destructive/50 bg-destructive/5 max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              {isAutumn ? 'Billing System Error' : 'Unexpected Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{message}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={onReload}>
                {reloadLabel}
              </Button>
              {isAutumn && (
                <Button size="sm" variant="outline" asChild>
                  <a href="mailto:support@example.com">Contact Support</a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  override render() {
    // If using as wrapper (with children), check state
    if (this.props.children) {
      if (!this.state.hasError) {
        return this.props.children
      }

      if (this.props.fallback) {
        return this.props.fallback
      }

      const error = this.state.error
      const isAutumn = error ? this.isAutumnError(error) : false

      const message = isAutumn
        ? "We're having trouble loading the billing information. This could be due to a configuration issue or temporary service disruption."
        : error?.message || 'Something went wrong. Please try again.'
      return this.renderErrorCard(
        message,
        isAutumn,
        this.handleReset,
        'Reload Page',
      )
    }

    // If using as route errorComponent (with error prop)
    const err = this.props.error
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: unknown }).message) ||
          'Something went wrong.'
        : 'Something went wrong.'

    const isAutumn =
      err && typeof err === 'object' && 'message' in err
        ? this.isAutumnError(
            new Error(String((err as { message?: unknown }).message)),
          )
        : false

    return this.renderErrorCard(
      message,
      isAutumn,
      () => window.location.reload(),
      'Reload',
    )
  }
}
