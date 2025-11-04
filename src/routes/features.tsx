import { createFileRoute } from '@tanstack/react-router'
import { Crown, Sparkles, Zap } from 'lucide-react'
import { FeatureGate, InlineFeatureGate } from '@/components/FeatureGate'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/features')({
  component: FeaturesPage,
})

function FeaturesPage() {
  const { customer, hasAccess } = useFeatureAccess()

  // Check user's current plan
  const hasFreePlan = hasAccess({ productId: 'free_plan' })
  const hasStarterPlan = hasAccess({ productId: 'starter_plan' })
  const hasProPlan = hasAccess({ productId: 'pro_plan' })
  const hasEnterprisePlan = hasAccess({ productId: 'enterprise_plan' })

  // Determine current plan for display
  const currentPlan = hasEnterprisePlan
    ? 'Enterprise'
    : hasProPlan
      ? 'Pro'
      : hasStarterPlan
        ? 'Starter'
        : hasFreePlan
          ? 'Free'
          : 'No Plan'

  return (
    <div className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto max-w-6xl w-full">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Features</h1>
          <p className="text-lg text-muted-foreground">
            Explore what you can do with your current plan
          </p>
        </div>

        {/* Current Plan Badge */}
        {customer && (
          <div className="mb-8">
            <Badge
              variant={
                hasProPlan || hasEnterprisePlan ? 'default' : 'secondary'
              }
            >
              {currentPlan} Plan
            </Badge>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Free Feature - Always Available */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Basic Feature
                <Badge variant="outline" className="ml-auto">
                  Free
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This feature is available to all users, regardless of their
                subscription plan.
              </p>
              <Button variant="outline" className="w-full">
                Use Basic Feature
              </Button>
            </CardContent>
          </Card>

          {/* Starter Feature - Gated */}
          <FeatureGate productId="starter_plan">
            <Card className="border-blue-500/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  Starter Feature
                  <Badge variant="secondary" className="ml-auto">
                    Starter+
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This feature is available to Starter plan subscribers and
                  above. You have access!
                </p>
                <Button variant="outline" className="w-full">
                  Use Starter Feature
                </Button>
              </CardContent>
            </Card>
          </FeatureGate>

          {/* Pro Feature - Gated */}
          <FeatureGate productId="pro_plan">
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Pro Feature
                  <Badge className="ml-auto">Pro</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This feature is only available to Pro plan subscribers and
                  above. You have access!
                </p>
                <Button className="w-full">Use Pro Feature</Button>
              </CardContent>
            </Card>
          </FeatureGate>

          {/* Enterprise Feature - Gated */}
          <FeatureGate productId="enterprise_plan">
            <Card className="border-purple-500/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-purple-500" />
                  Enterprise Feature
                  <Badge variant="outline" className="ml-auto">
                    Enterprise
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Advanced enterprise features for large teams and
                  organizations.
                </p>
                <Button variant="outline" className="w-full">
                  Use Enterprise Feature
                </Button>
              </CardContent>
            </Card>
          </FeatureGate>

          {/* Usage-Based Feature Example */}
          <UsageBasedFeatureCard />
        </div>

        {/* Inline Feature Gate Example */}
        <div className="mt-12 border-t pt-8">
          <h2 className="text-2xl font-bold mb-4">Conditional UI Elements</h2>
          <p className="text-sm text-muted-foreground mb-4">
            These buttons only appear if you have access to the corresponding
            plan.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline">Available to All</Button>

            <InlineFeatureGate productId="starter_plan">
              <Button variant="secondary">Starter+ Only</Button>
            </InlineFeatureGate>

            <InlineFeatureGate productId="pro_plan">
              <Button>Pro+ Only</Button>
            </InlineFeatureGate>

            <InlineFeatureGate productId="enterprise_plan">
              <Button variant="outline" className="border-purple-500">
                Enterprise Only
              </Button>
            </InlineFeatureGate>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Example of checking usage-based feature access
 */
function UsageBasedFeatureCard() {
  const { customer, hasAccess, checkFeature } = useFeatureAccess()

  // Check if user has AI credits remaining
  const aiCreditsFeature = customer?.features
    ? customer.features['ai_credits']
    : undefined
  const aiCreditsBalance = aiCreditsFeature?.balance ?? 0
  const hasAiCredits = hasAccess({
    featureId: 'ai_credits',
    requiredBalance: 1,
  })

  const handleUseFeature = async () => {
    // Check access with API call to get latest state
    const result = await checkFeature({
      featureId: 'ai_credits',
      requiredBalance: 1,
    })

    const resultData = result.data
    if (resultData.allowed) {
      // User has access - perform action
      console.log('Using AI credit...')
      // After successful action, track usage separately
      // await track({ featureId: 'ai_credits', value: 1 })
    } else {
      // Show upgrade prompt
      alert('You have run out of AI credits. Please upgrade your plan.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          AI Credits
          <Badge variant="secondary" className="ml-auto">
            {aiCreditsBalance.toLocaleString()} remaining
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Usage-based feature with balance tracking. Each AI request consumes
          credits based on usage.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleUseFeature}
          disabled={!hasAiCredits}
        >
          {hasAiCredits ? 'Use AI Credits' : 'No Credits Remaining'}
        </Button>
      </CardContent>
    </Card>
  )
}
