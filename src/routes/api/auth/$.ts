import { createFileRoute } from '@tanstack/react-router'
import { reactStartHandler } from '@convex-dev/better-auth/react-start'

// HTTP/2 forbids these headers
const HTTP2_FORBIDDEN_HEADERS = [
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'upgrade',
]

async function handleAuthRequest(request: Request) {
  // Use the PUBLIC env var for client-side access in Tanstack Start
  const convexSiteUrl =
    import.meta.env['VITE_PUBLIC_CONVEX_SITE_URL'] ||
    import.meta.env['VITE_CONVEX_SITE_URL']

  if (!convexSiteUrl) {
    throw new Error(
      'VITE_PUBLIC_CONVEX_SITE_URL environment variable is not set',
    )
  }

  const response = await reactStartHandler(request, {
    convexSiteUrl,
  })

  // Filter out HTTP/2 incompatible headers
  const headers = new Headers(response.headers)
  HTTP2_FORBIDDEN_HEADERS.forEach((header) => headers.delete(header))

  return new Response(response.body, {
    status: response.status,
    headers,
  })
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => handleAuthRequest(request),
      POST: ({ request }) => handleAuthRequest(request),
      PUT: ({ request }) => handleAuthRequest(request),
      PATCH: ({ request }) => handleAuthRequest(request),
      DELETE: ({ request }) => handleAuthRequest(request),
    },
  },
})
