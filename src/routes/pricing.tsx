import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Check } from 'lucide-react'
import { usePricingTable } from 'autumn-js/react'
import { usePageLoading } from '@/lib/hooks/use-page-loading'
import PricingTable from '@/components/pricing/PricingTable'
import { useSession } from '@/lib/auth-client'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  FAQAccordionSkeleton,
  HeroSkeleton,
  SectionHeaderSkeleton,
  WhyChooseGridSkeleton,
} from '@/components/skeletons'
import { Skeleton } from '@/components/ui/skeleton'

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
  const { isLoading: pricingLoading } = usePricingTable({})

  const isLoading = usePageLoading([isPending, pricingLoading])

  if (isLoading) {
    return <PricingPageSkeleton />
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto max-w-7xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that's right for you. Upgrade, downgrade, or cancel
            at any time.
          </p>
        </div>

        <div className="mb-12">
          <PricingTable
            initialInterval={search.interval}
            selectedPlan={search.plan}
            onIntervalChange={(interval) =>
              navigate({
                to: '/pricing',
                search: (prev: typeof search) => ({ ...prev, interval }),
                replace: true,
              })
            }
            onSelectPlan={(planId) =>
              navigate({
                to: '/pricing',
                search: (prev: typeof search) => ({ ...prev, plan: planId }),
                replace: true,
              })
            }
            onPlanChanged={() => {
              // Autumn handles data refresh automatically
            }}
          />
        </div>

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
                Payments are processed securely through Stripe, the industry
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

function PricingPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto max-w-7xl w-full">
        <div className="text-center mb-12">
          <HeroSkeleton />
        </div>
        <div className="mb-12">
          <PricingTable loading={true} />
        </div>
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <SectionHeaderSkeleton />
          </div>
          <WhyChooseGridSkeleton />
        </div>
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <SectionHeaderSkeleton className="w-64" />
          </div>
          <FAQAccordionSkeleton count={6} />
        </div>
        <div className="mt-16 text-center border-t pt-12">
          <div className="flex flex-col items-center gap-5">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>
    </div>
  )
}
