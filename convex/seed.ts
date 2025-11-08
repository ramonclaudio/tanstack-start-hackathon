import { mutation } from './_generated/server'

const QUERY_SAMPLES = [
  'Fetch user profile data',
  'Get latest product listings',
  'Retrieve dashboard analytics',
  'Load conversation history',
  'Query search results',
]

const MUTATION_SAMPLES = [
  'Create new user account',
  'Update profile settings',
  'Delete old messages',
  'Add item to cart',
  'Submit feedback form',
]

export const seedDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if tables already have data
    const existingQueries = await ctx.db.query('queries').take(1)
    const existingMutations = await ctx.db.query('mutations').take(1)

    if (existingQueries.length > 0 || existingMutations.length > 0) {
      throw new Error(
        'Database already seeded. Clear tables manually before re-seeding.',
      )
    }

    // Seed queries table
    for (const text of QUERY_SAMPLES) {
      await ctx.db.insert('queries', { text })
    }

    // Seed mutations table
    for (const text of MUTATION_SAMPLES) {
      await ctx.db.insert('mutations', { text })
    }

    return {
      queries: QUERY_SAMPLES.length,
      mutations: MUTATION_SAMPLES.length,
    }
  },
})

export const clearDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    const queries = await ctx.db.query('queries').collect()
    const mutations = await ctx.db.query('mutations').collect()

    for (const query of queries) {
      await ctx.db.delete(query._id)
    }

    for (const item of mutations) {
      await ctx.db.delete(item._id)
    }

    return {
      deletedQueries: queries.length,
      deletedMutations: mutations.length,
    }
  },
})
