import { Autumn } from '@useautumn/convex'
import { components } from './_generated/api'
import { getAuthUserOrNull } from './auth'
import { autumnLogger } from './lib/logger'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from './_generated/dataModel'

// Validate required environment variables
if (!process.env.AUTUMN_SECRET_KEY) {
  throw new Error(
    'AUTUMN_SECRET_KEY is required. Get your key from https://app.useautumn.com/sandbox/dev',
  )
}

export const autumn = new Autumn(components.autumn, {
  secretKey: process.env.AUTUMN_SECRET_KEY,
  identify: async (ctx: GenericCtx<DataModel>) => {
    const user = await getAuthUserOrNull(ctx)
    if (!user) return null

    // Check if user has a valid ID (userId or _id)
    const customerId = user.userId || user._id
    if (!customerId) {
      // This is actually an error - log it
      autumnLogger.error('User has no valid ID for Autumn', undefined, {
        userId: user.userId,
        _id: user._id,
      })
      return null
    }

    return {
      customerId,
      customerData: {
        name: user.name || '',
        email: user.email || '',
      },
    }
  },
})

/**
 * These exports are required for our react hooks and components
 * Note: These are Convex actions, not regular functions, so we can't wrap them
 * Logging happens in the identify function above when customers are identified
 */

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
