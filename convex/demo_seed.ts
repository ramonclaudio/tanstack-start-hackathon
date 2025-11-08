import { internalMutation } from './_generated/server'

export const seedDemoData = internalMutation({
  handler: async (ctx) => {
    const queries = await ctx.db.query('demo_queries').collect()
    const mutations = await ctx.db.query('demo_mutations').collect()

    if (queries.length === 0) {
      await Promise.all([
        ctx.db.insert('demo_queries', {
          text: 'Fetch user profile data',
        }),
        ctx.db.insert('demo_queries', {
          text: 'List all active subscriptions',
        }),
        ctx.db.insert('demo_queries', {
          text: 'Get recent activity logs',
        }),
      ])
    }

    if (mutations.length === 0) {
      await Promise.all([
        ctx.db.insert('demo_mutations', {
          text: 'Update user preferences',
        }),
        ctx.db.insert('demo_mutations', {
          text: 'Create new task',
        }),
        ctx.db.insert('demo_mutations', {
          text: 'Delete expired sessions',
        }),
      ])
    }

    return {
      queriesSeeded: queries.length === 0 ? 3 : 0,
      mutationsSeeded: mutations.length === 0 ? 3 : 0,
    }
  },
})

export const clearDemoData = internalMutation({
  handler: async (ctx) => {
    const queries = await ctx.db.query('demo_queries').collect()
    const mutations = await ctx.db.query('demo_mutations').collect()

    await Promise.all([
      ...queries.map((q) => ctx.db.delete(q._id)),
      ...mutations.map((m) => ctx.db.delete(m._id)),
    ])

    return {
      queriesDeleted: queries.length,
      mutationsDeleted: mutations.length,
    }
  },
})
