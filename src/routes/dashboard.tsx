import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useAction } from 'convex/react'
import { ArrowRight, CreditCard, Package, Zap } from 'lucide-react'
import { useCustomer } from 'autumn-js/react'
import { api } from '../../convex/_generated/api'
import { logger } from '@/lib/logger'
import { useAuth } from '@/lib/auth-context'
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
import { FailedPaymentBanner } from '@/components/dashboard/FailedPaymentBanner'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useAuth()
  const { data: userData } = useQuery(convexQuery(api.user.getUser, {}))

  const {
    customer,
    isLoading: customerLoading,
    refetch: refetchCustomer,
  } = useCustomer()
  const billingPortalAction = useAction(api.autumn.billingPortal)
  const hasFetchedRef = useRef(false)

  // Redirect to sign-in if not authenticated (client-side only)
  useEffect(() => {
    if (!authLoading && !session?.user) {
      router.navigate({ to: '/auth/sign-in' })
    }
  }, [session?.user, authLoading, router])

  // Refetch customer data once on mount
  useEffect(() => {
    if (session?.user && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      refetchCustomer()
    }
  }, [session?.user, refetchCustomer])

  // Show full skeleton during SSR or while auth is loading
  if (typeof window === 'undefined' || authLoading || !session?.user) {
    return <DashboardSkeleton />
  }

  // Use Convex user data if available (has 2FA), fall back to auth session
  const user = userData?.user || session.user

  const openBillingPortal = async () => {
    try {
      const response = await billingPortalAction({
        returnUrl: window.location.href,
      })

      if (
        response &&
        typeof response === 'object' &&
        'data' in response &&
        response.data &&
        typeof response.data === 'object' &&
        'url' in response.data &&
        typeof response.data.url === 'string'
      ) {
        window.location.href = response.data.url
      }
    } catch (err) {
      logger.error('Failed to open billing portal', err, {
        route: 'dashboard',
        action: 'openBillingPortal',
      })
    }
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-8 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.name || 'User'}!
        </p>
      </div>

      <FailedPaymentBanner
        customer={customer}
        openBillingPortal={openBillingPortal}
      />

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

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={openBillingPortal}
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
          </CardContent>
        </Card>

        {/* Subscription Status Card */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Your current plans and features</CardDescription>
          </CardHeader>
          <CardContent>
            {customerLoading || !customer ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <Skeleton className="h-5 w-28 mb-2" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            ) : customer.products && customer.products.length > 0 ? (
              <div className="space-y-4">
                {customer.products.map((product) => (
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

        {/* Feature Usage Card */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Feature Usage</CardTitle>
            <CardDescription>Track your feature consumption</CardDescription>
          </CardHeader>
          <CardContent>
            {customerLoading || !customer ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>
            ) : customer.features &&
              Object.keys(customer.features).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(customer.features).map(
                  ([featureId, feature]) => (
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
