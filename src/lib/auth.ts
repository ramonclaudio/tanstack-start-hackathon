import { createAuthClient } from 'better-auth/react'
import { convexClient } from '@convex-dev/better-auth/client/plugins'
import { logger } from './logger'
import { validateClientEnv } from './env'

const clientEnv = validateClientEnv()

const AUTH_PATHS = {
  SIGNIN: '/sign-in',
  SIGNUP: '/sign-up',
  SIGNOUT: '/sign-out',
} as const

type AuthPathKey = keyof typeof AUTH_PATHS

const isAuthPath = (pathname: string): AuthPathKey | null => {
  for (const [key, path] of Object.entries(AUTH_PATHS)) {
    if (pathname.includes(path)) {
      return key as AuthPathKey
    }
  }
  return null
}

const getAuthBaseURL = (): string => {
  // Client-side: use current origin
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const origin = window.location.origin
      // Validate origin is a proper URL
      new URL(origin)
      return `${origin}/api/auth`
    } catch (error) {
      logger.security.error('Invalid window.location.origin', error)
      throw new Error('Failed to determine auth base URL: invalid origin')
    }
  }

  // Server-side: use VITE_PUBLIC_CONVEX_SITE_URL or fallback to dev default
  const siteUrl = clientEnv.VITE_PUBLIC_CONVEX_SITE_URL
  if (siteUrl) {
    return `${siteUrl}/api/auth`
  }

  // Development fallback
  if (clientEnv.DEV) {
    return 'http://localhost:3000/api/auth'
  }

  throw new Error(
    'Failed to determine auth base URL: VITE_PUBLIC_CONVEX_SITE_URL not set',
  )
}

const logAuthResponse = async (
  response: Response,
  pathKey: AuthPathKey,
): Promise<void> => {
  try {
    if (response.ok) {
      const actions = {
        SIGNIN: 'signed in',
        SIGNUP: 'signed up',
        SIGNOUT: 'signed out',
      }
      logger.auth.info(`User ${actions[pathKey]} successfully`)
    } else {
      // Clone response to read body without consuming it
      const clone = response.clone()
      let errorBody: unknown
      try {
        errorBody = await clone.json()
      } catch {
        errorBody = await clone.text()
      }

      const actions = {
        SIGNIN: 'Sign in',
        SIGNUP: 'Sign up',
        SIGNOUT: 'Sign out',
      }
      logger.auth.warn(`${actions[pathKey]} failed`, {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      })
    }
  } catch (error) {
    // Logging failed, don't break auth flow
    logger.security.error('Failed to log auth response', error)
  }
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
  plugins: [convexClient()],
  onRequest: (request: Request) => {
    try {
      const url = new URL(request.url)
      const pathKey = isAuthPath(url.pathname)
      if (pathKey) {
        logger.auth.debug('Auth request initiated', {
          method: request.method,
          path: url.pathname,
          action: pathKey,
        })
      }
    } catch (error) {
      // Don't break auth flow if logging fails
      logger.security.error('Failed to log auth request', error)
    }
  },
  onResponse: (response: Response) => {
    try {
      const url = new URL(response.url)
      const pathKey = isAuthPath(url.pathname)
      if (pathKey) {
        // Fire-and-forget async logging (don't await)
        void logAuthResponse(response, pathKey)
      }
    } catch (error) {
      // Don't break auth flow if logging fails
      logger.security.error('Failed to process auth response', error)
    }
  },
  onError: (error: Error) => {
    try {
      logger.auth.error('Auth error', error)
    } catch (logError) {
      // Last resort: don't break auth flow even if error logging fails

      console.error('Critical: Failed to log auth error', logError, error)
    }
  },
})

export const { signIn, signUp, signOut, useSession } = authClient
