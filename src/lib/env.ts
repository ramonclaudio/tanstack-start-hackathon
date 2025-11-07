import { z } from 'zod'

/**
 * Client-side environment variables schema
 * These are exposed to the browser
 */
const clientEnvSchema = z.object({
  VITE_CONVEX_URL: z.string().url('VITE_CONVEX_URL must be a valid URL'),
  VITE_PUBLIC_CONVEX_SITE_URL: z
    .string()
    .url('VITE_PUBLIC_CONVEX_SITE_URL must be a valid URL')
    .optional(),
  VITE_SENTRY_DSN: z
    .string()
    .url('VITE_SENTRY_DSN must be a valid URL')
    .optional(),
  MODE: z.enum(['development', 'production', 'test']),
  PROD: z.boolean(),
  DEV: z.boolean(),
})

/**
 * Server-side environment variables schema
 * These are only available on the server
 */
const serverEnvSchema = z.object({
  SITE_URL: z.string().url('SITE_URL must be a valid URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number'),
  // Optional authentication providers
  CONVEX_DEPLOYMENT: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  AUTUMN_SECRET_KEY: z.string().optional(),
  // Optional monitoring
  SENTRY_DSN: z.string().url('SENTRY_DSN must be a valid URL').optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  // Optional asset preloading configuration
  ASSET_PRELOAD_MAX_SIZE: z
    .string()
    .regex(/^\d+$/, 'ASSET_PRELOAD_MAX_SIZE must be a number')
    .optional(),
  ASSET_PRELOAD_INCLUDE_PATTERNS: z.string().optional(),
  ASSET_PRELOAD_EXCLUDE_PATTERNS: z.string().optional(),
  ASSET_PRELOAD_VERBOSE_LOGGING: z.enum(['true', 'false']).optional(),
  ASSET_PRELOAD_ENABLE_ETAG: z.enum(['true', 'false']).optional(),
  ASSET_PRELOAD_ENABLE_GZIP: z.enum(['true', 'false']).optional(),
  ASSET_PRELOAD_GZIP_MIN_SIZE: z
    .string()
    .regex(/^\d+$/, 'ASSET_PRELOAD_GZIP_MIN_SIZE must be a number')
    .optional(),
  ASSET_PRELOAD_GZIP_MIME_TYPES: z.string().optional(),
})

/**
 * Validate client-side environment variables
 * Call this in client-side code (browser)
 */
export function validateClientEnv() {
  try {
    const env = clientEnvSchema.parse(import.meta.env)
    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => {
        return `  - ${issue.path.join('.')}: ${issue.message}`
      })
      throw new Error(
        `Invalid environment variables:\n${issues.join('\n')}\n\nPlease check your .env file.`,
      )
    }
    throw error
  }
}

/**
 * Validate server-side environment variables
 * Call this in server-side code (Node.js/Bun)
 */
export function validateServerEnv() {
  try {
    const env = serverEnvSchema.parse(process.env)
    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => {
        return `  - ${issue.path.join('.')}: ${issue.message}`
      })
      throw new Error(
        `Invalid environment variables:\n${issues.join('\n')}\n\nPlease check your .env file.`,
      )
    }
    throw error
  }
}

/**
 * Type-safe client environment variables
 * Use this for type hints in client code
 */
export type ClientEnv = z.infer<typeof clientEnvSchema>

/**
 * Type-safe server environment variables
 * Use this for type hints in server code
 */
export type ServerEnv = z.infer<typeof serverEnvSchema>

// Export schemas for testing
export { clientEnvSchema, serverEnvSchema }
