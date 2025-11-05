import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAction } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import PricingTable from '@/components/autumn/pricing-table'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export const Route = createFileRoute('/pricing')({
  validateSearch: z.object({
    interval: z.enum(['month', 'year']).optional(),
    plan: z.string().optional(),
  }),
  component: PricingPage,
})

function PricingPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const search = Route.useSearch()
  const getPricing = useAction((api as any).pricing.get)
  const [products, setProducts] = useState<Array<any>>([])
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const snapshot = useSuspenseQuery(
    convexQuery((api as any).snapshots.get, {}),
  ) as any

  useEffect(() => {
    ;(async () => {
      try {
        const res = await getPricing({})
        const payload: any = res
        setProducts(payload?.data?.products ?? [])
        setCustomer(payload?.data?.customer ?? null)
      } catch (e) {
        console.error('Failed to load pricing', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [getPricing, !!session?.user])

  if (isPending) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto max-w-7xl w-full">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that's right for you. Upgrade, downgrade, or cancel
            at any time.
          </p>
        </div>

        {/* Pricing Table */}
        <div className="mb-12">
          <PricingTable
            products={products}
            customer={snapshot?.customer ?? customer}
            loading={loading}
            initialInterval={search.interval}
            selectedPlan={search.plan}
            onIntervalChange={(interval) =>
              navigate({
                to: '/pricing',
                search: (s: any) => ({ ...s, interval }),
                replace: true,
              })
            }
            onSelectPlan={(planId) =>
              navigate({
                to: '/pricing',
                search: (s: any) => ({ ...s, plan: planId }),
                replace: true,
              })
            }
            onPlanChanged={async () => {
              try {
                const res = await getPricing({})
                const payload: any = res
                setProducts(payload?.data?.products ?? [])
                setCustomer(payload?.data?.customer ?? null)
              } catch (e) {
                console.error('Failed to refresh pricing after plan change', e)
              }
            }}
          />
        </div>

        {/* Sign in CTA for unauthenticated users */}
        {!session?.user && (
          <div className="my-12 max-w-2xl mx-auto">
            <div className="border rounded-lg p-8 text-center bg-secondary/30">
              <h3 className="text-xl font-semibold mb-3">
                Ready to get started?
              </h3>
              <p className="text-muted-foreground mb-6">
                Sign in or create an account to subscribe to a plan and unlock
                all features.
              </p>
              <div className="flex gap-3 justify-center">
                <Button asChild>
                  <a href="/auth/sign-up">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/auth/sign-in">Sign In</a>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Features Comparison */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Why Choose Us?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border rounded-lg p-6 bg-card">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Flexible Billing</h3>
              <p className="text-sm text-muted-foreground">
                Switch between plans anytime. Prorated billing ensures you only
                pay for what you use.
              </p>
            </div>
            <div className="border rounded-lg p-6 bg-card">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Secure Payments</h3>
              <p className="text-sm text-muted-foreground">
                All payments are processed securely through Stripe, the industry
                leader in payment processing.
              </p>
            </div>
            <div className="border rounded-lg p-6 bg-card">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Cancel Anytime</h3>
              <p className="text-sm text-muted-foreground">
                No long-term commitments. Cancel your subscription at any time
                from your dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            <AccordionItem
              value="change-plans"
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                Can I change plans later?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! You can upgrade, downgrade, or cancel your subscription at
                any time from your dashboard. Changes take effect immediately,
                and you'll be charged or credited the prorated difference.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="billing-upgrades"
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                How does billing work for upgrades?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                When you upgrade, you'll be charged a prorated amount for the
                remainder of your billing cycle. For downgrades, the credit will
                be applied to your next billing cycle.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="payment-methods"
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                What payment methods do you accept?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We accept all major credit cards (Visa, Mastercard, American
                Express, Discover) through Stripe, our secure payment processor.
                All transactions are encrypted and PCI-compliant.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="free-trial"
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                Is there a free trial?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {session?.user
                  ? 'Check the pricing cards above to see if any plans offer a free trial! Trial availability is shown on each plan card.'
                  : 'Sign up to see if any plans offer a free trial! Some plans may include trial periods.'}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="refunds" className="border rounded-lg px-4">
              <AccordionTrigger className="text-left hover:no-underline">
                What is your refund policy?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We offer a 14-day money-back guarantee for all paid plans. If
                you're not satisfied, contact our support team for a full refund
                within the first 14 days of your subscription.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="security" className="border rounded-lg px-4">
              <AccordionTrigger className="text-left hover:no-underline">
                How secure is my data?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We take security seriously. All data is encrypted in transit and
                at rest. We're SOC 2 compliant and regularly undergo security
                audits. Your payment information is never stored on our servers.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center border-t pt-12">
          <p className="text-muted-foreground mb-4">
            Still have questions? We're here to help.
          </p>
          <p className="text-sm text-muted-foreground">
            Contact us at{' '}
            <a
              href="mailto:support@example.com"
              className="text-primary hover:underline font-medium"
            >
              support@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
