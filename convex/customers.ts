import { v } from 'convex/values'
import { query } from './_generated/server'
import { getAuthUserOrNull } from './auth'

/**
 * Get user info for Autumn sync.
 * Note: Customer creation happens automatically through the Autumn identify function
 * when useCustomer() is called on the frontend.
 * This query just verifies the user is authenticated.
 */
export const getUserForAutumn = query({
  args: {},
  returns: v.union(
    v.object({
      authenticated: v.literal(false),
    }),
    v.object({
      authenticated: v.literal(true),
      customerId: v.string(),
      userData: v.object({
        name: v.string(),
        email: v.string(),
      }),
    }),
  ),
  handler: async (ctx) => {
    const user = await getAuthUserOrNull(ctx)
    if (!user) return { authenticated: false as const }

    const customerId = user.userId || user._id
    if (!customerId) return { authenticated: false as const }

    return {
      authenticated: true as const,
      customerId,
      userData: {
        name: user.name || '',
        email: user.email || '',
      },
    }
  },
})

/**
 * Get the current user's Autumn customer data
 */
export const getCurrentCustomer = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      customerId: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const user = await getAuthUserOrNull(ctx)
    if (!user) return null

    const customerId = user.userId || user._id
    if (!customerId) return null

    // Note: This will be handled by the useCustomer hook on the frontend
    // This query is mainly for server-side access if needed
    return { customerId }
  },
})
