import { mutation, query } from './_generated/server'
import { authComponent } from './auth'

// Returns the latest customer snapshot for the authenticated user (or null)
export const get = query({
  args: {},
  handler: async (ctx) => {
    try {
      const user = await authComponent.getAuthUser(ctx)
      const userId = (user as any).userId || (user as any)._id
      if (!userId) return null

      const doc = await ctx.db
        .query('snapshots')
        .filter((q) => q.eq(q.field('userId'), userId))
        .first()
      return doc || null
    } catch {
      return null
    }
  },
})

export const upsert = mutation({
  args: {
    // loose typing without schema; keep args flexible
  } as any,
  // Expect args: { userId: string, customerId: string, customer: any, updatedAt?: number }
  handler: async (ctx, args: any) => {
    const { userId, customerId, customer } = args
    if (!userId) return null
    const existing = await ctx.db
      .query('snapshots')
      .filter((q) => q.eq(q.field('userId'), userId))
      .first()
    const payload = {
      userId,
      customerId: customerId || userId,
      customer: customer || null,
      updatedAt: Date.now(),
    }
    if (existing) {
      await ctx.db.patch(existing._id, payload)
      return existing._id
    } else {
      return await ctx.db.insert('snapshots', payload)
    }
  },
})
