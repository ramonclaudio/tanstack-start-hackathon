import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { AutumnProvider } from 'autumn-js/react'
import * as Sentry from '@sentry/tanstackstart-react'
import { api } from '../convex/_generated/api'
import { routeTree } from './routeTree.gen'
import { authClient } from './lib/auth-client'
import { AuthErrorBoundary } from './components/AuthErrorBoundary'
import { validateClientEnv } from './lib/env'
import { logger } from './lib/logger'
import type { AnyRouter } from '@tanstack/react-router'

export function getRouter(): AnyRouter {
  // Note: No singleton pattern - create fresh instance each time
  // TanStack Router handles its own internal caching and state management
  const isClient = typeof window !== 'undefined'

  // Validate environment variables on startup
  const env = validateClientEnv()

  // Only log on client side to avoid SSR spam
  if (isClient) {
    logger.app.info('Environment validated', {
      mode: env.MODE,
      hasSentry: !!env.VITE_SENTRY_DSN,
    })
  }

  const convexQueryClient = new ConvexQueryClient(env.VITE_CONVEX_URL)

  if (isClient) {
    logger.api.info('Convex client initialized', { url: env.VITE_CONVEX_URL })
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        // Convex data is never stale - updates pushed via WebSocket
        // refetch options are ignored since queries are always up to date
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        // Subscriptions stay active for 5 mins after unmount by default (gcTime)
        // Override per query if needed with { gcTime: 10000 }
        gcTime: 5 * 60 * 1000, // 5 minutes
        // Deduplicate requests - prevent multiple identical queries
        staleTime: 0, // Data is always fresh with Convex WebSocket
        // Retry configuration for failed queries
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error instanceof Error && error.message.includes('4')) {
            logger.api.debug('Query failed with client error, not retrying', {
              error: error.message,
              failureCount,
            })
            return false
          }
          // Retry up to 3 times with exponential backoff
          const shouldRetry = failureCount < 3
          if (shouldRetry) {
            logger.api.warn(`Query retry attempt ${failureCount + 1}`, {
              error: error instanceof Error ? error.message : String(error),
            })
          }
          return shouldRetry
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        // Retry configuration for failed mutations
        retry: false, // Don't retry mutations by default
      },
    },
  })
  convexQueryClient.connect(queryClient)

  if (isClient) {
    logger.api.info('Query client connected to Convex')
  }

  const router = routerWithQueryClient(
    createRouter({
      routeTree,
      defaultPreload: 'intent',
      context: { queryClient },
      scrollRestoration: true,
      Wrap: ({ children }) => (
        <AuthErrorBoundary>
          <ConvexBetterAuthProvider
            client={convexQueryClient.convexClient}
            authClient={authClient}
          >
            <AutumnProvider
              convex={convexQueryClient.convexClient}
              convexApi={api.autumn}
            >
              {children}
            </AutumnProvider>
          </ConvexBetterAuthProvider>
        </AuthErrorBoundary>
      ),
    }),
    queryClient,
  )

  // Initialize Sentry for client-side error tracking (only once per session)
  if (isClient && env.VITE_SENTRY_DSN && !(window as any).__sentryInitialized) {
    logger.app.info('Initializing Sentry for error tracking', {
      environment: env.MODE,
      tracesSampleRate: env.PROD ? 0.1 : 1.0,
    })

    Sentry.init({
      dsn: env.VITE_SENTRY_DSN,
      environment: env.MODE,
      integrations: [
        Sentry.tanstackRouterBrowserTracingIntegration(router),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      // Performance monitoring: 10% of transactions in production
      tracesSampleRate: env.PROD ? 0.1 : 1.0,
      // Session replay: 25% for low traffic (<10k sessions/day) per Sentry recommendations
      replaysSessionSampleRate: env.PROD ? 0.25 : 1.0,
      // Error replay: 100% of errors get full session replay for debugging
      replaysOnErrorSampleRate: 1.0,
      // Disable PII for privacy compliance
      sendDefaultPii: false,
    })
    ;(
      window as Window & { __sentryInitialized?: boolean }
    ).__sentryInitialized = true
  }

  return router
}
