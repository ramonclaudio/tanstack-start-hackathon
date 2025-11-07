/**
 * Production-ready security headers for the application
 * Implements OWASP recommendations for web application security
 */

export interface SecurityHeaders {
  [key: string]: string
}

/**
 * Get CORS headers for API routes
 * @param origin - The origin making the request
 * @param isDevelopment - Whether the app is running in development mode
 * @returns Object containing CORS headers
 */
export function getCorsHeaders(
  origin: string | null,
  isDevelopment = false,
): SecurityHeaders {
  const headers: SecurityHeaders = {}

  // In production, only allow specific origins
  if (!isDevelopment) {
    // Define allowed origins from environment variables
    // Add additional domains via ALLOWED_ORIGINS env var (comma-separated)
    const additionalOrigins =
      process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) || []
    const allowedOrigins = [process.env.SITE_URL, ...additionalOrigins].filter(
      Boolean,
    )

    if (origin && allowedOrigins.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin
      headers['Access-Control-Allow-Credentials'] = 'true'
    }
  } else {
    // In development, allow localhost
    headers['Access-Control-Allow-Origin'] = origin || '*'
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  // Common CORS headers
  headers['Access-Control-Allow-Methods'] =
    'GET, POST, PUT, DELETE, OPTIONS, PATCH'
  headers['Access-Control-Allow-Headers'] =
    'Content-Type, Authorization, X-Requested-With, Accept, Origin'
  headers['Access-Control-Max-Age'] = '86400' // 24 hours

  return headers
}

/**
 * Get security headers based on environment
 * @param isDevelopment - Whether the app is running in development mode
 * @returns Object containing security headers
 */
export function getSecurityHeaders(isDevelopment = false): SecurityHeaders {
  const headers: SecurityHeaders = {
    // Prevent clickjacking attacks
    'X-Frame-Options': 'SAMEORIGIN',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Enable XSS filter in older browsers
    'X-XSS-Protection': '1; mode=block',

    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions Policy (formerly Feature Policy)
    'Permissions-Policy':
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  }

  // Content Security Policy - adjust based on your needs
  if (!isDevelopment) {
    // Production CSP - strict policy
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://*.convex.cloud https://*.convex.site https://*.sentry.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.convex.cloud https://*.convex.site wss://*.convex.cloud https://*.sentry.io https://api.github.com",
      "media-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      'upgrade-insecure-requests',
    ].join('; ')

    // Strict Transport Security (HSTS)
    // max-age=31536000 (1 year), includeSubDomains, preload
    headers['Strict-Transport-Security'] =
      'max-age=31536000; includeSubDomains; preload'
  } else {
    // Development CSP - more permissive for hot reload, devtools, etc.
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http://localhost:*",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data:",
      "connect-src 'self' http://localhost:* ws://localhost:* https://*.convex.cloud https://*.convex.site wss://*.convex.cloud",
      "media-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  }

  return headers
}

/**
 * Apply security headers to a Response object
 * @param response - The response to add headers to
 * @param isDevelopment - Whether the app is running in development mode
 * @returns Response with security headers added
 */
export function applySecurityHeaders(
  response: Response,
  isDevelopment = false,
): Response {
  const headers = getSecurityHeaders(isDevelopment)

  // Clone the response to modify headers
  const newHeaders = new Headers(response.headers)

  // Apply security headers
  Object.entries(headers).forEach(([key, value]) => {
    newHeaders.set(key, value)
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}
