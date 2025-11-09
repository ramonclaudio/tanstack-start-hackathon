import { z } from 'zod'

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

export type ClientEnv = z.infer<typeof clientEnvSchema>

const serverEnvSchema = z
  .object({
    SITE_URL: z.string().url('SITE_URL must be a valid URL'),
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: z.string().regex(/^\d+$/, 'PORT must be a number'),
    CONVEX_DEPLOYMENT: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    AUTUMN_SECRET_KEY: z.string().min(1, 'AUTUMN_SECRET_KEY is required'),
    SENTRY_DSN: z.string().url('SENTRY_DSN must be a valid URL').optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasId = !!data.GITHUB_CLIENT_ID
      const hasSecret = !!data.GITHUB_CLIENT_SECRET
      return hasId === hasSecret
    },
    {
      message:
        'Both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be provided together, or neither',
      path: ['GITHUB_CLIENT_ID'],
    },
  )

export type ServerEnv = z.infer<typeof serverEnvSchema>

export function validateClientEnv(): ClientEnv {
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

export function validateServerEnv(): ServerEnv {
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

export { clientEnvSchema, serverEnvSchema }
