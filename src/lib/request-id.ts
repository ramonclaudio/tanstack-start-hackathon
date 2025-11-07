/**
 * Request ID generation and tracking for debugging and monitoring
 */

import { nanoid } from 'nanoid'

/**
 * Generate a unique request ID
 * Format: timestamp-random (e.g., "1704067200000-V1StGXR8Z5jdHi6B")
 */
export function generateRequestId(): string {
  return `${Date.now()}-${nanoid(16)}`
}

/**
 * Extract request ID from headers or generate a new one
 */
export function getOrGenerateRequestId(headers: Headers): string {
  // Check for existing request ID in various common headers
  const existingId =
    headers.get('x-request-id') ||
    headers.get('x-correlation-id') ||
    headers.get('x-trace-id')

  return existingId || generateRequestId()
}

/**
 * Add request ID to response headers
 */
export function addRequestIdToResponse(
  response: Response,
  requestId: string,
): Response {
  const newHeaders = new Headers(response.headers)
  newHeaders.set('x-request-id', requestId)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}

/**
 * Create a context object with request ID for logging
 */
export interface RequestContext {
  requestId: string
  method: string
  url: string
  timestamp: number
  userAgent?: string
  ip?: string
}

/**
 * Extract request context for logging
 */
export function getRequestContext(
  request: Request,
  requestId: string,
): RequestContext {
  const url = new URL(request.url)

  return {
    requestId,
    method: request.method,
    url: url.pathname + url.search,
    timestamp: Date.now(),
    userAgent: request.headers.get('user-agent') || undefined,
    ip:
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      undefined,
  }
}

/**
 * Format log message with request context
 */
export function logWithContext(
  level: 'info' | 'warn' | 'error',
  message: string,
  context: RequestContext,
  additionalData?: Record<string, unknown>,
): void {
  const timestamp = new Date(context.timestamp).toISOString()
  const logData = {
    timestamp,
    level,
    requestId: context.requestId,
    method: context.method,
    url: context.url,
    message,
    ...additionalData,
  }

  // In production, you might send this to a logging service
  // For now, we'll use console with structured output
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${context.requestId}] ${message}`

  switch (level) {
    case 'error':
      console.error(logMessage, logData)
      break
    case 'warn':
      console.warn(logMessage, logData)
      break
    case 'info':
    default:
      console.log(logMessage, logData)
      break
  }
}

/**
 * Middleware to track request duration
 */
export function trackRequestDuration(context: RequestContext): () => number {
  const startTime = Date.now()

  return () => {
    const duration = Date.now() - startTime
    logWithContext('info', `Request completed in ${duration}ms`, context, {
      duration,
      status: 'completed',
    })
    return duration
  }
}
