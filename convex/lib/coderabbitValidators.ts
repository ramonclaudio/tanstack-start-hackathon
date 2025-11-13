import { ConvexError, v } from 'convex/values'

/**
 * CodeRabbit-specific validators for Convex actions
 */

/**
 * Maximum recommended date range in days
 * API may take longer to respond for ranges exceeding this limit
 */
const MAX_RECOMMENDED_DATE_RANGE_DAYS = 90

/**
 * Valid prompt template types
 */
export const PROMPT_TEMPLATES = [
  'Daily Standup Report',
  'Sprint Report',
  'Release Notes',
  'Custom',
] as const

/**
 * Valid filter parameters
 */
export const FILTER_PARAMETERS = [
  'REPOSITORY',
  'LABEL',
  'TEAM',
  'USER',
  'SOURCEBRANCH',
  'TARGETBRANCH',
  'STATE',
] as const

/**
 * Valid filter operators
 */
export const FILTER_OPERATORS = ['IN', 'ALL', 'NOT_IN'] as const

/**
 * Valid group by options
 */
export const GROUP_BY_OPTIONS = [
  'NONE',
  'REPOSITORY',
  'LABEL',
  'TEAM',
  'USER',
  'SOURCEBRANCH',
  'TARGETBRANCH',
  'STATE',
] as const

/**
 * Filter parameter validator
 */
export const filterParameterValidator = v.object({
  parameter: v.union(
    v.literal('REPOSITORY'),
    v.literal('LABEL'),
    v.literal('TEAM'),
    v.literal('USER'),
    v.literal('SOURCEBRANCH'),
    v.literal('TARGETBRANCH'),
    v.literal('STATE'),
  ),
  operator: v.union(v.literal('IN'), v.literal('ALL'), v.literal('NOT_IN')),
  values: v.array(v.string()),
})

/**
 * Report generation request validator
 */
export const reportGenerateRequestValidator = v.object({
  scheduleRange: v.optional(v.literal('Dates')),
  from: v.string(), // ISO 8601 date (YYYY-MM-DD)
  to: v.string(), // ISO 8601 date (YYYY-MM-DD)
  prompt: v.optional(v.string()),
  promptTemplate: v.optional(
    v.union(
      v.literal('Daily Standup Report'),
      v.literal('Sprint Report'),
      v.literal('Release Notes'),
      v.literal('Custom'),
    ),
  ),
  parameters: v.optional(v.array(filterParameterValidator)),
  groupBy: v.optional(
    v.union(
      v.literal('NONE'),
      v.literal('REPOSITORY'),
      v.literal('LABEL'),
      v.literal('TEAM'),
      v.literal('USER'),
      v.literal('SOURCEBRANCH'),
      v.literal('TARGETBRANCH'),
      v.literal('STATE'),
    ),
  ),
  subgroupBy: v.optional(
    v.union(
      v.literal('NONE'),
      v.literal('REPOSITORY'),
      v.literal('LABEL'),
      v.literal('TEAM'),
      v.literal('USER'),
      v.literal('SOURCEBRANCH'),
      v.literal('TARGETBRANCH'),
      v.literal('STATE'),
    ),
  ),
  orgId: v.optional(v.string()),
})

/**
 * Report result validator
 */
export const reportResultValidator = v.object({
  group: v.string(),
  report: v.string(),
})

/**
 * Validate ISO 8601 date format (YYYY-MM-DD)
 */
export function validateDateFormat(date: string, fieldName = 'Date'): void {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    throw new ConvexError({
      code: 'INVALID_DATE_FORMAT',
      message: `${fieldName} must be in ISO 8601 format (YYYY-MM-DD)`,
      field: fieldName,
    })
  }

  const parsedDate = new Date(date)
  if (isNaN(parsedDate.getTime())) {
    throw new ConvexError({
      code: 'INVALID_DATE',
      message: `${fieldName} is not a valid date`,
      field: fieldName,
    })
  }
}

/**
 * Validate date range
 */
export function validateDateRange(from: string, to: string): void {
  validateDateFormat(from, 'from')
  validateDateFormat(to, 'to')

  const fromDate = new Date(from)
  const toDate = new Date(to)
  const now = new Date()
  now.setHours(23, 59, 59, 999) // End of today

  if (fromDate > toDate) {
    throw new ConvexError({
      code: 'INVALID_DATE_RANGE',
      message: 'Start date must be before or equal to end date',
    })
  }

  if (toDate > now) {
    throw new ConvexError({
      code: 'INVALID_DATE_RANGE',
      message: 'End date cannot be in the future',
    })
  }

  // Warn if date range exceeds recommended limit
  const daysDiff = Math.floor(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (daysDiff > MAX_RECOMMENDED_DATE_RANGE_DAYS) {
    console.warn(
      `[CodeRabbit] Date range spans ${daysDiff} days (> ${MAX_RECOMMENDED_DATE_RANGE_DAYS}). API may take longer to respond.`,
    )
  }
}
