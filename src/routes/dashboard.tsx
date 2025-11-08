import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useAction } from 'convex/react'
import { ArrowRight, CreditCard, Package, Settings, Zap } from 'lucide-react'
import { useCustomer } from 'autumn-js/react'
import * as Sentry from '@sentry/tanstackstart-react'
import { api } from '../../convex/_generated/api'
import { logger } from '@/lib/logger'
import { usePageLoading } from '@/lib/hooks'
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
import { useSession } from '@/lib/auth'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const navigate = useNavigate()
  const { data: session, isPending: sessionPending } = useSession()

  const { data: userData, isLoading: isUserDataLoading } = useQuery(
    convexQuery(api.user.getUser, {}),
  )

  const billingPortalAction = useAction(api.autumn.billingPortal)

  const isLoading = usePageLoading([sessionPending, isUserDataLoading])

  useEffect(() => {
    if (sessionPending) return
    if (!session?.user) {
      logger.auth.info(
        'Unauthenticated access to dashboard, redirecting to sign-in',
      )
      navigate({ to: '/auth/sign-in' })
    } else {
      logger.auth.debug('Dashboard accessed', { userId: session.user.id })
    }
  }, [session?.user, sessionPending, navigate])

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col px-6 py-8 max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-3" />
          <Skeleton className="h-6 w-64" />
        </div>

        <div className="mb-6" />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-full lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-5 w-64" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-[22px] w-28 rounded-full" />
                    <Skeleton className="h-[22px] w-24 rounded-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3.5 w-40" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
              ))}
            </CardContent>
          </Card>

          <Card className="col-span-full">
            <CardHeader>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <Skeleton className="h-5 w-28 mb-2" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-full">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-56" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const user = userData?.user
  if (!user) return null

  return (
    <DashboardContent
      userData={{
        authenticated: true,
        user,
      }}
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
  billingPortalAction: (args: { returnUrl?: string }) => Promise<unknown>
}) {
  const { customer, isLoading: isCustomerLoading, refetch } = useCustomer()

  const hasFetchedRef = useRef(false)
  const [isFetching, setIsFetching] = useState(false)

  useEffect(() => {
    if (!customer && !isCustomerLoading && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      setIsFetching(true)
      refetch().finally(() => {
        setTimeout(() => setIsFetching(false), 100)
      })
    }
  }, [customer, isCustomerLoading, refetch])

  const openBillingPortal = async ({
    returnUrl,
  }: { returnUrl?: string } = {}) => {
    try {
      const response = await billingPortalAction({
        returnUrl: returnUrl || window.location.href,
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
      console.error('Failed to open billing portal:', err)
      Sentry.captureException(err, {
        tags: {
          route: 'dashboard',
          action: 'openBillingPortal',
        },
      })
    }
  }

  if (isCustomerLoading || isFetching) {
    return (
      <div className="flex flex-1 flex-col px-6 py-8 max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-3" />
          <Skeleton className="h-6 w-64" />
        </div>

        <div className="mb-6" />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-full lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-5 w-64" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-[22px] w-28 rounded-full" />
                    <Skeleton className="h-[22px] w-24 rounded-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3.5 w-40" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
              ))}
            </CardContent>
          </Card>

          <Card className="col-span-full">
            <CardHeader>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <Skeleton className="h-5 w-28 mb-2" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-full">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-56" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-8 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {userData.user?.name || 'User'}!
        </p>
      </div>

      {customer && (
        <div className="mb-6">
          <FailedPaymentBanner
            customer={customer}
            openBillingPortal={openBillingPortal}
          />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
              <Link to="/dashboard">
                <Settings className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Your current plans and features</CardDescription>
          </CardHeader>
          <CardContent>
            {isCustomerLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : customer && customer.products.length > 0 ? (
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

        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Feature Usage</CardTitle>
            <CardDescription>Track your feature consumption</CardDescription>
          </CardHeader>
          <CardContent>
            {isCustomerLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : customer?.features &&
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
