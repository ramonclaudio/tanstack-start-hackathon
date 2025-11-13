/**
 * Sentry error reporting for Convex (works on free plan)
 *
 * Convex Pro has built-in Sentry integration via Dashboard.
 * This implementation works for ALL plans (including free/self-hosted).
 *
 * Uses Sentry's ingestion endpoint directly - no SDK required.
 */

import { ConvexError } from 'convex/values'

const SENTRY_DSN = process.env['SENTRY_DSN']
const IS_PRODUCTION = !!process.env['CONVEX_URL']
const ENVIRONMENT = IS_PRODUCTION ? 'production' : 'development'

/**
 * Report exception to Sentry (MUTATIONS/ACTIONS only)
 * Logs to console + sends to Sentry if DSN configured
 *
 * DO NOT call from queries - breaks determinism
 */
export async function captureException(
  error: Error,
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, unknown>
    correlationId?: string
    functionName?: string
  },
): Promise<void> {
  const errorData =
    error instanceof ConvexError && typeof error.data === 'object'
      ? error.data
      : {}

  // Always log to console (Convex native log streaming)

  console.error('[Exception]', error.message, {
    error_type: error.name,
    error_message: error.message,
    stack: error.stack,
    correlation_id: context?.correlationId,
    function: context?.functionName,
    convex_error_data: errorData,
    ...context?.tags,
    ...context?.extra,
  })

  // Skip Sentry in development
  if (!IS_PRODUCTION || !SENTRY_DSN) {
    return
  }

  try {
    await sendToSentry({
      level: 'error',
      message: error.message,
      exception: {
        type: error.name,
        value: error.message,
        stacktrace: error.stack,
      },
      tags: {
        func: context?.functionName || 'unknown',
        environment: ENVIRONMENT,
        ...(errorData && typeof errorData === 'object' && 'code' in errorData
          ? { error_code: String(errorData.code) }
          : {}),
        ...context?.tags,
      },
      extra: {
        correlation_id: context?.correlationId,
        convex_error_data: errorData,
        ...context?.extra,
      },
    })
  } catch (sentryError) {
    // Don't let Sentry failures break app logic

    console.error('[Sentry] Failed to send exception:', sentryError)
  }
}

/**
 * Log HTTP errors (rate limits, server errors)
 * DO NOT use for CORS (too noisy)
 */
export async function captureHttpError(
  errorCode: string,
  message: string,
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, unknown>
    correlationId?: string
  },
): Promise<void> {
  console.error('[HTTP Error]', {
    error_code: errorCode,
    message,
    correlation_id: context?.correlationId,
    ...context?.tags,
    ...context?.extra,
  })

  if (!IS_PRODUCTION || !SENTRY_DSN) {
    return
  }

  try {
    await sendToSentry({
      level: 'error',
      message: `[${errorCode}] ${message}`,
      tags: {
        error_code: errorCode,
        error_type: 'http',
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        environment: IS_PRODUCTION ? 'production' : 'development',
        ...context?.tags,
      },
      extra: {
        correlation_id: context?.correlationId,
        ...context?.extra,
      },
    })
  } catch (sentryError) {
    console.error('[Sentry] Failed to send HTTP error:', sentryError)
  }
}

/**
 * Send event to Sentry ingestion endpoint
 * Uses envelope format (required for ingestion API)
 */
async function sendToSentry(event: {
  level: 'error' | 'warning' | 'info'
  message: string
  exception?: {
    type: string
    value: string
    stacktrace?: string
  }
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}): Promise<void> {
  if (!SENTRY_DSN) return

  const dsnUrl = new URL(SENTRY_DSN)
  const projectId = dsnUrl.pathname.split('/').filter(Boolean).pop()
  const publicKey = dsnUrl.username

  if (!projectId || !publicKey) {
    throw new Error('Invalid Sentry DSN format')
  }

  const timestamp = Date.now() / 1000
  const eventId = generateEventId()

  // Sentry envelope format
  const envelopeHeaders = JSON.stringify({
    event_id: eventId,
    sent_at: new Date().toISOString(),
  })

  const itemHeaders = JSON.stringify({
    type: 'event',
    content_type: 'application/json',
  })

  const eventPayload = JSON.stringify({
    event_id: eventId,
    timestamp,
    platform: 'node',
    level: event.level,
    message: event.message,
    server_name: 'convex',
    tags: event.tags,
    extra: event.extra,
    ...(event.exception && {
      exception: {
        values: [
          {
            type: event.exception.type,
            value: event.exception.value,
            stacktrace: event.exception.stacktrace
              ? parseStackTrace(event.exception.stacktrace)
              : undefined,
          },
        ],
      },
    }),
  })

  const envelope = `${envelopeHeaders}\n${itemHeaders}\n${eventPayload}`

  const response = await fetch(
    `${dsnUrl.protocol}//${dsnUrl.host}/api/${projectId}/envelope/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_timestamp=${timestamp}`,
      },
      body: envelope,
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Sentry API error: ${response.status} ${body}`)
  }
}

/**
 * Generate UUID for Sentry event ID
 */
function generateEventId(): string {
  return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, () =>
    ((Math.random() * 16) | 0).toString(16),
  )
}

/**
 * Parse stack trace into Sentry frame format
 */
function parseStackTrace(stack: string): {
  frames: Array<{ filename: string; function: string; lineno?: number }>
} {
  const frames = stack
    .split('\n')
    .slice(1)
    .map((line) => {
      const match = line.match(/at (.+?) \((.+?):(\d+)/)
      return {
        function: match?.[1]?.trim() || 'unknown',
        filename: match?.[2]?.trim() || 'unknown',
        lineno: match?.[3] ? parseInt(match[3], 10) : undefined,
      }
    })
    .filter((frame) => frame.filename !== 'unknown')

  return { frames }
}
