import { Autumn } from '@useautumn/convex'
import { components } from './_generated/api'
import { authComponent } from './auth'
import { autumnLogger } from './lib/logger'
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

      const userId = user.userId || user._id
      if (!userId) return null

      return {
        customerId: userId,
        customerData: {
          name: user.name ?? '',
          email: user.email ?? '',
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthenticated') {
        return null
      }
      autumnLogger.error('Autumn identify error', error)
      return null
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
