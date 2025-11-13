import { redirect } from '@tanstack/react-router'
import { authClient } from '@/lib/auth'
import { logger } from '@/lib/logger'

type Session = typeof authClient.$Infer.Session
type User = Session['user']

const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const MAX_AUTH_ATTEMPTS = 10

const authAttempts = new Map<string, { count: number; resetAt: number }>()

function isValidRedirectPath(path: string): boolean {
  try {
    const url = new URL(path, 'http://localhost')

    // Must be same origin (relative path)
    if (url.origin !== 'http://localhost') {
      return false
    }

    // Must start with /
    if (!url.pathname.startsWith('/')) {
      return false
    }

    // Must not be auth pages (prevent redirect loops)
    if (url.pathname.startsWith('/auth/')) {
      return false
    }

    return true
  } catch {
    return false
  }
}

function getSafeRedirect(requestedPath: string, fallback: string): string {
  if (isValidRedirectPath(requestedPath)) {
    return requestedPath
  }

  logger.security.warn('Invalid redirect path blocked', {
    requested: requestedPath,
    fallback,
  })

  return fallback
}

function trackAuthAttempt(identifier: string): boolean {
  const now = Date.now()
  const record = authAttempts.get(identifier)

  if (!record || now > record.resetAt) {
    authAttempts.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })
    return true
  }

  if (record.count >= MAX_AUTH_ATTEMPTS) {
    logger.security.warn('Rate limit exceeded for auth attempts', {
      identifier,
      attempts: record.count,
    })
    return false
  }

  record.count++
  return true
}

function isSessionExpired(
  error: { status: number; statusText: string } | null,
): boolean {
  return error?.status === 401 || error?.status === 403
}

export async function requireAuth(location: { href: string }): Promise<User> {
  const identifier = `auth:${location.href}`

  if (!trackAuthAttempt(identifier)) {
    logger.security.error(
      'Rate limit exceeded, blocking auth check',
      undefined,
      {
        location: location.href,
      },
    )
    throw redirect({ to: '/auth/sign-in' })
  }

  try {
    const { data: session, error } = await authClient.getSession()

    if (error) {
      const expired = isSessionExpired(error)

      logger.auth.warn('Session validation failed', {
        location: location.href,
        expired,
        status: error.status,
      })

      throw redirect({
        to: '/auth/sign-in',
        search: {
          redirect: getSafeRedirect(location.href, '/dashboard'),
          reason: expired ? 'expired' : 'error',
        },
      })
    }

    if (!session?.user) {
      logger.auth.info('Unauthenticated access attempt blocked', {
        location: location.href,
      })

      throw redirect({
        to: '/auth/sign-in',
        search: { redirect: getSafeRedirect(location.href, '/dashboard') },
      })
    }

    logger.auth.debug('Auth check passed', {
      userId: session.user.id,
      location: location.href,
    })

    return session.user
  } catch (error) {
    // If it's already a redirect, re-throw
    if (error && typeof error === 'object' && 'to' in error) {
      throw error
    }

    // Unexpected error
    logger.auth.error('Auth check failed with unexpected error', error, {
      location: location.href,
    })

    throw redirect({ to: '/auth/sign-in' })
  }
}

export async function requireGuest(options?: {
  defaultRedirect?: string
  location?: { href: string }
}): Promise<void> {
  const defaultRedirect = options?.defaultRedirect ?? '/dashboard'
  const locationHref = options?.location?.href ?? defaultRedirect

  try {
    const { data: session, error } = await authClient.getSession()

    if (error) {
      // Session fetch error, but guest access is allowed
      // Suppress 429 rate limit logs during development hot reloads
      if (error.status !== 429) {
        logger.auth.debug(
          'Guest access check: session fetch error (allowing)',
          {
            status: error.status,
          },
        )
      }
      return
    }

    if (session?.user) {
      const safeRedirect = getSafeRedirect(
        options?.defaultRedirect ?? '/dashboard',
        '/dashboard',
      )

      logger.auth.info('Authenticated user redirected from guest page', {
        userId: session.user.id,
        from: locationHref,
        to: safeRedirect,
      })

      throw redirect({ to: safeRedirect })
    }

    // Guest access allowed (no log needed - expected behavior)
  } catch (error) {
    // If it's already a redirect, re-throw
    if (error && typeof error === 'object' && 'to' in error) {
      throw error
    }

    // Unexpected error, allow guest access (fail open for guest pages)
    logger.auth.warn('Guest check failed with unexpected error (allowing)', {
      error: error instanceof Error ? error.message : String(error),
      location: locationHref,
    })
  }
}
