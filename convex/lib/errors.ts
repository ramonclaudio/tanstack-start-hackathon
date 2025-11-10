import { ConvexError } from 'convex/values'

/**
 * Thrown when authentication is required but not provided
 * Use this instead of checking error.message === 'Unauthenticated'
 */
export class AuthenticationError extends ConvexError<{
  code: string
  message: string
}> {
  constructor(message = 'Authentication required') {
    super({ code: 'UNAUTHENTICATED', message })
  }
}

/**
 * Specific error for Better Auth unauthenticated state
 * Allows catching by type instead of fragile string matching
 */
export class UnauthenticatedError extends ConvexError<{
  code: 'UNAUTHENTICATED'
  message: string
}> {
  constructor(message = 'User is not authenticated') {
    super({ code: 'UNAUTHENTICATED', message })
  }
}

export class AuthorizationError extends ConvexError<{
  code: string
  message: string
}> {
  constructor(message = 'Unauthorized') {
    super({ code: 'UNAUTHORIZED', message })
  }
}

export class ValidationError extends ConvexError<{
  code: string
  message: string
  field?: string
}> {
  constructor(message: string, field?: string) {
    super({ code: 'VALIDATION_ERROR', message, field })
  }
}

export class NotFoundError extends ConvexError<{
  code: string
  message: string
  resource: string
}> {
  constructor(resource: string) {
    super({ code: 'NOT_FOUND', message: `${resource} not found`, resource })
  }
}

/**
 * Thrown when rate limiting is exceeded
 */
export class RateLimitError extends ConvexError<{
  code: 'RATE_LIMIT_EXCEEDED'
  message: string
  retryAfter?: number
}> {
  constructor(message = 'Rate limit exceeded', retryAfter?: number) {
    super({ code: 'RATE_LIMIT_EXCEEDED', message, retryAfter })
  }
}

/**
 * Thrown when query or mutation hits Convex resource limits
 */
export class ResourceLimitError extends ConvexError<{
  code: 'RESOURCE_LIMIT'
  message: string
  limit: string
  current?: number
}> {
  constructor(limit: string, message?: string, current?: number) {
    super({
      code: 'RESOURCE_LIMIT',
      message: message ?? `Exceeded ${limit} limit`,
      limit,
      current,
    })
  }
}

/**
 * Thrown when input fails business logic validation
 * More specific than generic ValidationError
 */
export class InvalidInputError extends ConvexError<{
  code: 'INVALID_INPUT'
  message: string
  field?: string
  reason?: string
}> {
  constructor(message: string, field?: string, reason?: string) {
    super({ code: 'INVALID_INPUT', message, field, reason })
  }
}
