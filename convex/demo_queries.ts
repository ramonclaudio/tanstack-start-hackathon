import { paginationOptsValidator } from 'convex/server'
import { query } from './_generated/server'

export const get = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db.query('demo_queries').paginate(args.paginationOpts)
  },
})
