import { v } from 'convex/values'
import { action } from './_generated/server'
import { autumn } from './autumn'

export const openPortal = action({
  args: {
    returnUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await autumn.customers.billingPortal(ctx, {
      returnUrl: args.returnUrl,
    })
    // Normalize to a simple URL string for clients
    const data: any = (result as any).data
    const url = typeof data === 'string' ? data : (data?.url ?? null)
    return { url }
  },
})
