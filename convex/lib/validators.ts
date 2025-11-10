import { v } from 'convex/values'
import { ValidationError } from './errors'

/**
 * Common validation utilities for Convex functions
 *
 * These validators handle BUSINESS LOGIC, not type checking.
 * Use Convex's built-in validators (v.string(), v.number(), etc.) for type validation.
 */

/**
 * Reusable validator for task documents
 */
export const taskValidator = v.object({
  _id: v.id('tasks'),
  _creationTime: v.number(),
  text: v.string(),
  completed: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})

/**
 * Reusable validator for user profile
 */
export const userProfileValidator = v.object({
  id: v.string(),
  name: v.union(v.string(), v.null()),
  email: v.string(),
  image: v.union(v.string(), v.null()),
  createdAt: v.number(),
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
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName)
  }

  if (trimmed.length > maxLength) {
    throw new ValidationError(
      `${fieldName} exceeds maximum length of ${maxLength} characters`,
      fieldName,
    )
  }

  return trimmed
}
