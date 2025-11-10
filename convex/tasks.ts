import { ConvexError, v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import { mutation, query } from './_generated/server'
import {
  paginationResultValidator,
  taskValidator,
  validateText,
} from './lib/validators'

/**
 * Query: Get paginated tasks
 * Optionally filter by completion status
 */
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    completed: v.optional(v.boolean()),
  },
  returns: paginationResultValidator(taskValidator),
  handler: async (ctx, args) => {
    // Use index when filtering by completion status
    const q =
      args.completed !== undefined
        ? ctx.db
            .query('tasks')
            .withIndex('by_completed', (idx) =>
              idx.eq('completed', args.completed!),
            )
        : ctx.db.query('tasks')

    return await q.order('desc').paginate(args.paginationOpts)
  },
})

/**
 * Query: Get single task by ID
 */
export const get = query({
  args: { id: v.id('tasks') },
  returns: v.union(taskValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

/**
 * Mutation: Create new task
 */
export const create = mutation({
  args: { text: v.string() },
  returns: v.id('tasks'),
  handler: async (ctx, args) => {
    const text = validateText(args.text, {
      fieldName: 'Task text',
      maxLength: 500,
    })

    return await ctx.db.insert('tasks', {
      text,
      completed: false,
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
  returns: v.null(),
  handler: async (ctx, args) => {
    // Fast-fail input validation before db operations
    const updates: Partial<{
      text: string
      completed: boolean
    }> = {}

    if (args.text !== undefined) {
      updates.text = validateText(args.text, {
        fieldName: 'Task text',
        maxLength: 500,
      })
    }

    if (args.completed !== undefined) {
      updates.completed = args.completed
    }

    // Now check existence (slower db call)
    const existing = await ctx.db.get(args.id)

    if (!existing) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Task not found',
        resource: 'tasks',
      })
    }

    await ctx.db.patch(args.id, updates)
    return null
  },
})

/**
 * Mutation: Delete task
 */
export const remove = mutation({
  args: { id: v.id('tasks') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)

    if (!existing) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Task not found',
        resource: 'tasks',
      })
    }

    await ctx.db.delete(args.id)
    return null
  },
})
