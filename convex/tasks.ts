import { v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import { mutation, query } from './_generated/server'
import { validateText } from './lib/validators'
import { NotFoundError } from './lib/errors'

/**
 * Query: Get paginated tasks
 * Optionally filter by completion status
 */
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query('tasks')

    // Filter by completion status if specified
    if (args.completed !== undefined) {
      q = q.filter((filter) =>
        filter.eq(filter.field('completed'), args.completed),
      )
    }

    return await q.order('desc').paginate(args.paginationOpts)
  },
})

/**
 * Query: Get single task by ID
 */
export const get = query({
  args: { id: v.id('tasks') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

/**
 * Mutation: Create new task
 */
export const create = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const text = validateText(args.text, {
      fieldName: 'Task text',
      maxLength: 500,
    })

    const now = Date.now()
    return await ctx.db.insert('tasks', {
      text,
      completed: false,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/**
 * Mutation: Update task text or completion status
 */
export const update = mutation({
  args: {
    id: v.id('tasks'),
    text: v.optional(v.string()),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)

    if (!existing) {
      throw new NotFoundError('Task')
    }

    const updates: Partial<{
      text: string
      completed: boolean
      updatedAt: number
    }> = {
      updatedAt: Date.now(),
    }

    if (args.text !== undefined) {
      updates.text = validateText(args.text, {
        fieldName: 'Task text',
        maxLength: 500,
      })
    }

    if (args.completed !== undefined) {
      updates.completed = args.completed
    }

    await ctx.db.patch(args.id, updates)
  },
})

/**
 * Mutation: Delete task
 */
export const remove = mutation({
  args: { id: v.id('tasks') },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)

    if (!existing) {
      throw new NotFoundError('Task')
    }

    await ctx.db.delete(args.id)
  },
})
