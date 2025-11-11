import { ConvexError } from 'convex/values'
import { Autumn } from '@useautumn/convex'
import { action } from './_generated/server'
import { components } from './_generated/api'
import { authComponent } from './auth'
import { autumnLogger } from './lib/logger'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from './_generated/dataModel'

/**
 * Validate and return AUTUMN_SECRET_KEY
 * Throws only when actually needed (not on import during codegen)
 */
function getAutumnSecretKey(): string {
  const key = process.env['AUTUMN_SECRET_KEY']
  if (!key) {
    throw new Error(
      'AUTUMN_SECRET_KEY is required. Get your key from https://app.useautumn.com/sandbox/dev',
    )
  }
  return key
}

export const autumn = new Autumn(components.autumn, {
  get secretKey() {
    return getAutumnSecretKey()
  },
  identify: async (ctx: GenericCtx<DataModel>) => {
    try {
      const user = await authComponent.getAuthUser(ctx)

      // Always use document ID (_id) as the canonical user identifier
      const userId = user._id
      if (!userId) return null

      return {
        customerId: userId,
        customerData: {
          name: user.name || '',
          email: user.email,
        },
      }
    } catch (error) {
      // Better Auth throws Error with message 'Unauthenticated'
      // This is expected when user is not logged in, return null
      if (error instanceof Error && error.message === 'Unauthenticated') {
        return null
      }

      // Unexpected error - log only (no async Sentry in identify callback)
      autumnLogger.error('Autumn identify error', error, {
        function: 'autumn.identify',
        service: 'billing',
      })

      // Re-throw as ConvexError so client gets structured error
      throw new ConvexError({
        code: 'AUTUMN_IDENTIFY_FAILED',
        message: 'Failed to identify customer for billing',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },
})

// Export all Autumn API methods
export const {
  track,
  cancel,
  query,
  attach,
  check,
  checkout,
  usage,
  setupPayment,
  createCustomer,
  listProducts,
  billingPortal,
  createReferralCode,
  redeemReferralCode,
  createEntity,
  getEntity,
} = autumn.api()

/**
 * Server-side action to fetch Autumn customer data.
 * Wraps autumn.customers.get() in a Convex action (required for external API calls).
 *
 * NOTE: This CANNOT be used in SSR loaders because:
 * - Requires authenticated Convex context (via authComponent.getAuthUser)
 * - Auth session lives in cookies, but Convex uses WebSocket authentication
 * - During SSR, authComponent.getAuthUser returns null → Autumn throws error
 *
 * Use client-side only (useQuery, not loader prefetch).
 *
 * @returns Customer billing data (subscriptions, features, usage)
 */
export const getCustomer = action(async (ctx) => {
  return await autumn.customers.get(ctx)
})
