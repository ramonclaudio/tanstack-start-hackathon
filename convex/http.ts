import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { authComponent, createAuth } from './auth'

const http = httpRouter()

const getSiteUrl = (): string | undefined => {
  const deployment = process.env['CONVEX_DEPLOYMENT']
  const isProduction = deployment?.startsWith('prod:') ?? false
  return isProduction
    ? process.env['VITE_SITE_URL']
    : process.env['VITE_DEV_SITE_URL']
}

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3000',
  getSiteUrl(),
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

/**
 * Check if origin is allowed
 * Allows: exact matches in ALLOWED_ORIGINS + *.netlify.app preview deploys
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGINS.includes(origin)) return true

  // Allow Netlify preview/deploy URLs (e.g., https://sage-starburst-d15a22.netlify.app)
  try {
    const url = new URL(origin)
    return url.hostname.endsWith('.netlify.app') && url.protocol === 'https:'
  } catch {
    return false
  }
}

function corsHeaders(origin: string | null): HeadersInit {
  if (!isOriginAllowed(origin)) {
    throw new CorsError('Origin not allowed', origin)
  }

  // At this point origin is guaranteed to be a valid string by isOriginAllowed
  return {
    'Access-Control-Allow-Origin': origin as string,
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
      ...(origin && isOriginAllowed(origin) ? corsHeaders(origin) : {}),
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
      await Promise.resolve() // Satisfy require-await
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
        // Log CORS errors but don't spam Sentry (too noisy in production)

        console.warn('[CORS] Origin not allowed', {
          endpoint: '/health',
          origin: error.origin,
          allowed: ALLOWED_ORIGINS,
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
      await Promise.resolve() // Satisfy require-await
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
        // Log CORS errors but don't spam Sentry (too noisy in production)

        console.warn('[CORS] Origin not allowed', {
          endpoint: 'OPTIONS /*',
          origin: error.origin,
          allowed: ALLOWED_ORIGINS,
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
