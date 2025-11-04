import { AlertTriangle, CreditCard, X } from 'lucide-react'
import { useState } from 'react'
import type { Customer } from 'autumn-js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * Banner that displays when a customer has a failed payment (past_due status)
 * Prompts them to update their payment method via the billing portal
 */
export function FailedPaymentBanner({
  customer,
  openBillingPortal,
}: {
  customer?: Customer | null
  openBillingPortal: (params?: {
    returnUrl?: string
    openInNewTab?: boolean
  }) => any
}) {
  const [dismissed, setDismissed] = useState(false)

  if (!customer || dismissed) return null

  // Check if any product has a past_due status
  const failedPayment = customer.products.find((p) => p.status === 'past_due')

  if (!failedPayment) return null

  const handleUpdatePayment = async () => {
    await openBillingPortal({
      returnUrl: window.location.href,
    })
  }

  return (
    <Card className="border-destructive/50 bg-destructive/10 relative">
      <div className="flex items-start gap-4 p-4">
        <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-sm text-destructive">
                Payment Failed
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your payment for <strong>{failedPayment.name}</strong> has
                failed. Please update your payment method to avoid service
                interruption.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={() => setDismissed(true)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleUpdatePayment}
            className="gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Update Payment Method
          </Button>
        </div>
      </div>
    </Card>
  )
}
