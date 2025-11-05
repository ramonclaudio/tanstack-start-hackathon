import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Demo tables
  tasks: defineTable({
    text: v.string(),
  }),

  demos: defineTable({
    text: v.string(),
  }),
})
