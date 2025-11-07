import { v } from 'convex/values'
import { query } from './_generated/server'
import { getAuthUserOrNull } from './auth'

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

    return { customerId }
  },
})
