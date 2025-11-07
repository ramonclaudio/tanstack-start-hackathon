import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth } from 'better-auth'
import { components } from './_generated/api'
import { query } from './_generated/server'
import { authLogger } from './lib/logger'
import type { DataModel } from './_generated/dataModel'
import type { GenericCtx } from '@convex-dev/better-auth'

const siteUrl = process.env['SITE_URL']
if (!siteUrl) {
  throw new Error(
    'Missing required environment variable: SITE_URL. This must be set in production.',
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
      // Email verification disabled until email service is configured
      // To enable: implement sendVerificationEmail below and set to true
      requireEmailVerification: false,
      // TODO: Configure email sending service (SendGrid, Resend, etc.)
      // sendVerificationEmail: async ({ user, url, token }) => {
      //   await sendEmail({
      //     to: user.email,
      //     subject: 'Verify your email address',
      //     html: `Click to verify: <a href="${url}">${url}</a>`,
      //   })
      // },
    },
    socialProviders: {
      github: {
        clientId: process.env['GITHUB_CLIENT_ID'] as string,
        clientSecret: process.env['GITHUB_CLIENT_SECRET'] as string,
      },
    },
    plugins: [convex()],
  })
}

export const getAuthUserOrNull = async (
  ctx: GenericCtx<DataModel>,
): Promise<Awaited<ReturnType<typeof authComponent.getAuthUser>> | null> => {
  try {
    return await authComponent.getAuthUser(ctx)
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthenticated') {
      return null
    }
    authLogger.error('Failed to get auth user', e)
    throw e
  }
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx)
  },
})
