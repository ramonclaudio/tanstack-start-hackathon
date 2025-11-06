import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useAction } from 'convex/react'
import { ArrowRight, CreditCard, Package, Settings, Zap } from 'lucide-react'
import { useCustomer } from 'autumn-js/react'
import * as Sentry from '@sentry/tanstackstart-react'
import { api } from '../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
//
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FailedPaymentBanner } from '@/components/dashboard/FailedPaymentBanner'
import {
  AvatarCardSkeleton,
  FeatureUsageSingleSkeleton,
  ListSkeleton,
  PageHeaderSkeleton,
  QuickActionsListSkeleton,
  SubscriptionStatusSkeleton,
} from '@/components/skeletons'
import { useSession } from '@/lib/auth-client'
import { useGlobalLoading } from '@/components/GlobalLoading'

export const Route = createFileRoute('/dashboard')({
  // Note: Removed loader because Convex queries via WebSocket don't work during SSR
  // The useSuspenseQuery will handle loading on client-side with proper Suspense boundaries
  component: Dashboard,
})

function Dashboard() {
  const navigate = useNavigate()
  const { data: session, isPending: sessionPending } = useSession()
  const { setPageLoading } = useGlobalLoading()

  // Use TanStack Query for user data (client-side only, Convex needs WebSocket)
  const { data: userData, isLoading: isUserDataLoading } = useQuery(
    convexQuery(api.dashboard.getUser, {}),
  )

  // Use Convex action for billing portal (actions can't use useConvexMutation)
  const billingPortalAction = useAction(api.autumn.billingPortal)

  useEffect(() => {
    if (sessionPending) return
    if (!session?.user) {
      navigate({ to: '/auth/sign-in' })
    }
  }, [session?.user, sessionPending, navigate])

  // Sync header skeleton with page
  useEffect(() => {
    setPageLoading(
      sessionPending || isUserDataLoading || !userData?.authenticated,
    )
    return () => setPageLoading(false)
  }, [
    sessionPending,
    isUserDataLoading,
    userData?.authenticated,
    setPageLoading,
  ])

  // Show skeleton while auth is loading
  if (sessionPending || isUserDataLoading || !userData?.authenticated) {
    return <DashboardSkeleton />
  }

  // Only call useCustomer AFTER auth is fully ready
  // Type assertion safe here because we've checked authenticated is true above
  return (
    <DashboardContent
      userData={
        userData as {
          authenticated: true
          user: NonNullable<typeof userData.user>
        }
      }
      billingPortalAction={billingPortalAction}
    />
  )
}

function DashboardContent({
  userData,
  billingPortalAction,
}: {
  userData: {
    authenticated: true
    user: {
      id: string
      name: string
      email: string
      image: string | null
      createdAt: number
      emailVerified: boolean
      twoFactorEnabled: boolean
    }
  }
  billingPortalAction: any
}) {
  // Now useCustomer is only called when auth is ready
  const { customer, isLoading: isCustomerLoading, refetch } = useCustomer()
  const { setPageLoading } = useGlobalLoading()

  // Manually trigger fetch on mount if customer data is missing
  // Using ref to prevent duplicate fetches in React StrictMode
  const hasFetchedRef = useRef(false)
  const [isFetching, setIsFetching] = useState(false)

  useEffect(() => {
    if (!customer && !isCustomerLoading && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      setIsFetching(true)
      refetch().finally(() => {
        // Small delay to ensure customer data is populated
        setTimeout(() => setIsFetching(false), 100)
      })
    }
  }, [customer, isCustomerLoading, refetch])

  useEffect(() => {
    setPageLoading(isCustomerLoading || isFetching)
    if (!isCustomerLoading && !isFetching) setPageLoading(false)
    return () => setPageLoading(false)
  }, [isCustomerLoading, isFetching, setPageLoading])

  const openBillingPortal = async ({
    returnUrl,
  }: { returnUrl?: string } = {}) => {
    try {
      const response = await billingPortalAction({
        returnUrl: returnUrl || window.location.href,
      })
      if (response && 'data' in response && response.data) {
        window.location.href = response.data.url
      }
    } catch (err) {
      console.error('Failed to open billing portal:', err)
      Sentry.captureException(err, {
        tags: {
          route: 'dashboard',
          action: 'openBillingPortal',
        },
      })
    }
  }

  // Show skeleton while customer data is loading or being fetched
  if (isCustomerLoading || isFetching) {
    return <DashboardSkeleton />
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-8 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {userData.user?.name || 'User'}!
        </p>
      </div>

      {/* Failed Payment Banner */}
      {customer && (
        <div className="mb-6">
          <FailedPaymentBanner
            customer={customer}
            openBillingPortal={openBillingPortal}
          />
        </div>
      )}

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
                  src={userData.user?.image || undefined}
                  alt={userData.user?.name ?? ''}
                />
                <AvatarFallback>
                  {userData.user?.name
                    ? userData.user.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                    : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="font-medium text-lg">
                    {userData.user?.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {userData.user?.email}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {userData.user?.emailVerified
                      ? 'Email Verified'
                      : 'Email Unverified'}
                  </Badge>
                  {userData.user?.twoFactorEnabled && (
                    <Badge variant="outline">2FA Enabled</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => openBillingPortal()}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Billing Portal
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/pricing">
                <Package className="mr-2 h-4 w-4" />
                View Plans
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/auth/settings">
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Subscription Status */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Your current plans and features</CardDescription>
          </CardHeader>
          <CardContent>
            {isCustomerLoading ? (
              <ListSkeleton count={2} className="h-16" />
            ) : customer && customer.products.length > 0 ? (
              <div className="space-y-4">
                {customer.products.map((product: any) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <div className="font-medium">
                        {product.name || 'Plan'}
                      </div>
                      <div className="text-sm text-muted-foreground capitalize">
                        Status: {product.status}
                      </div>
                    </div>
                    <Badge
                      variant={
                        product.status === 'active' ? 'default' : 'secondary'
                      }
                    >
                      {product.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  You don't have any active subscriptions
                </p>
                <Button asChild>
                  <Link to="/pricing">
                    View Plans
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Usage */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Feature Usage</CardTitle>
            <CardDescription>Track your feature consumption</CardDescription>
          </CardHeader>
          <CardContent>
            {isCustomerLoading ? (
              <ListSkeleton count={3} className="h-12" />
            ) : customer?.features &&
              Object.keys(customer.features).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(customer.features).map(
                  ([featureId, feature]: [string, any]) => (
                    <div key={featureId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium capitalize">
                            {featureId.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {feature.unlimited ? (
                          <Badge variant="outline">Unlimited</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {feature.balance ?? 0} /{' '}
                            {feature.included_usage ?? 0}
                          </span>
                        )}
                      </div>
                      {!feature.unlimited && feature.included_usage && (
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{
                              width: `${Math.min(
                                ((feature.balance ?? 0) /
                                  feature.included_usage) *
                                  100,
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No feature usage data available
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col px-6 py-8 max-w-6xl mx-auto w-full">
      <PageHeaderSkeleton />

      {/* Space for potential failed payment banner */}
      <div className="mb-6" />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Profile Card - matches actual CardHeader + CardContent structure */}
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <AvatarCardSkeleton />
          </CardContent>
        </Card>

        {/* Quick Actions - matches actual structure */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickActionsListSkeleton count={3} />
          </CardContent>
        </Card>

        {/* Subscription Status - matches actual structure */}
        <Card className="col-span-full">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-64" />
          </CardHeader>
          <CardContent>
            <SubscriptionStatusSkeleton />
          </CardContent>
        </Card>

        {/* Feature Usage - matches actual structure */}
        <Card className="col-span-full">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-56" />
          </CardHeader>
          <CardContent>
            <FeatureUsageSingleSkeleton />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
