import { useCustomer } from 'autumn-js/react'
import { useState } from 'react'

/**
 * Hook for tracking feature usage with automatic refetch
 * Follows Autumn best practices for check -> perform -> track -> refetch pattern
 *
 * @example
 * ```tsx
 * const { trackAndRefetch, isTracking } = useUsageTracking()
 *
 * const handleSendMessage = async () => {
 *   // Perform your operation
 *   await sendAIMessage()
 *
 *   // Track usage and update balance
 *   await trackAndRefetch({ featureId: 'ai_messages' })
 * }
 * ```
 */
export function useUsageTracking() {
  // Use consistent options to share the same query instance across the app
  const { track, refetch } = useCustomer({ errorOnNotFound: false })
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Track usage and automatically refetch customer data to update UI
   * Use this after successfully performing a metered operation
   */
  const trackAndRefetch = async ({
    featureId,
    value = 1,
    entityId,
    idempotencyKey,
  }: {
    featureId: string
    value?: number
    entityId?: string
    idempotencyKey?: string
  }) => {
    setIsTracking(true)
    setError(null)

    try {
      // Track the usage
      await track({
        featureId,
        value,
        entityId,
        idempotencyKey,
      })

      // Refetch customer data to update balance in UI
      await refetch()

      return { success: true }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to track usage'
      setError(errorMessage)
      console.error('Usage tracking failed:', err)
      return { success: false, error: errorMessage }
    } finally {
      setIsTracking(false)
    }
  }

  /**
   * Refund usage (for failed operations)
   * Tracks negative usage to restore credits/balance
   */
  const refundAndRefetch = async ({
    featureId,
    value,
    entityId,
  }: {
    featureId: string
    value: number
    entityId?: string
  }) => {
    setIsTracking(true)
    setError(null)

    try {
      // Track negative usage to refund
      await track({
        featureId,
        value: -Math.abs(value),
        entityId,
      })

      // Refetch to update balance
      await refetch()

      return { success: true }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to refund usage'
      setError(errorMessage)
      console.error('Usage refund failed:', err)
      return { success: false, error: errorMessage }
    } finally {
      setIsTracking(false)
    }
  }

  return {
    trackAndRefetch,
    refundAndRefetch,
    isTracking,
    error,
  }
}

/**
 * Hook for check-then-track pattern with automatic refetch
 * Checks access before operation, tracks after success
 *
 * @example
 * ```tsx
 * const { checkThenTrack, isProcessing } = useCheckThenTrack()
 *
 * const handleUseFeature = async () => {
 *   const result = await checkThenTrack({
 *     featureId: 'credits',
 *     requiredBalance: 10,
 *     operation: async () => {
 *       // Your operation here
 *       return await generateAIContent()
 *     }
 *   })
 *
 *   if (!result.allowed) {
 *     alert('Insufficient credits')
 *     return
 *   }
 *
 *   // Use result.data from operation
 * }
 * ```
 */
export function useCheckThenTrack() {
  // Use consistent options to share the same query instance across the app
  const { check } = useCustomer({ errorOnNotFound: false })
  const { trackAndRefetch } = useUsageTracking()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Check access, run operation, track usage, refetch balance
   * Atomic operation that ensures usage is only tracked on success
   */
  const checkThenTrack = async <T>({
    featureId,
    requiredBalance,
    operation,
    trackValue,
  }: {
    featureId: string
    requiredBalance?: number
    operation: () => Promise<T>
    trackValue?: number
  }): Promise<{
    success: boolean
    allowed: boolean
    data?: T
    error?: string
  }> => {
    setIsProcessing(true)
    setError(null)

    let allowed = false
    try {
      // 1) Check access first
      const checkResult = await check({ featureId, requiredBalance })
      allowed = Boolean(checkResult.data.allowed)

      if (!allowed) {
        return {
          success: false,
          allowed: false,
          error: 'Access denied - insufficient balance or no permission',
        }
      }

      // 2) Perform the operation
      const operationResult = await operation()

      // 3) Track usage after successful operation and refetch
      const trackResult = await trackAndRefetch({
        featureId,
        value: trackValue ?? requiredBalance ?? 1,
      })

      if (!trackResult.success) {
        return {
          success: false,
          allowed: true,
          error: trackResult.error || 'Failed to track usage',
        }
      }

      return {
        success: true,
        allowed: true,
        data: operationResult,
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Operation failed'
      setError(errorMessage)
      console.error('Check-then-track failed:', err)
      return {
        success: false,
        allowed,
        error: errorMessage,
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    checkThenTrack,
    isProcessing,
    error,
  }
}
