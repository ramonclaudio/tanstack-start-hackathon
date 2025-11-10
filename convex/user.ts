import { ConvexError } from 'convex/values'
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

      // Always use document ID (_id) as the canonical user identifier
      const id = user._id
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
      // Better Auth throws Error with message 'Unauthenticated'
      // This is expected when user is not logged in
      if (e instanceof Error && e.message === 'Unauthenticated') {
        return {
          authenticated: false as const,
          user: null,
        }
      }

      // Unexpected error - report to Sentry (fire-and-forget, not transactional)
      if (e instanceof Error) {
        captureException(e, {
          tags: { function: 'user.getUser' },
          extra: { context: 'Failed to fetch authenticated user' },
        }).catch(() => {
          // Ignore Sentry failures - queries must be deterministic
        })
      }

      // Re-throw as ConvexError with structured payload
      throw new ConvexError({
        code: 'USER_FETCH_FAILED',
        message: 'Failed to fetch user information',
        error: e instanceof Error ? e.message : String(e),
      })
    }
  },
})
