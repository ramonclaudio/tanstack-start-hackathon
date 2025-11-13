import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema(
  {
    tasks: defineTable({
      text: v.string(),
      completed: v.boolean(),
    }).index('by_completed', ['completed']),

    reports: defineTable({
      userId: v.string(), // Better Auth user ID
      provider: v.string(), // 'coderabbit' | 'sentry' | etc
      fromTimestamp: v.number(), // Unix timestamp (ms)
      toTimestamp: v.number(), // Unix timestamp (ms)
      fromDate: v.string(), // ISO 8601 date (YYYY-MM-DD) - display only
      toDate: v.string(), // ISO 8601 date (YYYY-MM-DD) - display only
      promptTemplate: v.optional(v.string()),
      prompt: v.optional(v.string()),
      groupBy: v.optional(v.string()),
      results: v.array(
        v.object({
          group: v.string(),
          report: v.string(),
        }),
      ),
      status: v.union(
        v.literal('pending'),
        v.literal('completed'),
        v.literal('failed'),
      ),
      error: v.optional(v.string()),
      durationMs: v.optional(v.number()),
    })
      .index('by_user', ['userId'])
      .index('by_user_and_provider', ['userId', 'provider'])
      .index('by_user_and_date', ['userId', 'fromTimestamp', 'toTimestamp'])
      .index('by_status', ['status']),
  },
  {
    schemaValidation: true,
    strictTableNameTypes: true,
  },
)
