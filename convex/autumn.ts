import { Autumn } from '@useautumn/convex'
import { components } from './_generated/api'
import { authComponent } from './auth'
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
    // Get user from Better Auth through Convex
    const user = await authComponent.getAuthUser(ctx).catch(() => null)

    if (!user) return null

    const userId = user._id || user.userId
    if (!userId) return null

    return {
      customerId: userId,
      customerData: {
        name: user.name || '',
        email: user.email || '',
      },
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
