import { v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import { mutation, query } from './_generated/server'

export const get = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db.query('tasks').paginate(args.paginationOpts)
  },
})

export const add = mutation({
  args: { text: v.string() },
  returns: v.id('tasks'),
  handler: async (ctx, args) => {
    const trimmed = args.text.trim()
    if (!trimmed) {
      throw new Error('Task text cannot be empty')
    }
    if (trimmed.length > 10000) {
      throw new Error('Task text exceeds maximum length of 10000 characters')
    }
    return await ctx.db.insert('tasks', { text: trimmed })
  },
})

export const remove = mutation({
  args: { id: v.id('tasks') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  },
})
