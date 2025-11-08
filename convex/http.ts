import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { authComponent, createAuth } from './auth'

const http = httpRouter()

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env['SITE_URL'],
  process.env['NEXT_PUBLIC_SITE_URL'],
].filter(Boolean) as Array<string>

function corsHeaders(origin: string | null) {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0] || '*'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

authComponent.registerRoutes(http, createAuth)

http.route({
  path: '/health',
  method: 'GET',
  handler: httpAction(
    // eslint-disable-next-line @typescript-eslint/require-await
    async () => {
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
            ...corsHeaders(null),
          },
        },
      )
    },
  ),
})

http.route({
  path: '/*',
  method: 'OPTIONS',
  handler: httpAction(
    // eslint-disable-next-line @typescript-eslint/require-await
    async (_ctx, request) => {
      const origin = request.headers.get('origin')
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      })
    },
  ),
})

export default http
