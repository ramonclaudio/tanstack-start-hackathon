import { query } from './_generated/server'
import { authComponent } from './auth'
import { userResponseValidator } from './lib/validators'
import { captureException } from './lib/sentry'
import type { UserResponse } from './lib/types'

export const getUser = query({
  args: {},
  returns: userResponseValidator,
  handler: async (ctx): Promise<UserResponse> => {
    try {
      const user = await authComponent.getAuthUser(ctx)

      const id = user.userId || user._id
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
          name: user.name ?? null,
          email: user.email,
          image: user.image ?? null,
          createdAt: user.createdAt,
          emailVerified: Boolean(user.emailVerified),
          twoFactorEnabled: Boolean(user.twoFactorEnabled),
        },
      }
    } catch (e) {
      // Handle Better Auth unauthenticated state (expected failure)
      if (e instanceof Error && e.message === 'Unauthenticated') {
        return {
          authenticated: false as const,
          user: null,
        }
      }

      // Report unexpected errors to Sentry
      if (e instanceof Error) {
        await captureException(e, {
          tags: { function: 'user.getUser' },
          extra: { context: 'Failed to fetch authenticated user' },
        })
      }

      throw e
    }
  },
})
