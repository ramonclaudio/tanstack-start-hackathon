import { v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import { mutation, query } from './_generated/server'

/**
 * Tasks table - Interactive CRUD operations
 * Used in the server functions demo for adding/removing tasks
 */

export const get = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id('tasks'),
        _creationTime: v.number(),
        text: v.string(),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    return await ctx.db.query('tasks').paginate(args.paginationOpts)
  },
})

export const add = mutation({
  args: { text: v.string() },
  returns: v.id('tasks'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('tasks', {
      text: args.text,
    })
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
