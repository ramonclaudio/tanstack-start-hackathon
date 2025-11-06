import { v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import { query } from './_generated/server'

/**
 * Demos table - Read-only demo data
 * Shows example tasks in the API request demo
 */

export const get = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id('demos'),
        _creationTime: v.number(),
        text: v.string(),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    return await ctx.db.query('demos').paginate(args.paginationOpts)
  },
})
