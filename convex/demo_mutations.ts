import { v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import { mutation, query } from './_generated/server'
import { validateText } from './lib/validators'
import { NotFoundError } from './lib/errors'

export const get = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db.query('demo_mutations').paginate(args.paginationOpts)
  },
})

export const add = mutation({
  args: { text: v.string() },
  returns: v.id('demo_mutations'),
  handler: async (ctx, args) => {
    const text = validateText(args.text, { fieldName: 'Task text' })
    return await ctx.db.insert('demo_mutations', { text })
  },
})

export const remove = mutation({
  args: { id: v.id('demo_mutations') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new NotFoundError('Item')
    }
    await ctx.db.delete(args.id)
    return null
  },
})
