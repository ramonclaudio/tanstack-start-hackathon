import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { VProduct } from './validators'

export const upsert = mutation({
  args: {
    key: v.string(),
    products: v.array(VProduct),
  },
  handler: async (ctx, { key, products }) => {
    const existing = await ctx.db
      .query('product_cache')
      .filter((q) => q.eq(q.field('key'), key))
      .first()
    const payload = { key, products, updatedAt: Date.now() }
    if (existing) {
      await ctx.db.patch(existing._id, payload)
      return existing._id
    }
    return await ctx.db.insert('product_cache', payload)
  },
})

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const existing = await ctx.db
      .query('product_cache')
      .filter((q) => q.eq(q.field('key'), key))
      .first()
    return existing || null
  },
})
