import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth } from 'better-auth'
import { components } from './_generated/api'
import { query } from './_generated/server'
import type { DataModel } from './_generated/dataModel'
import type { GenericCtx } from '@convex-dev/better-auth'

const siteUrl = process.env.SITE_URL
if (!siteUrl) {
  console.warn('SITE_URL is not set; falling back to http://localhost:3000')
}

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    // disable logging when createAuth is called just to generate options.
    // this is not required, but there's a lot of noise in logs without it.
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl || 'http://localhost:3000',
    database: authComponent.adapter(ctx),
    // Configure simple, non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      },
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex(),
    ],
  })
}

// Shared helper to get authenticated user or null
export const getAuthUserOrNull = async (
  ctx: GenericCtx<DataModel>,
): Promise<Awaited<ReturnType<typeof authComponent.getAuthUser>> | null> => {
  try {
    return await authComponent.getAuthUser(ctx)
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthenticated') {
      return null
    }
    throw e
  }
}

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx)
  },
})
