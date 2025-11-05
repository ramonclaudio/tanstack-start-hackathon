import { v } from 'convex/values'
import { z } from 'zod'
import { action } from './_generated/server'
import { autumn } from './autumn'
import { authComponent } from './auth'
import { api } from './_generated/api'
import { unwrap } from './utils'
import { CheckoutResultSchema, CustomerSchema } from './schemas'
import { actionResultSchema } from './actionResult'

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
        options: args.options,
        entityId: args.entityId,
        freeTrial: args.freeTrial,
        successUrl: args.successUrl,
        invoice: args.invoice,
      })

      const customerRes = (await autumn.customers.get(ctx, {
        expand: [
          'entities',
          'invoices',
          'trials_used',
          'rewards',
          'payment_method',
        ] as const,
      })) as { data?: unknown } | unknown
      const customerRaw = unwrap<unknown>(customerRes as any)
      const parsedCustomer = CustomerSchema.safeParse(customerRaw)
      const customer: z.infer<typeof CustomerSchema> | null =
        parsedCustomer.success ? parsedCustomer.data : null
      // Upsert snapshot for realtime
      if (customer) {
        try {
          const user = await authComponent.getAuthUser(ctx)
          const u = user as { userId?: string; _id?: string }
          const userId = u.userId || u._id
          if (userId) {
            await ctx.runMutation(api.snapshots.upsert, {
              userId,
              customerId: userId,
              customer,
            })
          }
        } catch {}
      }
      const Schema = actionResultSchema(
        z.object({ customer: CustomerSchema.nullable() }),
      )
      return Schema.parse({ success: true, data: { customer } })
    } catch (e: unknown) {
      const message =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'Attach failed'
      return {
        success: false,
        error: { message },
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
      const res = (await autumn.checkout(ctx, {
        productId: args.productId,
        options: args.options,
        entityId: args.entityId,
        invoice: args.invoice,
        successUrl: args.successUrl,
      })) as { data?: unknown } | unknown
      const data = unwrap<unknown>(res as any)
      const Schema = actionResultSchema(CheckoutResultSchema.nullable())
      return Schema.parse({ success: true, data })
    } catch (e: unknown) {
      const message =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'Prepare failed'
      return {
        success: false,
        error: { message },
      }
    }
  },
})
