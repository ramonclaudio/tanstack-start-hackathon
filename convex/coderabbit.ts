import { ConvexError, v } from 'convex/values'
import { action, internalMutation, mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import { createCodeRabbitClient } from './lib/coderabbitClient'
import {
  reportGenerateRequestValidator,
  reportResultValidator,
  validateDateRange,
} from './lib/coderabbitValidators'
import { authComponent } from './auth'
import type { Id } from './_generated/dataModel'

/**
 * Generate developer activity report using CodeRabbit API and store in database
 *
 * This action wraps the CodeRabbit report.generate endpoint.
 * The API may take up to 10 minutes to respond depending on data volume.
 *
 * @returns Stored report document with results
 */
export const generateAndSaveReport = action({
  args: reportGenerateRequestValidator,
  returns: v.id('reports'),
  handler: async (ctx, args): Promise<Id<'reports'>> => {
    // Require authentication
    const user = await authComponent.getAuthUser(ctx)
    if (!user._id) {
      throw new ConvexError({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required to generate reports',
      })
    }

    // Validate date range
    validateDateRange(args.from, args.to)

    // Convert ISO dates to timestamps for efficient querying
    const fromDate = new Date(args.from)
    const toDate = new Date(args.to)
    fromDate.setHours(0, 0, 0, 0)
    toDate.setHours(23, 59, 59, 999)

    // Create pending report inline
    const reportId: Id<'reports'> = await ctx.runMutation(
      internal.coderabbit.createPendingReportInternal,
      {
        userId: user._id,
        provider: 'coderabbit',
        fromDate: args.from,
        toDate: args.to,
        fromTimestamp: fromDate.getTime(),
        toTimestamp: toDate.getTime(),
        prompt: args.prompt,
        promptTemplate: args.promptTemplate,
        groupBy: args.groupBy,
      },
    )

    const startTime = Date.now()

    try {
      // Generate report via API
      const client = createCodeRabbitClient()
      const results = await client.generateReport(args)

      const durationMs = Date.now() - startTime

      // Update with results
      await ctx.runMutation(internal.coderabbit.updateReportSuccessInternal, {
        reportId,
        results,
        durationMs,
      })

      return reportId
    } catch (error) {
      const durationMs = Date.now() - startTime

      // Update with error (store failed reports for user visibility)
      await ctx.runMutation(internal.coderabbit.updateReportFailureInternal, {
        reportId,
        error: error instanceof Error ? error.message : String(error),
        durationMs,
      })

      // Re-throw error to show as alert in UI
      throw error
    }
  },
})

/**
 * Create pending report record (internal only)
 */
export const createPendingReportInternal = internalMutation({
  args: {
    userId: v.string(),
    provider: v.string(),
    fromDate: v.string(),
    toDate: v.string(),
    fromTimestamp: v.number(),
    toTimestamp: v.number(),
    prompt: v.optional(v.string()),
    promptTemplate: v.optional(v.string()),
    groupBy: v.optional(v.string()),
  },
  returns: v.id('reports'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('reports', {
      userId: args.userId,
      provider: args.provider,
      fromDate: args.fromDate,
      toDate: args.toDate,
      fromTimestamp: args.fromTimestamp,
      toTimestamp: args.toTimestamp,
      prompt: args.prompt,
      promptTemplate: args.promptTemplate,
      groupBy: args.groupBy,
      results: [],
      status: 'pending',
    })
  },
})

/**
 * Update report with success (internal only)
 */
export const updateReportSuccessInternal = internalMutation({
  args: {
    reportId: v.id('reports'),
    results: v.array(reportResultValidator),
    durationMs: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reportId, {
      results: args.results,
      status: 'completed',
      durationMs: args.durationMs,
    })
  },
})

/**
 * Update report with failure (internal only)
 */
export const updateReportFailureInternal = internalMutation({
  args: {
    reportId: v.id('reports'),
    error: v.string(),
    durationMs: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reportId, {
      status: 'failed',
      error: args.error,
      durationMs: args.durationMs,
      results: [],
    })
  },
})

/**
 * Get report by ID
 */
export const getReport = query({
  args: { reportId: v.id('reports') },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user._id) return null

    const report = await ctx.db.get(args.reportId)
    if (!report || report.userId !== user._id) return null

    return report
  },
})

/**
 * List user's reports (paginated)
 */
export const listReports = query({
  args: {
    provider: v.optional(v.string()),
    paginationOpts: v.optional(
      v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }),
    ),
  },
  handler: async (ctx, args) => {
    let user
    try {
      user = await authComponent.getAuthUser(ctx)
    } catch {
      // User not authenticated, return empty results
      return { page: [], isDone: true, continueCursor: '' }
    }

    if (!user._id) return { page: [], isDone: true, continueCursor: '' }

    // If provider filter specified, use by_user_and_provider index
    if (args.provider) {
      const provider = args.provider
      return await ctx.db
        .query('reports')
        .withIndex('by_user_and_provider', (q) =>
          q.eq('userId', user._id).eq('provider', provider),
        )
        .order('desc')
        .paginate(args.paginationOpts ?? { numItems: 10, cursor: null })
    }

    // Otherwise return all reports for user
    return await ctx.db
      .query('reports')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .paginate(args.paginationOpts ?? { numItems: 10, cursor: null })
  },
})

/**
 * Delete report by ID
 */
export const deleteReport = mutation({
  args: { reportId: v.id('reports') },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user._id) {
      throw new ConvexError({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      })
    }

    const report = await ctx.db.get(args.reportId)
    if (!report) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Report not found',
      })
    }

    if (report.userId !== user._id) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Not authorized to delete this report',
      })
    }

    await ctx.db.delete(args.reportId)
  },
})

/**
 * Check if CodeRabbit integration is configured
 *
 * @returns Boolean indicating if API key is set
 */
export const isConfigured = query({
  args: {},
  returns: v.boolean(),
  handler: (_ctx) => {
    const client = createCodeRabbitClient()
    return client.isConfigured()
  },
})

/**
 * Cleanup stale pending reports (internal only, called by cron)
 * Reports stuck in "pending" for more than 15 minutes are marked as failed
 */
export const cleanupStalePendingReports = internalMutation({
  args: {},
  handler: async (ctx) => {
    const STALE_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
    const cutoffTime = Date.now() - STALE_TIMEOUT_MS

    // Find all pending reports older than cutoff
    const staleReports = await ctx.db
      .query('reports')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .filter((q) => q.lt(q.field('_creationTime'), cutoffTime))
      .collect()

    // Mark stale reports as failed
    for (const report of staleReports) {
      await ctx.db.patch(report._id, {
        status: 'failed',
        error: 'Report generation timed out after 15 minutes',
        results: [],
      })
    }

    return { cleaned: staleReports.length }
  },
})
