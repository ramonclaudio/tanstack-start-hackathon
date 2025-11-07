import { createAuthClient } from 'better-auth/react'
import { convexClient } from '@convex-dev/better-auth/client/plugins'
import { logger } from './logger'

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  plugins: [convexClient()],
  onRequest: (request: Request) => {
    // Only log important auth requests (signin, signup, signout)
    const url = new URL(request.url)
    if (
      url.pathname.includes('/signin') ||
      url.pathname.includes('/signup') ||
      url.pathname.includes('/signout')
    ) {
      logger.auth.debug('Auth request initiated', {
        method: request.method,
        path: url.pathname,
      })
    }
  },
  onResponse: (response: Response) => {
    const url = new URL(response.url)
    // Log important auth events
    if (url.pathname.includes('/signin')) {
      if (response.ok) {
        logger.auth.info('User signed in successfully')
      } else {
        logger.auth.warn('Sign in failed', { status: response.status })
      }
    } else if (url.pathname.includes('/signup')) {
      if (response.ok) {
        logger.auth.info('User signed up successfully')
      } else {
        logger.auth.warn('Sign up failed', { status: response.status })
      }
    } else if (url.pathname.includes('/signout')) {
      if (response.ok) {
        logger.auth.info('User signed out successfully')
      }
    }
  },
  onSuccess: (_data: any) => {
    // Already logged in onResponse
  },
  onError: (error: Error) => {
    logger.auth.error('Auth error', error)
  },
})

export const { signIn, signUp, signOut, useSession } = authClient
