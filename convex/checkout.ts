import { v } from 'convex/values'
import { action } from './_generated/server'
import { autumn } from './autumn'
import { authComponent } from './auth'
import { api } from './_generated/api'

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
    try {
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
      // Upsert snapshot for realtime
      if (customer) {
        try {
          const user = await authComponent.getAuthUser(ctx as any)
          const userId = (user as any).userId || (user as any)._id
          await (ctx as any).runMutation(api.snapshots.upsert, {
            userId,
            customerId: userId,
            customer,
          } as any)
        } catch {}
      }
      return { success: true, data: { customer } }
    } catch (e: any) {
      return {
        success: false,
        error: { message: e?.message || 'Attach failed' },
      }
    }
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
    try {
      const res: any = await autumn.checkout(ctx, {
        productId: args.productId,
        options: args.options as any,
        entityId: args.entityId,
        freeTrial: args.freeTrial,
        invoice: args.invoice,
        successUrl: args.successUrl,
      } as any)
      return { success: true, data: res?.data ?? res }
    } catch (e: any) {
      return {
        success: false,
        error: { message: e?.message || 'Prepare failed' },
      }
    }
  },
})
