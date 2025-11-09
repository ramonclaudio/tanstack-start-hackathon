import { v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import { mutation, query } from './_generated/server'
import { validateText } from './lib/validators'
import { NotFoundError } from './lib/errors'

const taskValidator = v.object({
  _id: v.id('tasks'),
  _creationTime: v.number(),
  text: v.string(),
  completed: v.optional(v.boolean()),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
})

const paginatedTasksValidator = v.object({
  page: v.array(taskValidator),
  isDone: v.boolean(),
  continueCursor: v.union(v.string(), v.null()),
  pageStatus: v.optional(v.union(v.string(), v.null())),
  splitCursor: v.optional(v.union(v.string(), v.null())),
})

/**
 * Query: Get paginated tasks
 * Optionally filter by completion status and user
 */
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    completed: v.optional(v.boolean()),
  },
  returns: paginatedTasksValidator,
  handler: async (ctx, args) => {
    // Get all tasks - no user filtering for demo purposes
    const tasks = await ctx.db
      .query('tasks')
      .order('asc')
      .paginate(args.paginationOpts)

    // Filter by completion status if provided
    if (args.completed !== undefined) {
      return {
        ...tasks,
        page: tasks.page.filter((task) => task.completed === args.completed),
      }
    }

    return tasks
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
  returns: v.null(),
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
      throw new NotFoundError('Task')
    }
    await ctx.db.delete(args.id)
    return null
  },
})

/**
 * Mutation: Toggle task completion status
 */
export const toggle = mutation({
  args: { id: v.id('tasks') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new NotFoundError('Task')
    }
    await ctx.db.patch(args.id, {
      completed: !existing.completed,
      updatedAt: Date.now(),
    })
    return null
  },
})
