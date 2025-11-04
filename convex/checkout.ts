import { v } from 'convex/values'
import { action } from './_generated/server'
import { autumn } from './autumn'

export const attachAndHydrate = action({
  args: {
    productId: v.string(),
    options: v.optional(
      v.array(v.object({ featureId: v.string(), quantity: v.number() })),
    ),
    entityId: v.optional(v.string()),
    freeTrial: v.optional(v.boolean()),
    successUrl: v.optional(v.string()),
    invoice: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await autumn.attach(ctx, {
      productId: args.productId,
      options: args.options as any,
      entityId: args.entityId,
      freeTrial: args.freeTrial,
      successUrl: args.successUrl,
      invoice: args.invoice,
    })

    const customerRes: any = await autumn.customers.get(ctx, {
      expand: [
        'entities',
        'invoices',
        'trials_used',
        'rewards',
        'payment_method',
      ] as any,
    })
    const customer = customerRes?.data ?? null
    return { success: true, customer }
  },
})

export const prepare = action({
  args: {
    productId: v.string(),
    options: v.optional(
      v.array(v.object({ featureId: v.string(), quantity: v.number() })),
    ),
    entityId: v.optional(v.string()),
    freeTrial: v.optional(v.boolean()),
    invoice: v.optional(v.boolean()),
    successUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const res: any = await autumn.checkout(ctx, {
      productId: args.productId,
      options: args.options as any,
      entityId: args.entityId,
      freeTrial: args.freeTrial,
      invoice: args.invoice,
      successUrl: args.successUrl,
    } as any)
    // Return normalized checkout result
    return res?.data ?? res
  },
})
