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
  handler: async (ctx, args) => {
    return await ctx.db.query('demos').paginate(args.paginationOpts)
  },
})
