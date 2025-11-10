import { ConvexError } from 'convex/values'
import { query } from './_generated/server'
import { authComponent } from './auth'
import { userResponseValidator } from './lib/validators'
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

      // Log error to Convex console (Sentry picks this up via log streaming)
      // DO NOT call captureException() in queries - breaks determinism
      // eslint-disable-next-line no-console
      console.error('[user.getUser] Unexpected error', {
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      })

      // Re-throw as ConvexError with structured payload
      throw new ConvexError({
        code: 'USER_FETCH_FAILED',
        message: 'Failed to fetch user information',
        error: e instanceof Error ? e.message : String(e),
      })
    }
  },
})
