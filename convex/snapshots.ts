import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { VCustomer } from './validators'
import { authComponent } from './auth'

// Returns the latest customer snapshot for the authenticated user (or null)
export const get = query({
  args: {},
  handler: async (ctx) => {
    try {
      const user = await authComponent.getAuthUser(ctx)
      const u = user as { userId?: string; _id?: string }
      const userId = u.userId || u._id
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
    userId: v.string(),
    customerId: v.optional(v.string()),
    customer: v.optional(v.union(VCustomer, v.null())),
  },
  handler: async (ctx, args) => {
    const { userId, customerId, customer } = args
    if (!userId) return null
    const existing = await ctx.db
      .query('snapshots')
      .filter((q) => q.eq(q.field('userId'), userId))
      .first()
    const payload = {
      userId,
      customerId: customerId || userId,
      customer: customer ?? null,
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
