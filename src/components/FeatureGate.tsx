import { Link } from '@tanstack/react-router'
import { Loader2, Lock } from 'lucide-react'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FeatureGateProps {
  featureId?: string
  productId?: string
  requiredBalance?: number
  children: React.ReactNode
  fallback?: React.ReactNode
  showPaywall?: boolean
}

/**
 * Component that gates content behind feature access checks
 * @example
 * ```tsx
 * // Gate by product/plan
 * <FeatureGate productId="pro_plan">
 *   <ProFeatures />
 * </FeatureGate>
 *
 * // Gate by usage-based feature
 * <FeatureGate featureId="ai_credits" requiredBalance={10}>
 *   <AIFeatures />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  featureId,
  productId,
  requiredBalance,
  children,
  fallback,
  showPaywall = true,
}: FeatureGateProps) {
  const { hasAccess, isLoading } = useFeatureAccess()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const access = hasAccess({ featureId, productId, requiredBalance })

  if (!access) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (showPaywall) {
      return <DefaultPaywall featureId={featureId} productId={productId} />
    }

    return null
  }

  return <>{children}</>
}

function DefaultPaywall({
  featureId,
  productId,
}: {
  featureId?: string
  productId?: string
}) {
  // Determine the required plan name for display
  const planName = productId
    ? productId
        .replace('_plan', '')
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : 'Premium'

  return (
    <Card className="border-2 border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          {planName} Feature
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          This feature requires a {planName} plan or higher. Upgrade your plan
          to unlock this and many more features.
        </p>
        <Button asChild>
          <Link to="/pricing">View Plans</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Inline gate that hides/shows UI elements based on access
 * @example
 * ```tsx
 * // Show button only for Pro plan users
 * <InlineFeatureGate productId="pro_plan">
 *   <Button>Pro Action</Button>
 * </InlineFeatureGate>
 *
 * // Show only if user has AI credits
 * <InlineFeatureGate featureId="ai_credits" requiredBalance={1}>
 *   <Button>Use AI</Button>
 * </InlineFeatureGate>
 * ```
 */
export function InlineFeatureGate({
  featureId,
  productId,
  requiredBalance,
  children,
}: Omit<FeatureGateProps, 'fallback' | 'showPaywall'>) {
  const { hasAccess, isLoading } = useFeatureAccess()

  if (isLoading) {
    return null
  }

  const access = hasAccess({ featureId, productId, requiredBalance })

  if (!access) {
    return null
  }

  return <>{children}</>
}
