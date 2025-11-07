import { v } from 'convex/values'
import { query } from './_generated/server'
import { getAuthUserOrNull, getUserId } from './lib/auth'

export const getUser = query({
  args: {},
  returns: v.union(
    v.object({
      authenticated: v.literal(false),
      user: v.null(),
    }),
    v.object({
      authenticated: v.literal(true),
      user: v.object({
        id: v.string(),
        name: v.string(),
        email: v.string(),
        image: v.union(v.string(), v.null()),
        createdAt: v.number(),
        emailVerified: v.boolean(),
        twoFactorEnabled: v.boolean(),
      }),
    }),
  ),
  handler: async (ctx) => {
    const user = await getAuthUserOrNull(ctx)
    if (!user) {
      return {
        authenticated: false as const,
        user: null,
      }
    }

    const id = getUserId(user)
    if (!id) {
      return {
        authenticated: false as const,
        user: null,
      }
    }

    return {
      authenticated: true as const,
      user: {
        id,
        name: user.name || '',
        email: user.email || '',
        image: user.image || null,
        createdAt: user.createdAt,
        emailVerified: Boolean(user.emailVerified),
        twoFactorEnabled: Boolean(user.twoFactorEnabled),
      },
    }
  },
})
