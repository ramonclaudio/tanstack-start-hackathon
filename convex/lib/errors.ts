/**
 * Error payload types for ConvexError
 * Use these with: throw new ConvexError({ code: '...', ... })
 *
 * Per Convex docs: Don't extend ConvexError, use it directly with typed payloads
 */

/**
 * Authentication required but not provided
 * Use when user must be logged in
 */
export type UnauthenticatedPayload = {
  code: 'UNAUTHENTICATED'
  message: string
}

/**
 * User lacks permission for resource
 * Use when user is authenticated but unauthorized
 */
export type UnauthorizedPayload = {
  code: 'UNAUTHORIZED'
  message: string
  resource?: string
}

/**
 * Input validation failed
 * Use for business logic validation (length, format, etc.)
 */
export type ValidationPayload = {
  code: 'VALIDATION_ERROR'
  message: string
  field?: string
}

/**
 * Resource not found in database
 */
export type NotFoundPayload = {
  code: 'NOT_FOUND'
  message: string
  resource: string
  id?: string
}

/**
 * Rate limit exceeded
 */
export type RateLimitPayload = {
  code: 'RATE_LIMIT_EXCEEDED'
  message: string
  retryAfter?: number
}

/**
 * Convex resource limits hit
 */
export type ResourceLimitPayload = {
  code: 'RESOURCE_LIMIT'
  message: string
  limit: string
  current?: number
}

/**
 * Business logic validation failed
 */
export type InvalidInputPayload = {
  code: 'INVALID_INPUT'
  message: string
  field?: string
  reason?: string
}

/**
 * Union of all error payloads for type checking
 */
export type ErrorPayload =
  | UnauthenticatedPayload
  | UnauthorizedPayload
  | ValidationPayload
  | NotFoundPayload
  | RateLimitPayload
  | ResourceLimitPayload
  | InvalidInputPayload
