import { ConvexError } from 'convex/values'
import { Autumn } from '@useautumn/convex'
import { components } from './_generated/api'
import { authComponent } from './auth'
import { autumnLogger } from './lib/logger'
import { captureException } from './lib/sentry'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from './_generated/dataModel'

if (!process.env['AUTUMN_SECRET_KEY']) {
  throw new Error(
    'AUTUMN_SECRET_KEY is required. Get your key from https://app.useautumn.com/sandbox/dev',
  )
}

export const autumn = new Autumn(components.autumn, {
  secretKey: process.env['AUTUMN_SECRET_KEY'],
  identify: async (ctx: GenericCtx<DataModel>) => {
    try {
      const user = await authComponent.getAuthUser(ctx)

      // Always use document ID (_id) as the canonical user identifier
      const userId = user._id
      if (!userId) return null

      return {
        customerId: userId,
        customerData: {
          name: user.name ?? '',
          email: user.email ?? '',
        },
      }
    } catch (error) {
      // Better Auth throws Error with message 'Unauthenticated'
      // This is expected when user is not logged in, return null
      if (error instanceof Error && error.message === 'Unauthenticated') {
        return null
      }

      // Unexpected error - log and report
      autumnLogger.error('Autumn identify error', error)

      if (error instanceof Error) {
        captureException(error, {
          tags: { function: 'autumn.identify', service: 'billing' },
          extra: { context: 'Failed to identify customer for Autumn billing' },
          level: 'error',
        }).catch(() => {
          // Ignore Sentry failures - identify must be deterministic
        })
      }

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
