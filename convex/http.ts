import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { authComponent, createAuth } from './auth'
import { captureHttpError } from './lib/sentry'

const http = httpRouter()

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env['SITE_URL'],
  process.env['NEXT_PUBLIC_SITE_URL'],
].filter(Boolean) as Array<string>

/**
 * CORS validation error
 * Thrown when origin is not in allowlist
 */
class CorsError extends Error {
  constructor(
    message: string,
    public origin: string | null,
  ) {
    super(message)
    this.name = 'CorsError'
  }
}

function corsHeaders(origin: string | null): HeadersInit {
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    throw new CorsError('Origin not allowed', origin)
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

/**
 * Create structured error response
 */
function errorResponse(
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  },
  status: number,
  origin?: string | null,
): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(origin && ALLOWED_ORIGINS.includes(origin)
        ? corsHeaders(origin)
        : {}),
    },
  })
}

authComponent.registerRoutes(http, createAuth)

http.route({
  path: '/health',
  method: 'GET',
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get('origin')

    try {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          timestamp: Date.now(),
          service: 'tanvex-api',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...(origin ? corsHeaders(origin) : {}),
          },
        },
      )
    } catch (error) {
      if (error instanceof CorsError) {
        // Report CORS errors to Sentry
        await captureHttpError('CORS_ERROR', error.message, {
          tags: { endpoint: '/health' },
          extra: { origin: error.origin, allowed: ALLOWED_ORIGINS },
          level: 'warning',
        })

        return errorResponse(
          {
            code: 'CORS_ERROR',
            message: error.message,
            details: { origin: error.origin, allowed: ALLOWED_ORIGINS },
          },
          403,
          origin,
        )
      }
      throw error
    }
  }),
})

http.route({
  path: '/*',
  method: 'OPTIONS',
  handler: httpAction(async (_ctx, request) => {
    const headers = request.headers
    const origin = headers.get('origin')

    try {
      if (
        origin &&
        headers.get('Access-Control-Request-Method') &&
        headers.get('Access-Control-Request-Headers')
      ) {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(origin),
        })
      }

      return errorResponse(
        {
          code: 'INVALID_PREFLIGHT',
          message: 'Invalid CORS pre-flight request',
          details: {
            hasOrigin: Boolean(origin),
            hasMethod: Boolean(headers.get('Access-Control-Request-Method')),
            hasHeaders: Boolean(headers.get('Access-Control-Request-Headers')),
          },
        },
        400,
        origin,
      )
    } catch (error) {
      if (error instanceof CorsError) {
        // Report CORS errors to Sentry
        await captureHttpError('CORS_ERROR', error.message, {
          tags: { endpoint: 'OPTIONS /*' },
          extra: { origin: error.origin, allowed: ALLOWED_ORIGINS },
          level: 'warning',
        })

        return errorResponse(
          {
            code: 'CORS_ERROR',
            message: error.message,
            details: { origin: error.origin, allowed: ALLOWED_ORIGINS },
          },
          403,
          origin,
        )
      }
      throw error
    }
  }),
})

export default http
