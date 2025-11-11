import { Link } from '@tanstack/react-router'
import { ArrowRight, CreditCard, Package, Zap } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useAction, useConvex } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { FailedPaymentBanner } from './FailedPaymentBanner'
import type { Customer as AutumnCustomer } from 'autumn-js'
import { logger } from '@/lib/logger'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Type definitions for Autumn API response wrapper
 */

type AutumnResponse = {
  data: AutumnCustomer | null
  error?: { code: string; message: string }
}

/**
 * Autumn billing section with client-side data fetching.
 *
 * ARCHITECTURE NOTE:
 * Autumn requires authenticated Convex context (via authComponent.getAuthUser).
 * During SSR, auth context isn't available (session is in cookies, Convex uses WebSockets).
 * Therefore, this component fetches client-side after mount when auth is ready.
 *
 * Uses Convex user query as gate to ensure WebSocket auth is synced before fetching Autumn data.
 * This prevents race conditions without retry logic.
 */
export function AutumnBillingSection() {
  const convex = useConvex()

  // Use Convex user query as auth sync gate (SSR-prefetched in loader)
  const { data: convexUser } = useQuery(convexQuery(api.user.getUser, {}))

  // Only fetch Autumn data after Convex auth is fully synced
  const { data: customerData, isLoading: customerLoading } =
    useQuery<AutumnResponse>({
      queryKey: ['autumn', 'customer', convexUser?.user?.id],
      queryFn: async () => {
        return (await convex.action(
          api.autumn.getCustomer,
          {},
        )) as AutumnResponse
      },
      enabled: !!convexUser?.user, // Wait for Convex auth, not just cookie session
      staleTime: 60000, // Cache for 1min to reduce refetches
    })
  const billingPortalAction = useAction(api.autumn.billingPortal)

  const customer = customerData?.data ?? null
  const isLoadingCustomer = !convexUser?.user || customerLoading

  const openBillingPortal = async () => {
    try {
      const response = await billingPortalAction({
        returnUrl: window.location.href,
      })

      if (
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
    <>
      <FailedPaymentBanner
        customer={customer}
        openBillingPortal={openBillingPortal}
      />

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
          {isLoadingCustomer ? (
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-5 w-28 mb-2" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ) : customer?.products && customer.products.length > 0 ? (
            <div className="space-y-4">
              {customer.products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <div className="font-medium">{product.name || 'Plan'}</div>
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
          {isLoadingCustomer ? (
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
          ) : customer?.features &&
            Object.keys(customer.features).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(customer.features).map(([featureId, feature]) => (
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
                        {feature.balance ?? 0} / {feature.included_usage ?? 0}
                      </span>
                    )}
                  </div>
                  {!feature.unlimited && feature.included_usage && (
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{
                          width: `${Math.min(
                            ((feature.balance ?? 0) / feature.included_usage) *
                              100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
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
    </>
  )
}
