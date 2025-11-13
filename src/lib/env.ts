import { z } from 'zod'

const clientEnvSchema = z.object({
  VITE_DEV_SITE_URL: z.string().url('VITE_DEV_SITE_URL must be a valid URL'),
  VITE_SITE_URL: z.string().url('VITE_SITE_URL must be a valid URL'),
  CONVEX_URL: z.string().url('CONVEX_URL must be a valid URL'),
  CONVEX_SITE_URL: z.string().url('CONVEX_SITE_URL must be a valid URL'),
  SENTRY_DSN: z.string().url('SENTRY_DSN must be a valid URL').optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
})

export type ClientEnv = z.infer<typeof clientEnvSchema>

const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test', 'dev', 'prod']),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    DEV_GITHUB_CLIENT_ID: z.string().optional(),
    DEV_GITHUB_CLIENT_SECRET: z.string().optional(),
    AUTUMN_SECRET_KEY: z.string().min(1, 'AUTUMN_SECRET_KEY is required'),
    BETTER_AUTH_SECRET: z.string().min(1, 'BETTER_AUTH_SECRET is required'),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    CODERABBIT_API_KEY: z.string().optional(),
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
  .refine(
    (data) => {
      const hasDevId = !!data.DEV_GITHUB_CLIENT_ID
      const hasDevSecret = !!data.DEV_GITHUB_CLIENT_SECRET
      return hasDevId === hasDevSecret
    },
    {
      message:
        'Both DEV_GITHUB_CLIENT_ID and DEV_GITHUB_CLIENT_SECRET must be provided together, or neither',
      path: ['DEV_GITHUB_CLIENT_ID'],
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

/**
 * Get the correct SITE_URL based on NODE_ENV
 * Returns VITE_SITE_URL in production, VITE_DEV_SITE_URL otherwise
 */
export function getSiteUrl(): string {
  const env = validateClientEnv()
  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod'
  const isDevelopment =
    process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev'
  return isProduction
    ? env.VITE_SITE_URL
    : isDevelopment
      ? env.VITE_DEV_SITE_URL
      : env.VITE_DEV_SITE_URL
}

/**
 * Get the correct GitHub credentials based on NODE_ENV
 * Returns production credentials in production, dev credentials otherwise
 */
export function getGithubCredentials(): {
  clientId?: string
  clientSecret?: string
} {
  const serverEnv = validateServerEnv()
  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod'
  const isDevelopment =
    process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev'

  if (isProduction) {
    return {
      clientId: serverEnv.GITHUB_CLIENT_ID,
      clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
    }
  }

  if (isDevelopment) {
    return {
      clientId: serverEnv.DEV_GITHUB_CLIENT_ID,
      clientSecret: serverEnv.DEV_GITHUB_CLIENT_SECRET,
    }
  }

  // Default to dev credentials for unknown environments
  return {
    clientId: serverEnv.DEV_GITHUB_CLIENT_ID,
    clientSecret: serverEnv.DEV_GITHUB_CLIENT_SECRET,
  }
}
