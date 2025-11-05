import { query } from './_generated/server'
import { authComponent } from './auth'

/**
 * Simplified dashboard module - returns user data from Better Auth
 * For customer billing data, use Autumn's hooks directly in React
 */

export const getUser = query({
  args: {},
  handler: async (ctx) => {
    try {
      const user = await authComponent.getAuthUser(ctx)
      return {
        authenticated: true,
        user: {
          id: user.userId || user._id,
          name: user.name || '',
          email: user.email || '',
          image: user.image || null,
          createdAt: user.createdAt,
          emailVerified: Boolean(user.emailVerified),
          twoFactorEnabled: Boolean(user.twoFactorEnabled),
        },
      }
    } catch {
      return {
        authenticated: false,
        user: null,
      }
    }
  },
})
