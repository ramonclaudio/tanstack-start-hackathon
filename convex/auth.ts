import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth } from 'better-auth'
import { components } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
import type { GenericCtx } from '@convex-dev/better-auth'

const siteUrl = process.env['SITE_URL']
if (!siteUrl) {
  throw new Error(
    'Missing required environment variable: SITE_URL\n' +
      'Set it in:\n' +
      '  Development: .env.local (SITE_URL=http://localhost:3000)\n' +
      '  Production: Convex Dashboard → Settings → Environment Variables',
  )
}

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: {
      github: {
        clientId: process.env['GITHUB_CLIENT_ID'] as string,
        clientSecret: process.env['GITHUB_CLIENT_SECRET'] as string,
      },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': {
          window: 10,
          max: 5,
        },
        '/sign-up/email': {
          window: 10,
          max: 5,
        },
      },
    },
    plugins: [convex()],
  })
}
