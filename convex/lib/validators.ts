import { v } from 'convex/values'
import { ValidationError } from './errors'
import type { Validator } from 'convex/values'

/**
 * Common validation utilities for Convex functions
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const URL_REGEX = /^https?:\/\/.+/

/**
 * Validates and sanitizes text input
 * Throws ValidationError if invalid
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

/**
 * Validates email format
 */
export function validateEmail(email: string): string {
  const trimmed = email.trim().toLowerCase()

  if (!EMAIL_REGEX.test(trimmed)) {
    throw new ValidationError('Invalid email format', 'email')
  }

  return trimmed
}

/**
 * Validates URL format
 */
export function validateUrl(url: string): string {
  const trimmed = url.trim()

  if (!URL_REGEX.test(trimmed)) {
    throw new ValidationError('Invalid URL format', 'url')
  }

  return trimmed
}

/**
 * Common validator patterns for reuse
 */
export const validators = {
  email: v.string(),
  url: v.string(),
  shortText: v.string(), // 1-500 chars
  longText: v.string(), // 1-10000 chars
  timestamp: v.number(),
  positiveInt: v.number(),
} satisfies Record<string, Validator<any, any, any>>

/**
 * Validates pagination options
 */
export function validatePaginationOpts(opts: {
  numItems: number
  cursor: string | null
}) {
  if (opts.numItems < 1 || opts.numItems > 100) {
    throw new ValidationError('numItems must be between 1 and 100', 'numItems')
  }
  return opts
}
