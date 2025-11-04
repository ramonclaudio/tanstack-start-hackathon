import { v } from 'convex/values'
import { action } from './_generated/server'
import { autumn } from './autumn'

/**
 * Server-side feature access check
 * IMPORTANT: Always use this for security-critical operations
 * Client-side checks can be bypassed - server-side cannot
 *
 * @example
 * ```ts
 * const result = await ctx.runAction(api.features.checkFeatureAccess, {
 *   featureId: 'ai_credits',
 *   requiredBalance: 10
 * })
 * if (!result.allowed) {
 *   throw new Error('Insufficient credits')
 * }
 * ```
 */
export const checkFeatureAccess = action({
  args: {
    featureId: v.optional(v.string()),
    productId: v.optional(v.string()),
    requiredBalance: v.optional(v.number()),
    withPreview: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      const result = await autumn.check(ctx, {
        featureId: args.featureId,
        productId: args.productId,
        requiredBalance: args.requiredBalance,
        withPreview: args.withPreview,
      })

      return {
        success: true,
        data: result.data,
        error: null,
      }
    } catch (error: any) {
      console.error('Feature access check failed:', error)
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to check feature access',
      }
    }
  },
})

/**
 * Server-side usage tracking
 * Records usage events for metered features
 * Should be called AFTER the operation succeeds
 *
 * @example
 * ```ts
 * // After generating AI content
 * await ctx.runAction(api.features.trackUsage, {
 *   featureId: 'ai_credits',
 *   value: 10
 * })
 * ```
 */
export const trackUsage = action({
  args: {
    featureId: v.string(),
    value: v.optional(v.number()),
    entityId: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const result = await autumn.track(ctx, {
        featureId: args.featureId,
        value: args.value ?? 1,
        entityId: args.entityId,
        idempotencyKey: args.idempotencyKey,
      })

      return {
        success: true,
        data: result.data,
        error: null,
      }
    } catch (error: any) {
      console.error('Usage tracking failed:', error)
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to track usage',
      }
    }
  },
})

/**
 * Secure check-and-track operation
 * Checks access, executes operation callback, then tracks usage
 * Use this pattern for atomic operations where you want to ensure
 * usage is only tracked if the operation succeeds
 *
 * @example
 * ```ts
 * const result = await ctx.runAction(api.features.checkAndTrack, {
 *   featureId: 'ai_credits',
 *   requiredBalance: 10,
 *   trackValue: 10
 * })
 * if (!result.allowed) {
 *   throw new Error('Insufficient credits')
 * }
 * // Perform your operation here
 * // Usage is already tracked
 * ```
 */
export const checkAndTrack = action({
  args: {
    featureId: v.string(),
    requiredBalance: v.optional(v.number()),
    trackValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // First check access
      const checkResult = await autumn.check(ctx, {
        featureId: args.featureId,
        requiredBalance: args.requiredBalance,
      })

      if (!checkResult.data?.allowed) {
        return {
          success: false,
          allowed: false,
          data: checkResult.data,
          error: 'Access denied',
        }
      }

      // If check passes, track the usage
      // This uses the "send_event" pattern from Autumn docs
      const trackResult = await autumn.track(ctx, {
        featureId: args.featureId,
        value: args.trackValue ?? args.requiredBalance ?? 1,
      })

      return {
        success: true,
        allowed: true,
        data: {
          check: checkResult.data,
          track: trackResult.data,
        },
        error: null,
      }
    } catch (error: any) {
      console.error('Check and track failed:', error)
      return {
        success: false,
        allowed: false,
        data: null,
        error: error.message || 'Operation failed',
      }
    }
  },
})

/**
 * Refund usage (negative tracking)
 * Use this when an operation fails and you need to refund credits
 *
 * @example
 * ```ts
 * // If AI generation fails after tracking
 * await ctx.runAction(api.features.refundUsage, {
 *   featureId: 'ai_credits',
 *   value: 10
 * })
 * ```
 */
export const refundUsage = action({
  args: {
    featureId: v.string(),
    value: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const result = await autumn.track(ctx, {
        featureId: args.featureId,
        value: -Math.abs(args.value), // Ensure negative value
      })

      return {
        success: true,
        data: result.data,
        error: null,
      }
    } catch (error: any) {
      console.error('Usage refund failed:', error)
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to refund usage',
      }
    }
  },
})
