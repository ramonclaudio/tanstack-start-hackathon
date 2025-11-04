import { Autumn } from '@useautumn/convex'
import { components } from './_generated/api'
import { authComponent } from './auth'

// Validate required environment variables
if (!process.env.AUTUMN_SECRET_KEY) {
  throw new Error(
    'AUTUMN_SECRET_KEY is required. Get your key from https://app.useautumn.com/sandbox/dev',
  )
}

export const autumn = new Autumn(components.autumn, {
  secretKey: process.env.AUTUMN_SECRET_KEY,
  identify: async (ctx: any) => {
    try {
      const user = await authComponent.getAuthUser(ctx)

      // Check if user has a valid ID (userId or _id)
      const customerId = user.userId || user._id

      if (!customerId) {
        return null
      }

      return {
        customerId,
        customerData: {
          name: user.name || '',
          email: user.email || '',
        },
      }
    } catch (error) {
      // getAuthUser throws "Unauthenticated" error when no user is logged in
      // This is expected behavior during initial page load before session is ready
      return null
    }
  },
})

/**
 * These exports are required for our react hooks and components
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
