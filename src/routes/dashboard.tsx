import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useAction } from 'convex/react'
import {
  ArrowRight,
  CreditCard,
  Package,
  Settings,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { CustomerSchema } from '../../convex/schemas'
import type { CustomerFeatureSchema, DashboardDTO } from '../../convex/schemas'
import type { z } from 'zod'
// Session handled via aggregated loader
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FailedPaymentBanner } from '@/components/FailedPaymentBanner'
import { useSession } from '@/lib/auth-client'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const navigate = useNavigate()
  const getDashboard = useAction(api.dashboard.get)
  const [data, setData] = useState<z.infer<typeof DashboardDTO> | null>(null)
  const [loading, setLoading] = useState(true)
  const { data: session, isPending: sessionPending } = useSession()
  const snapshot = useSuspenseQuery(convexQuery(api.snapshots.get, {})) as {
    customer?: z.infer<typeof CustomerSchema> | null
  } | null

  useEffect(() => {
    // Wait for auth to resolve to avoid false unauthenticated redirects on refresh
    if (sessionPending) return

    if (!session?.user) {
      navigate({ to: '/auth/sign-in' })
      return
    }

    ;(async () => {
      try {
        const res = await getDashboard({})
        const payload = res as {
          success?: boolean
          data?: z.infer<typeof DashboardDTO>
        }
        if (
          payload.success &&
          payload.data &&
          payload.data.authenticated === false
        ) {
          navigate({ to: '/auth/sign-in' })
          return
        }
        setData(payload.data || null)
      } catch (e) {
        console.error('Failed to load dashboard data', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [getDashboard, navigate, session?.user, sessionPending])

  if (sessionPending || loading || !data || !data.user) {
    return <DashboardSkeleton />
  }

  const normalizedCustomer = data.customer
  const customerFromSnapshot = snapshot?.customer ?? null
  const parsedSnap = CustomerSchema.safeParse(customerFromSnapshot)
  const parsedNorm = CustomerSchema.safeParse(normalizedCustomer)
  const customerForUI: z.infer<typeof CustomerSchema> | null =
    (parsedSnap.success ? parsedSnap.data : null) ||
    (parsedNorm.success ? parsedNorm.data : null)
  return (
    <AuthenticatedDashboard
      key={data.user.id}
      user={data.user}
      customer={customerForUI}
    />
  )
}

function AuthenticatedDashboard({
  user,
  customer,
}: {
  user: NonNullable<z.infer<typeof DashboardDTO>['user']>
  customer: z.infer<typeof CustomerSchema> | null | undefined
}) {
  const openPortal = useAction(api.billing.openPortal)
  const openBillingPortal = async ({
    returnUrl,
  }: { returnUrl?: string } = {}) => {
    try {
      const res = await openPortal({
        returnUrl: returnUrl || window.location.href,
      })
      const payload = res as { success?: boolean; data?: { url?: string } }
      const url = payload.data?.url
      if (payload.success && url) {
        window.location.href = url
      }
    } catch (e) {
      console.error('Failed to open billing portal:', e)
    }
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-8 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.name || 'User'}!
        </p>
      </div>

      {/* Failed Payment Banner */}
      <div className="mb-6">
        <FailedPaymentBanner
          customer={customer}
          openBillingPortal={openBillingPortal}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* User Profile Card */}
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={user.image || undefined}
                  alt={user.name ?? ''}
                />
                <AvatarFallback>
                  {user.name
                    ? user.name
                        .split(' ')
                        .map((n: string) => n[0])
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
                  {user.twoFactorEnabled && (
                    <Badge variant="outline">2FA Enabled</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Autumn Customer Card */}
        <AutumnCustomerCard
          customer={customer}
          isLoading={false}
          error={null}
          openBillingPortal={openBillingPortal}
        />

        {/* Account Status */}
        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Member Since</div>
              <div className="text-lg font-medium">
                {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </div>
            <Separator />
            <div>
              <div className="text-sm text-muted-foreground">User ID</div>
              <div className="text-xs font-mono break-all">
                {user.id || 'N/A'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Credits Card */}
        <AiCreditsCard customer={customer} isLoading={false} error={null} />

        {/* Usage Statistics Card */}
        <UsageStatsCard customer={customer} isLoading={false} />
      </div>
    </div>
  )
}

function UsageStatsCard({
  customer,
  isLoading,
}: {
  customer: z.infer<typeof CustomerSchema> | null | undefined
  isLoading: boolean
}) {
  if (isLoading || !customer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
          <CardDescription>Track your feature usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get all features - handle case where features might be undefined
  const features = customer.features
  const featureEntries = Object.entries(features)

  if (featureEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No usage features available.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Statistics</CardTitle>
        <CardDescription>Track your feature usage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {featureEntries.map(
          ([featureId, feature]: [
            string,
            z.infer<typeof CustomerFeatureSchema>,
          ]) => {
            const isUnlimited = feature.unlimited ?? false
            const balance = feature.balance ?? 0
            const included = feature.included_usage

            // Format feature name
            const featureName = featureId
              .split('_')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')

            return (
              <div key={featureId}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium">{featureName}</div>
                  <div className="text-sm text-muted-foreground">
                    {isUnlimited ? '∞' : balance.toLocaleString()}
                  </div>
                </div>
                {!isUnlimited && (
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        // Show remaining percentage relative to included usage if available
                        width: `${
                          typeof included === 'number' && included > 0
                            ? Math.min((balance / included) * 100, 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )
          },
        )}
      </CardContent>
    </Card>
  )
}

function AiCreditsCard({
  customer,
  isLoading,
  error,
}: {
  customer: z.infer<typeof CustomerSchema> | null | undefined
  isLoading: boolean
  error: unknown
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Credits
          </CardTitle>
          <CardDescription>Your current credit balance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Skeleton className="h-12 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Separator />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !customer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Credits
          </CardTitle>
          <CardDescription>Your current credit balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Unable to load credit information
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get credits feature - handle case where features might be undefined
  const hasCredits = Object.prototype.hasOwnProperty.call(
    customer.features,
    'credits',
  )
  const aiCreditsFeature = hasCredits ? customer.features['credits'] : undefined

  // Check if feature exists at runtime (TypeScript types may not reflect actual data)

  if (
    !hasCredits ||
    !aiCreditsFeature ||
    typeof aiCreditsFeature !== 'object'
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Credits
          </CardTitle>
          <CardDescription>Your current credit balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No credits feature configured for your account.
          </div>
          <Button variant="outline" className="w-full mt-4" asChild>
            <Link to="/pricing">View Plans</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const balance = aiCreditsFeature.balance ?? 0
  const isUnlimited = aiCreditsFeature.unlimited ?? false

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Credits
        </CardTitle>
        <CardDescription>Your current credit balance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-4xl font-bold tracking-tight">
            {isUnlimited ? '∞' : balance.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {isUnlimited ? 'Unlimited credits' : 'Credits available'}
          </div>
        </div>

        {!isUnlimited && balance < 100 && (
          <>
            <Separator />
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <div className="text-xs text-amber-700 dark:text-amber-400">
                {balance === 0
                  ? 'You have run out of credits. Upgrade your plan to continue using features.'
                  : 'Running low on credits. Consider upgrading your plan for more credits.'}
              </div>
            </div>
          </>
        )}

        <Button variant="outline" className="w-full" asChild>
          <Link to="/pricing">
            View Plans
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function AutumnCustomerCard({
  customer,
  isLoading,
  error,
  openBillingPortal,
}: {
  customer: z.infer<typeof CustomerSchema> | null | undefined
  isLoading: boolean
  error: unknown
  openBillingPortal: (params?: {
    returnUrl?: string
    openInNewTab?: boolean
  }) => Promise<void> | void
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Subscription & Billing
          </CardTitle>
          <CardDescription>
            Manage your plan and billing settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
          <Separator />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Manage your plan and billing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">
            Failed to load subscription data
          </div>
          <Button variant="outline" className="w-full mt-4" asChild>
            <Link to="/pricing">View Plans</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Get the active product
  const activeProduct = customer?.products
    ? customer.products.find(
        (p) => p.status === 'active' || p.status === 'trialing',
      )
    : undefined
  const hasActiveSubscription = !!activeProduct
  const productNameBase = activeProduct?.name || 'Free Plan'
  const productGroup = activeProduct?.group ? ` • ${activeProduct.group}` : ''
  const productName = `${productNameBase}${productGroup}`
  const nextBillingEpochSec = Number(
    (activeProduct as { current_period_end?: number | string } | undefined)
      ?.current_period_end ?? 0,
  )

  // Billing portal handler removed - now using BillingPortalButton component

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Subscription & Billing
        </CardTitle>
        <CardDescription>Manage your plan and billing settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Current Plan</div>
            <div className="text-lg font-semibold">{productName}</div>
          </div>
          {activeProduct && (
            <Badge
              variant={
                activeProduct.status === 'active' ? 'default' : 'secondary'
              }
              className="capitalize"
            >
              {activeProduct.status}
            </Badge>
          )}
        </div>

        {Number.isFinite(nextBillingEpochSec) && nextBillingEpochSec > 0 && (
          <>
            <Separator />
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">
                  Next Billing Date
                </div>
                <div className="text-sm font-medium">
                  {new Date(nextBillingEpochSec * 1000).toLocaleDateString(
                    'en-US',
                    {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    },
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-2">
          {hasActiveSubscription ? (
            <>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/pricing">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Change Plan
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    await openBillingPortal({ returnUrl: window.location.href })
                  } catch (err) {
                    console.error('Failed to open billing portal:', err)
                  }
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                Manage Billing
              </Button>
            </>
          ) : (
            <Button className="w-full" asChild>
              <Link to="/pricing">
                Upgrade Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        {!hasActiveSubscription && (
          <div className="text-xs text-center text-muted-foreground pt-2">
            Unlock premium features with a paid plan
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact card skeleton (removed from usage to simplify loading state)

function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col px-6 py-8 max-w-6xl mx-auto w-full">
      {/* Header Skeleton */}
      <div className="mb-8">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-6 w-64" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Profile Card Skeleton */}
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-3">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Account Status Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* AI Credits Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>

        {/* Usage Stats Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
