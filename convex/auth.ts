import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth } from 'better-auth'
import { components } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
import type { GenericCtx } from '@convex-dev/better-auth'

export const authComponent = createClient<DataModel>(components.betterAuth)

/**
 * Determine if running in production based on CONVEX_DEPLOYMENT
 * Convex automatically sets CONVEX_DEPLOYMENT to "prod:..." for production
 * and "dev:..." or "preview:..." for non-production deployments
 */
function isProductionDeployment(): boolean {
  const deployment = process.env['CONVEX_DEPLOYMENT']
  return deployment?.startsWith('prod:') ?? false
}

/**
 * Get the correct SITE_URL based on deployment
 * Returns VITE_SITE_URL in production, VITE_DEV_SITE_URL otherwise
 */
function getSiteUrl(): string {
  const isProduction = isProductionDeployment()
  const siteUrl = isProduction
    ? process.env['VITE_SITE_URL']
    : process.env['VITE_DEV_SITE_URL']

  console.log('[Auth Config] Site URL selection:', {
    CONVEX_DEPLOYMENT: process.env['CONVEX_DEPLOYMENT'],
    CONVEX_SITE_URL: process.env['CONVEX_SITE_URL'],
    isProduction,
    selectedSiteUrl: siteUrl,
    availableUrls: {
      prod: process.env['VITE_SITE_URL'],
      dev: process.env['VITE_DEV_SITE_URL'],
    },
  })

  if (!siteUrl) {
    const envVar = isProduction ? 'VITE_SITE_URL' : 'VITE_DEV_SITE_URL'
    throw new Error(
      `Missing required environment variable: ${envVar}\n` +
        'Set it in:\n' +
        `  Development: .env.local (VITE_DEV_SITE_URL=https://localhost:3000)\n` +
        `  Production: Convex Dashboard → Environment Variables (VITE_SITE_URL=https://yourdomain.com)`,
    )
  }
  return siteUrl
}

/**
 * Get the correct GitHub Client ID based on deployment
 * Returns GITHUB_CLIENT_ID in production, DEV_GITHUB_CLIENT_ID otherwise
 */
function getGithubClientId(): string {
  const isProduction = isProductionDeployment()
  const clientId = isProduction
    ? process.env['GITHUB_CLIENT_ID']
    : process.env['DEV_GITHUB_CLIENT_ID']

  console.log('[Auth Config] GitHub Client ID selection:', {
    CONVEX_DEPLOYMENT: process.env['CONVEX_DEPLOYMENT'],
    isProduction,
    selectedClientId: clientId,
    availableIds: {
      prod: process.env['GITHUB_CLIENT_ID'],
      dev: process.env['DEV_GITHUB_CLIENT_ID'],
    },
  })

  return clientId as string
}

/**
 * Get the correct GitHub Client Secret based on deployment
 * Returns GITHUB_CLIENT_SECRET in production, DEV_GITHUB_CLIENT_SECRET otherwise
 */
function getGithubClientSecret(): string {
  const isProduction = isProductionDeployment()
  const clientSecret = isProduction
    ? process.env['GITHUB_CLIENT_SECRET']
    : process.env['DEV_GITHUB_CLIENT_SECRET']
  return clientSecret as string
}

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  const siteUrl = getSiteUrl()
  const githubClientId = getGithubClientId()
  const githubClientSecret = getGithubClientSecret()

  console.log('[Auth Config] Better Auth initialization:', {
    NODE_ENV: process.env['NODE_ENV'],
    baseURL: siteUrl,
    githubClientId: githubClientId,
    hasGithubClientSecret: !!githubClientSecret,
    optionsOnly,
  })

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
        clientId: githubClientId,
        clientSecret: githubClientSecret,
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
