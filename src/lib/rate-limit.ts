/**
 * Simple in-memory rate limiter for production use
 * For high-scale production, consider using Redis-based rate limiting
 */

import { createLogger } from './logger'

const rateLimitLogger = createLogger('RateLimit')

interface RateLimitEntry {
  count: number
  resetTime: number
}

export class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: Timer | null = null

  constructor(
    private windowMs: number = 60 * 1000, // 1 minute window
    private maxRequests: number = 100, // max requests per window
  ) {
    // Cleanup old entries every minute
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup()
      }, 60 * 1000)
    }
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier for the client (IP, user ID, etc.)
   * @returns Object with allowed status and rate limit info
   */
  check(identifier: string): {
    allowed: boolean
    limit: number
    remaining: number
    resetTime: number
  } {
    const now = Date.now()
    const entry = this.requests.get(identifier)

    if (!entry || now > entry.resetTime) {
      // New window or expired entry
      const resetTime = now + this.windowMs
      this.requests.set(identifier, { count: 1, resetTime })
      return {
        allowed: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        resetTime,
      }
    }

    if (entry.count >= this.maxRequests) {
      // Rate limit exceeded
      rateLimitLogger.warn('Rate limit exceeded', {
        identifier,
        limit: this.maxRequests,
        attempts: entry.count,
        resetTime: new Date(entry.resetTime).toISOString(),
      })
      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
      }
    }

    // Increment count
    entry.count++
    return {
      allowed: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime,
    }
  }

  /**
   * Clean up expired entries to prevent memory leak
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key)
      }
    }
  }

  /**
   * Destroy the rate limiter and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.requests.clear()
  }
}

/**
 * Rate limiter instances for different endpoints
 */
export const rateLimiters = {
  // Auth endpoints - strict limits
  auth: new RateLimiter(60 * 1000, 10), // 10 requests per minute

  // API endpoints - moderate limits
  api: new RateLimiter(60 * 1000, 100), // 100 requests per minute

  // General requests - relaxed limits
  general: new RateLimiter(60 * 1000, 200), // 200 requests per minute
}

/**
 * Get client identifier from request
 * Uses IP address as identifier, with fallback to user agent
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from various headers (in order of preference)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Fallback to user agent + method + path for local development
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const url = new URL(request.url)
  return `${userAgent}-${request.method}-${url.pathname}`
}

/**
 * Apply rate limiting to a request
 * @param request - The incoming request
 * @param limiterType - Type of rate limiter to use ('auth', 'api', or 'general')
 * @returns Response if rate limited, null if allowed
 */
export function applyRateLimit(
  request: Request,
  limiterType: 'auth' | 'api' | 'general' = 'general',
): Response | null {
  const identifier = getClientIdentifier(request)
  const limiter = rateLimiters[limiterType]
  const result = limiter.check(identifier)

  const url = new URL(request.url)
  rateLimitLogger.debug('Rate limit check', {
    path: url.pathname,
    method: request.method,
    limiterType,
    remaining: result.remaining,
    allowed: result.allowed,
  })

  // Always add rate limit headers
  const headers = new Headers({
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetTime / 1000)),
  })

  if (!result.allowed) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
    headers.set('Retry-After', String(retryAfter))

    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter,
      }),
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          ...Object.fromEntries(headers),
          'Content-Type': 'application/json',
        },
      },
    )
  }

  return null
}

/**
 * Middleware to add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: Response,
  request: Request,
  limiterType: 'auth' | 'api' | 'general' = 'general',
): Response {
  const identifier = getClientIdentifier(request)
  const limiter = rateLimiters[limiterType]
  const result = limiter.check(identifier)

  const newHeaders = new Headers(response.headers)
  newHeaders.set('X-RateLimit-Limit', String(result.limit))
  newHeaders.set(
    'X-RateLimit-Remaining',
    String(Math.max(0, result.remaining - 1)),
  )
  newHeaders.set(
    'X-RateLimit-Reset',
    String(Math.floor(result.resetTime / 1000)),
  )

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}
