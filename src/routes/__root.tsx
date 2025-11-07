import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import * as Sentry from '@sentry/tanstackstart-react'
import { useEffect } from 'react'
import { AppErrorBoundary } from '../components/AppErrorBoundary'

import Footer from '../components/Footer'
import Header from '../components/Header'
import { GlobalLoadingProvider } from '../components/GlobalLoading'
import { ThemeProvider } from '../components/ThemeProvider'
import { Button } from '../components/ui/button'

import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  errorComponent: ({ error }) => {
    useEffect(() => {
      Sentry.captureException(error)
    }, [error])
    return <AppErrorBoundary error={error} />
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Tanvex',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex flex-col h-screen">
        <ThemeProvider>
          <GlobalLoadingProvider>
            <AppErrorBoundary>
              <Header />
              <main className="flex-1 flex flex-col overflow-y-auto py-6">
                {children}
              </main>
              <Footer />
              {import.meta.env.PROD ? null : (
                <TanStackDevtools
                  config={{ position: 'bottom-left' }}
                  plugins={[
                    {
                      name: 'Tanstack Router',
                      render: <TanStackRouterDevtoolsPanel />,
                    },
                  ]}
                />
              )}
            </AppErrorBoundary>
          </GlobalLoadingProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight">404</h1>
          <h2 className="text-2xl font-semibold tracking-tight">
            Page Not Found
          </h2>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist.
          </p>
        </div>
        <Button asChild>
          <Link to="/">Go Back Home</Link>
        </Button>
      </div>
    </div>
  )
}
