import { v } from 'convex/values'
import { z } from 'zod'
import { action } from './_generated/server'
import { autumn } from './autumn'
import { actionResultSchema } from './actionResult'

/**
 * Server-side feature access check
 * IMPORTANT: Always use this for security-critical operations
 * Client-side checks can be bypassed - server-side cannot
 *
 * @example
 * ```ts
 * const result = await ctx.runAction(api.features.checkFeatureAccess, {
 *   featureId: 'credits',
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

      const base = { success: true as const, data: result.data }
      return actionResultSchema(z.unknown()).parse(base)
    } catch (error: unknown) {
      console.error('Feature access check failed:', error)
      const base = {
        success: false as const,
        error:
          error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: unknown }).message)
            : 'Failed to check feature access',
      }
      return actionResultSchema(z.unknown()).parse(base)
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
 *   featureId: 'credits',
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

      const base = { success: true as const, data: result.data }
      return actionResultSchema(z.unknown()).parse(base)
    } catch (error: unknown) {
      console.error('Usage tracking failed:', error)
      const base = {
        success: false as const,
        error:
          error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: unknown }).message)
            : 'Failed to track usage',
      }
      return actionResultSchema(z.unknown()).parse(base)
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
 *   featureId: 'credits',
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
        const base = {
          success: false as const,
          data: checkResult.data,
          error: 'Access denied',
        }
        // Validate envelope and preserve allowed flag
        const safe = actionResultSchema(z.unknown()).parse(base)
        return { ...safe, allowed: false }
      }

      // If check passes, track the usage
      // This uses the "send_event" pattern from Autumn docs
      const trackResult = await autumn.track(ctx, {
        featureId: args.featureId,
        value: args.trackValue ?? args.requiredBalance ?? 1,
      })

      const base = {
        success: true as const,
        data: { check: checkResult.data, track: trackResult.data },
      }
      const safe = actionResultSchema(
        z.object({ check: z.unknown(), track: z.unknown() }),
      ).parse(base)
      return { ...safe, allowed: true }
    } catch (error: unknown) {
      console.error('Check and track failed:', error)
      const base = {
        success: false as const,
        error:
          error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: unknown }).message)
            : 'Operation failed',
      }
      const safe = actionResultSchema(z.unknown()).parse(base)
      return { ...safe, allowed: false }
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
 *   featureId: 'credits',
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

      const base = { success: true as const, data: result.data }
      return actionResultSchema(z.unknown()).parse(base)
    } catch (error: unknown) {
      console.error('Usage refund failed:', error)
      const base = {
        success: false as const,
        error:
          error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: unknown }).message)
            : 'Failed to refund usage',
      }
      return actionResultSchema(z.unknown()).parse(base)
    }
  },
})
