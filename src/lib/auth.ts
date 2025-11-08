import { createAuthClient } from 'better-auth/react'
import { convexClient } from '@convex-dev/better-auth/client/plugins'
import { logger } from './logger'

const AUTH_PATHS = {
  SIGNIN: '/signin',
  SIGNUP: '/signup',
  SIGNOUT: '/signout',
} as const

const isAuthPath = (pathname: string): boolean =>
  Object.values(AUTH_PATHS).some((path) => pathname.includes(path))

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  plugins: [convexClient()],
  onRequest: (request: Request) => {
    const url = new URL(request.url)
    if (isAuthPath(url.pathname)) {
      logger.auth.debug('Auth request initiated', {
        method: request.method,
        path: url.pathname,
      })
    }
  },
  onResponse: (response: Response) => {
    const url = new URL(response.url)
    if (url.pathname.includes(AUTH_PATHS.SIGNIN)) {
      if (response.ok) {
        logger.auth.info('User signed in successfully')
      } else {
        logger.auth.warn('Sign in failed', { status: response.status })
      }
    } else if (url.pathname.includes(AUTH_PATHS.SIGNUP)) {
      if (response.ok) {
        logger.auth.info('User signed up successfully')
      } else {
        logger.auth.warn('Sign up failed', { status: response.status })
      }
    } else if (url.pathname.includes(AUTH_PATHS.SIGNOUT)) {
      if (response.ok) {
        logger.auth.info('User signed out successfully')
      }
    }
  },
  onError: (error: Error) => {
    logger.auth.error('Auth error', error)
  },
})

export const { signIn, signUp, signOut, useSession } = authClient
