/**
 * Sentry integration for Convex error reporting
 * Handles exception reporting for production monitoring
 */

import { ConvexError } from 'convex/values'

const SENTRY_DSN = process.env['SENTRY_DSN']
const IS_PRODUCTION = Boolean(process.env['VITE_CONVEX_URL'])

interface SentryEvent {
  message: string
  level: 'error' | 'warning' | 'info'
  tags?: Record<string, string>
  extra?: Record<string, unknown>
  error?: Error
}

/**
 * Report exception to Sentry
 * Only reports in production to avoid wasting quota
 * Falls back to console.error in development
 */
export async function captureException(
  error: Error,
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, unknown>
    level?: 'error' | 'warning'
  },
): Promise<void> {
  // Extract ConvexError.data if present for structured logging
  const errorData =
    error instanceof ConvexError ? { convexErrorData: error.data } : {}

  // Always log to Convex console for native log streaming
  // eslint-disable-next-line no-console
  console.error('[Sentry]', error.message, {
    error: error.stack,
    ...errorData,
    ...context?.extra,
  })

  // Skip Sentry reporting in development to save quota
  if (!IS_PRODUCTION) {
    // eslint-disable-next-line no-console
    console.warn(
      '[Sentry] Skipping report (development mode). Error logged above.',
    )
    return
  }

  if (!SENTRY_DSN) {
    // eslint-disable-next-line no-console
    console.warn(
      'SENTRY_DSN not configured. Set it in Convex environment variables.',
    )
    return
  }

  try {
    const event: SentryEvent = {
      message: error.message,
      level: context?.level ?? 'error',
      tags: {
        environment: IS_PRODUCTION ? 'production' : 'development',
        // Add error code as tag for ConvexError
        ...(error instanceof ConvexError &&
        typeof error.data === 'object' &&
        error.data !== null &&
        'code' in error.data
          ? { error_code: String(error.data.code) }
          : {}),
        ...context?.tags,
      },
      extra: {
        ...context?.extra,
        // Include full ConvexError payload in extra data
        ...errorData,
      },
      error,
    }

    // Send to Sentry via HTTP (Convex doesn't support Sentry SDK directly)
    const response = await fetch(
      `https://sentry.io/api/0/projects/${extractProjectId(SENTRY_DSN)}/events/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': buildSentryAuth(SENTRY_DSN),
        },
        body: JSON.stringify({
          message: event.message,
          level: event.level,
          tags: event.tags,
          extra: event.extra,
          exception: {
            values: [
              {
                type: error.name,
                value: error.message,
                stacktrace: error.stack
                  ? { frames: parseStackTrace(error.stack) }
                  : undefined,
              },
            ],
          },
        }),
      },
    )

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error('Failed to send event to Sentry:', response.statusText)
    }
  } catch (sentryError) {
    // Don't let Sentry errors break application logic
    // eslint-disable-next-line no-console
    console.error('Sentry reporting failed:', sentryError)
  }
}

/**
 * Report HTTP-level errors to Sentry
 * Used for errors that don't throw exceptions (CORS, etc.)
 */
export async function captureHttpError(
  errorCode: string,
  message: string,
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, unknown>
    level?: 'error' | 'warning' | 'info'
  },
): Promise<void> {
  // Log to Convex console
  // eslint-disable-next-line no-console
  console.error(`[Sentry HTTP] ${errorCode}: ${message}`, context?.extra)

  if (!IS_PRODUCTION || !SENTRY_DSN) return

  try {
    const response = await fetch(
      `https://sentry.io/api/0/projects/${extractProjectId(SENTRY_DSN)}/events/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': buildSentryAuth(SENTRY_DSN),
        },
        body: JSON.stringify({
          message: `[${errorCode}] ${message}`,
          level: context?.level ?? 'error',
          tags: {
            environment: IS_PRODUCTION ? 'production' : 'development',
            error_code: errorCode,
            error_type: 'http',
            ...context?.tags,
          },
          extra: context?.extra,
        }),
      },
    )

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error('Failed to send HTTP error to Sentry:', response.statusText)
    }
  } catch (sentryError) {
    // eslint-disable-next-line no-console
    console.error('Sentry HTTP error reporting failed:', sentryError)
  }
}

/**
 * Extract project ID from Sentry DSN
 */
function extractProjectId(dsn: string): string {
  const match = dsn.match(/\/(\d+)$/)
  if (!match?.[1]) {
    throw new Error('Invalid Sentry DSN: missing project ID')
  }
  return match[1]
}

/**
 * Build Sentry auth header
 */
function buildSentryAuth(dsn: string): string {
  const publicKey = dsn.match(/\/\/(.+?)@/)?.[1] ?? ''
  return `Sentry sentry_version=7, sentry_key=${publicKey}`
}

/**
 * Parse stack trace into Sentry format
 */
function parseStackTrace(stack: string): Array<{
  filename: string
  function: string
  lineno?: number
}> {
  return stack
    .split('\n')
    .slice(1)
    .map((line) => {
      const match = line.match(/at (.+?) \((.+?):(\d+)/)
      return {
        function: match?.[1] ?? 'unknown',
        filename: match?.[2] ?? 'unknown',
        lineno: match?.[3] ? parseInt(match[3], 10) : undefined,
      }
    })
}
