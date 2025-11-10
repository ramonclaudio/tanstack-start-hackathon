import { ConvexError, v } from 'convex/values'

/**
 * Common validation utilities for Convex functions
 *
 * These validators handle BUSINESS LOGIC, not type checking.
 * Use Convex's built-in validators (v.string(), v.number(), etc.) for type validation.
 */

/**
 * Timestamp validator for milliseconds since Unix epoch
 * Use this for createdAt, updatedAt, etc. fields
 * Note: Convex's _creationTime is auto-generated, use v.number() for custom timestamps
 */
export const timestampValidator = v.number()

/**
 * Reusable validator for task documents
 */
export const taskValidator = v.object({
  _id: v.id('tasks'),
  _creationTime: timestampValidator,
  text: v.string(),
  completed: v.boolean(),
})

/**
 * Reusable validator for user profile
 * Note: id is a string representation of user._id, not a v.id() type
 * This is intentional as UserProfile is a transformed view, not a raw document
 */
export const userProfileValidator = v.object({
  id: v.string(),
  name: v.union(v.string(), v.null()),
  email: v.string(),
  image: v.union(v.string(), v.null()),
  createdAt: timestampValidator,
  emailVerified: v.boolean(),
  twoFactorEnabled: v.boolean(),
})

/**
 * Reusable validator for user response (authenticated or not)
 */
export const userResponseValidator = v.union(
  v.object({
    authenticated: v.literal(true),
    user: userProfileValidator,
  }),
  v.object({
    authenticated: v.literal(false),
    user: v.null(),
  }),
)

/**
 * Reusable validator for Convex pagination results
 * Use this to validate any paginated query response
 */
export const paginationResultValidator = (
  itemValidator: ReturnType<typeof v.object>,
) =>
  v.object({
    page: v.array(itemValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(
        v.literal('SplitRequired'),
        v.literal('SplitRecommended'),
        v.literal('FullPageSelected'),
        v.null(),
      ),
    ),
  })

/**
 * Business logic: Validates and sanitizes text input
 * Use this for length limits and trimming, NOT for type checking
 */
export function validateText(
  text: string,
  options: {
    minLength?: number
    maxLength?: number
    fieldName?: string
  } = {},
): string {
  const { minLength = 1, maxLength = 10000, fieldName = 'Text' } = options

  const trimmed = text.trim()

  if (trimmed.length < minLength) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: `${fieldName} cannot be empty`,
      field: fieldName,
    })
  }

  if (trimmed.length > maxLength) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: `${fieldName} exceeds maximum length of ${maxLength} characters`,
      field: fieldName,
    })
  }

  return trimmed
}

/**
 * Query limit monitoring utilities
 * Convex limits: 16384 docs scanned, 8MiB data, 4096 db calls, 1s execution
 */
const QUERY_LIMITS = {
  DOCS_SCANNED_WARN: 10000, // Warn at 60% of 16384 limit
  DOCS_SCANNED_ERROR: 16000, // Error at 98% of 16384 limit
  DB_CALLS_WARN: 3000, // Warn at 73% of 4096 limit
  DB_CALLS_ERROR: 4000, // Error at 98% of 4096 limit
}

let dbCallCount = 0
let docsScannedEstimate = 0

/**
 * Track database call and warn if approaching limits
 * Call this before each db.get() or db.query()
 */
export function trackDbCall(estimatedDocs = 1): void {
  dbCallCount++
  docsScannedEstimate += estimatedDocs

  if (dbCallCount >= QUERY_LIMITS.DB_CALLS_ERROR) {
    // eslint-disable-next-line no-console
    console.error(
      `[Query Limits] Critical: ${dbCallCount} database calls (limit: 4096)`,
    )
  } else if (dbCallCount >= QUERY_LIMITS.DB_CALLS_WARN) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Query Limits] Warning: ${dbCallCount} database calls approaching limit (4096)`,
    )
  }

  if (docsScannedEstimate >= QUERY_LIMITS.DOCS_SCANNED_ERROR) {
    // eslint-disable-next-line no-console
    console.error(
      `[Query Limits] Critical: ~${docsScannedEstimate} docs scanned (limit: 16384)`,
    )
  } else if (docsScannedEstimate >= QUERY_LIMITS.DOCS_SCANNED_WARN) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Query Limits] Warning: ~${docsScannedEstimate} docs scanned approaching limit (16384)`,
    )
  }
}

/**
 * Reset query limit tracking (call at start of each function)
 */
export function resetQueryTracking(): void {
  dbCallCount = 0
  docsScannedEstimate = 0
}

/**
 * Get current query metrics
 */
export function getQueryMetrics(): {
  dbCalls: number
  docsScanned: number
} {
  return {
    dbCalls: dbCallCount,
    docsScanned: docsScannedEstimate,
  }
}

/**
 * Validate email format
 */
export function validateEmail(
  email: string,
  fieldName = 'Email',
): string | never {
  const trimmed = email.trim().toLowerCase()

  // Basic email regex (RFC 5322 simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(trimmed)) {
    throw new ConvexError({
      code: 'INVALID_INPUT',
      message: `${fieldName} must be a valid email address`,
      field: fieldName,
      reason: 'invalid_format',
    })
  }

  return trimmed
}

/**
 * Validate ID exists and has correct format
 * Generic validation that works with any Convex ID
 */
export function validateId(
  id: string | null | undefined,
  tableName: string,
): string | never {
  if (!id) {
    throw new ConvexError({
      code: 'INVALID_INPUT',
      message: `${tableName} ID is required`,
      field: 'id',
      reason: 'missing',
    })
  }

  // Convex IDs follow pattern: tablename|randomstring
  const idRegex = new RegExp(`^${tableName}\\|`)
  if (!idRegex.test(id)) {
    throw new ConvexError({
      code: 'INVALID_INPUT',
      message: `Invalid ${tableName} ID format`,
      field: 'id',
      reason: 'invalid_format',
    })
  }

  return id
}

/**
 * Validate numeric range
 */
export function validateNumber(
  value: number,
  options: {
    min?: number
    max?: number
    fieldName?: string
    integer?: boolean
  } = {},
): number | never {
  const { min, max, fieldName = 'Value', integer = false } = options

  if (integer && !Number.isInteger(value)) {
    throw new ConvexError({
      code: 'INVALID_INPUT',
      message: `${fieldName} must be an integer`,
      field: fieldName,
      reason: 'not_integer',
    })
  }

  if (min !== undefined && value < min) {
    throw new ConvexError({
      code: 'INVALID_INPUT',
      message: `${fieldName} must be at least ${min}`,
      field: fieldName,
      reason: 'below_minimum',
    })
  }

  if (max !== undefined && value > max) {
    throw new ConvexError({
      code: 'INVALID_INPUT',
      message: `${fieldName} must be at most ${max}`,
      field: fieldName,
      reason: 'above_maximum',
    })
  }

  return value
}

/**
 * Validate array length
 */
export function validateArray<T>(
  array: Array<T>,
  options: {
    minLength?: number
    maxLength?: number
    fieldName?: string
  } = {},
): Array<T> | never {
  const { minLength, maxLength, fieldName = 'Array' } = options

  if (minLength !== undefined && array.length < minLength) {
    throw new ConvexError({
      code: 'INVALID_INPUT',
      message: `${fieldName} must contain at least ${minLength} items`,
      field: fieldName,
      reason: 'too_few_items',
    })
  }

  if (maxLength !== undefined && array.length > maxLength) {
    throw new ConvexError({
      code: 'INVALID_INPUT',
      message: `${fieldName} must contain at most ${maxLength} items`,
      field: fieldName,
      reason: 'too_many_items',
    })
  }

  return array
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: string,
  allowedValues: ReadonlyArray<T>,
  fieldName = 'Value',
): T | never {
  if (!allowedValues.includes(value as T)) {
    throw new ConvexError({
      code: 'INVALID_INPUT',
      message: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      field: fieldName,
      reason: 'invalid_enum',
    })
  }

  return value as T
}
