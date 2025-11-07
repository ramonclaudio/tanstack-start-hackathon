import { Autumn } from '@useautumn/convex'
import { components } from './_generated/api'
import { autumnLogger } from './lib/logger'
import { getAuthUserOrNull, getUserId } from './lib/auth'
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
    const user = await getAuthUserOrNull(ctx)
    if (!user) return null

    const customerId = getUserId(user)
    if (!customerId) {
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
