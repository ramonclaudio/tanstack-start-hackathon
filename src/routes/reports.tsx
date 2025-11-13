import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { AlertCircle, ExternalLink } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { useAuth } from '@/lib/auth-context'
import { ReportForm } from '@/components/reports/ReportForm'
import { ReportsList } from '@/components/reports/ReportsList'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/reports')({
  loader: async (opts) => {
    // Prefetch configuration check and user data during SSR
    await Promise.all([
      opts.context.queryClient.ensureQueryData(
        convexQuery(api.coderabbit.isConfigured, {}),
      ),
      opts.context.queryClient.ensureQueryData(
        convexQuery(api.user.getUser, {}),
      ),
    ])
  },
  component: ReportsPage,
})

function ReportsPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useAuth()

  // Configuration status is SSR-prefetched
  const { data: isConfigured } = useQuery(
    convexQuery(api.coderabbit.isConfigured, {}),
  )

  // User data is SSR-prefetched (used by ReportsList as auth gate)
  useQuery(convexQuery(api.user.getUser, {}))

  // Redirect to sign-in if not authenticated (client-side only, after hydration)
  useEffect(() => {
    if (typeof window !== 'undefined' && !authLoading && !session?.user) {
      router.navigate({ to: '/auth/sign-in' })
    }
  }, [session?.user, authLoading, router])

  return (
    <div className="flex flex-1 flex-col px-6 py-8 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          CodeRabbit Reports
        </h1>
        <p className="text-muted-foreground">
          Generate developer activity reports with AI-powered insights from your
          pull requests, code reviews, and team contributions
        </p>
      </div>

      {!isConfigured ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>CodeRabbit API Key Required</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              To generate developer activity reports, configure your CodeRabbit
              API key. Reports can take up to 10 minutes to generate depending
              on data volume.
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li className="flex items-start gap-1">
                <span>Get your API key from</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 inline-flex items-center gap-1"
                  asChild
                >
                  <a
                    href="https://coderabbit.ai/dashboard/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    CodeRabbit Dashboard
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </li>
              <li>Add CODERABBIT_API_KEY to your .env.local file</li>
              <li>
                Add CODERABBIT_API_KEY to Convex Dashboard → Environment
                Variables
              </li>
              <li>Restart your development server</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              Note: Generating reports requires a Pro plan subscription
            </p>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          <ReportForm />
          <ReportsList />
        </div>
      )}
    </div>
  )
}
