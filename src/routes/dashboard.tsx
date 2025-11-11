import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ConvexError } from 'convex/values'
import { api } from '../../convex/_generated/api'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth-context'
import { ClientOnly } from '@/components/ClientOnly'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { AutumnBillingSection } from '@/components/dashboard/AutumnBillingSection'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
  errorComponent: DashboardError,
})

function DashboardError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()

  // Handle ConvexError with structured data
  const isConvexError = error instanceof ConvexError
  const errorData = isConvexError
    ? (error.data as { code?: string; message?: string })
    : null

  // Redirect to login for auth errors
  if (
    errorData?.code === 'UNAUTHENTICATED' ||
    errorData?.code === 'USER_FETCH_FAILED'
  ) {
    router.navigate({ to: '/auth/sign-in' })
    return null
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <Card className="max-w-md w-full border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Dashboard Error</CardTitle>
          <CardDescription>
            {errorData?.message || error.message || 'Failed to load dashboard'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {import.meta.env.DEV && errorData && (
            <div className="p-2 bg-muted rounded text-xs font-mono">
              Code: {errorData.code}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={reset} size="sm">
              Retry
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/">Go Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Dashboard() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useAuth()
  const { data: userData } = useQuery(convexQuery(api.user.getUser, {}))

  // Redirect to sign-in if not authenticated (client-side only)
  useEffect(() => {
    if (!authLoading && !session?.user) {
      router.navigate({ to: '/auth/sign-in' })
    }
  }, [session?.user, authLoading, router])

  // Show full skeleton during SSR or while auth is loading
  if (typeof window === 'undefined' || authLoading || !session?.user) {
    return <DashboardSkeleton />
  }

  // Use Convex user data if available (has 2FA), fall back to auth session
  const user = userData?.user || session.user

  return (
    <div className="flex flex-1 flex-col px-6 py-8 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.name || 'User'}!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={user.image || undefined}
                  alt={user.name || undefined}
                />
                <AvatarFallback>
                  {user.name
                    ? user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                    : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="font-medium text-lg">{user.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {user.email}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {user.emailVerified ? 'Email Verified' : 'Email Unverified'}
                  </Badge>
                  {'twoFactorEnabled' in user && user.twoFactorEnabled && (
                    <Badge variant="outline">2FA Enabled</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Autumn Billing Section - Client Only to prevent hydration mismatch */}
        <ClientOnly
          fallback={
            <>
              {/* Skeleton placeholders for billing cards */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
              <Card className="col-span-full">
                <CardHeader>
                  <CardTitle>Subscription Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
              <Card className="col-span-full">
                <CardHeader>
                  <CardTitle>Feature Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            </>
          }
        >
          <AutumnBillingSection />
        </ClientOnly>
      </div>
    </div>
  )
}
