import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema(
  {
    tasks: defineTable({
      text: v.string(),
      completed: v.boolean(),
    }).index('by_completed', ['completed']),
  },
  {
    schemaValidation: true,
    strictTableNameTypes: true,
  },
)
