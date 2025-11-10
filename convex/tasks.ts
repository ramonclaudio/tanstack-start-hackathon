import { ConvexError, v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import { mutation, query } from './_generated/server'
import {
  getQueryMetrics,
  paginationResultValidator,
  resetQueryTracking,
  taskValidator,
  trackDbCall,
  validateText,
} from './lib/validators'
import { generateCorrelationId } from './lib/logger'

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
    const correlationId = generateCorrelationId()
    resetQueryTracking()

    try {
      // Use index when filtering by completion status
      const q =
        args.completed !== undefined
          ? ctx.db
              .query('tasks')
              .withIndex('by_completed', (idx) =>
                idx.eq('completed', args.completed!),
              )
          : ctx.db.query('tasks')

      trackDbCall(50) // Estimate: pagination can scan up to 50 docs

      const result = await q.order('desc').paginate(args.paginationOpts)

      // Log metrics
      const metrics = getQueryMetrics()

      if (metrics.dbCalls > 10) {
        // eslint-disable-next-line no-console
        console.warn('[Performance] High db call count detected', {
          correlationId,
          function: 'tasks.list',
          ...metrics,
        })
      }

      return result
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Query Error]', {
        correlationId,
        function: 'tasks.list',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
})

/**
 * Query: Get single task by ID
 */
export const get = query({
  args: { id: v.id('tasks') },
  returns: v.union(taskValidator, v.null()),
  handler: async (ctx, args) => {
    const correlationId = generateCorrelationId()
    resetQueryTracking()

    try {
      trackDbCall(1) // Single document read

      const result = await ctx.db.get(args.id)
      return result
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Query Error]', {
        correlationId,
        function: 'tasks.get',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
})

/**
 * Mutation: Create new task
 */
export const create = mutation({
  args: { text: v.string() },
  returns: v.id('tasks'),
  handler: async (ctx, args) => {
    const correlationId = generateCorrelationId()

    try {
      const text = validateText(args.text, {
        fieldName: 'Task text',
        maxLength: 500,
      })

      const taskId = await ctx.db.insert('tasks', {
        text,
        completed: false,
      })

      return taskId
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Mutation Error]', {
        correlationId,
        function: 'tasks.create',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
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
    const correlationId = generateCorrelationId()

    try {
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
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Mutation Error]', {
        correlationId,
        function: 'tasks.update',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
})

/**
 * Mutation: Delete task
 */
export const remove = mutation({
  args: { id: v.id('tasks') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const correlationId = generateCorrelationId()

    try {
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
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Mutation Error]', {
        correlationId,
        function: 'tasks.remove',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
})
