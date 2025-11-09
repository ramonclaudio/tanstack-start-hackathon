import { createAuthClient } from 'better-auth/react'
import { convexClient } from '@convex-dev/better-auth/client/plugins'
import { logger } from './logger'

// Better Auth endpoint segments (relative to baseURL)
const AUTH_PATHS = {
  SIGNIN: '/sign-in',
  SIGNUP: '/sign-up',
  SIGNOUT: '/sign-out',
} as const

const isAuthPath = (pathname: string): boolean =>
  Object.values(AUTH_PATHS).some((path) => pathname.includes(path))

// Get the base URL for auth - in dev it's localhost:3000, in prod it's the actual domain
const getAuthBaseURL = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return `${window.location.origin}/api/auth`
  }
  // Server-side SSR: use localhost for development
  return 'https://localhost:3000/api/auth'
}

export const authClient = createAuthClient({
  // Proxy Better Auth through our TanStack Start route handler
  baseURL: getAuthBaseURL(),
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
