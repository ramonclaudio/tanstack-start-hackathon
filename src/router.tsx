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

export function getRouter() {
  const CONVEX_URL = import.meta.env.VITE_CONVEX_URL
  if (!CONVEX_URL) {
    console.error('missing envar VITE_CONVEX_URL')
  }
  const convexQueryClient = new ConvexQueryClient(CONVEX_URL || '')

  const queryClient: QueryClient = new QueryClient({
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
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = routerWithQueryClient(
    createRouter({
      routeTree,
      defaultPreload: 'intent',
      context: { queryClient },
      scrollRestoration: true,
      Wrap: ({ children }) => (
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
      ),
    }),
    queryClient,
  )

  // Initialize Sentry for client-side error tracking
  if (typeof window !== 'undefined') {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.tanstackRouterBrowserTracingIntegration(router),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      // Performance monitoring: 10% of transactions in production
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      // Session replay: 25% for low traffic (<10k sessions/day) per Sentry recommendations
      replaysSessionSampleRate: import.meta.env.PROD ? 0.25 : 1.0,
      // Error replay: 100% of errors get full session replay for debugging
      replaysOnErrorSampleRate: 1.0,
      sendDefaultPii: true,
    })
  }

  return router
}
