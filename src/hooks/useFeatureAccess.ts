import { useCustomer } from 'autumn-js/react'
import { useNavigate } from '@tanstack/react-router'

/**
 * Hook to check feature access and handle paywalls
 * @example
 * ```tsx
 * const { hasAccess, checkFeature } = useFeatureAccess()
 *
 * // Check plan access locally (no API call)
 * const hasProPlan = hasAccess({ productId: 'pro_plan' })
 *
 * // Check feature access locally
 * const hasAiCredits = hasAccess({ featureId: 'ai_credits', requiredBalance: 10 })
 *
 * // Check access with API call (gets latest state from Autumn)
 * const result = await checkFeature({ featureId: 'ai_credits', requiredBalance: 1 })
 * if (result.data.allowed) {
 *   // User has access - perform action
 * }
 * ```
 */
export function useFeatureAccess() {
  const { customer, check, isLoading } = useCustomer({ errorOnNotFound: false })
  const navigate = useNavigate()

  /**
   * Check if customer has access to a feature or product locally
   * No API call - checks against local customer state
   */
  const hasAccess = ({
    featureId,
    productId,
    requiredBalance,
  }: {
    featureId?: string
    productId?: string
    requiredBalance?: number
  }): boolean => {
    if (!customer) return false

    // Check product access
    // Note: Don't check for 'active' status as product may be 'trialing'
    // Autumn manages all valid states, so just check if product exists
    if (productId) {
      const products = customer.products
      if (products.length === 0) return false
      return products.some((p) => p.id === productId)
    }

    // Check feature access
    if (featureId) {
      const features = customer.features
      const feature = features[featureId]
      if (typeof feature === 'undefined') return false

      // If feature exists and is unlimited
      if (feature.unlimited) return true

      // Check balance if required
      if (requiredBalance !== undefined) {
        return (feature.balance ?? 0) >= requiredBalance
      }

      // Just check if feature exists and has balance
      return (feature.balance ?? 0) > 0
    }

    return false
  }

  /**
   * Check feature access with API call (gets latest state from Autumn)
   * Use this when you need the most up-to-date information
   */
  const checkFeature = async ({
    featureId,
    productId,
    requiredBalance,
    sendEvent = false,
  }: {
    featureId?: string
    productId?: string
    requiredBalance?: number
    sendEvent?: boolean
  }) => {
    return await check({
      featureId,
      productId,
      requiredBalance,
      sendEvent,
    })
  }

  /**
   * Redirect to pricing page if user doesn't have access
   */
  const requireAccess = ({
    featureId,
    productId,
  }: {
    featureId?: string
    productId?: string
  }): boolean => {
    const access = hasAccess({ featureId, productId })

    if (!access) {
      navigate({ to: '/pricing' })
      return false
    }

    return true
  }

  return {
    customer,
    isLoading,
    hasAccess,
    checkFeature,
    requireAccess,
  }
}
