import { AlertCircle } from 'lucide-react'
import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  children?: ReactNode
  error?: unknown
}

export class AppErrorBoundary extends Component<Props> {
  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('App Error Boundary:', error, errorInfo)
  }

  override render() {
    const error = this.props.error as any
    const message = error?.message || 'Something went wrong.'
    return (
      <div className="px-6 py-8 w-full flex justify-center">
        <Card className="border-destructive/50 bg-destructive/5 max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Unexpected Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{message}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => window.location.reload()}>
                Reload
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}
