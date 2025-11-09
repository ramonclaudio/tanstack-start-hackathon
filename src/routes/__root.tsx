import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { ErrorBoundary } from '../components/ErrorBoundary'
import Footer from '../components/layout/Footer'
import Header from '../components/layout/Header'
import { ThemeProvider } from '../components/theme/ThemeProvider'
import { Button } from '../components/ui/button'
import { Toaster } from '../components/ui/sonner'

import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  errorComponent: ({ error }) => {
    return <ErrorBoundary error={error} />
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
        title: 'Tanvex - TanStack Start + Convex Production Stack',
      },
      {
        name: 'description',
        content:
          'Production-ready full-stack application built with TanStack Start, Convex, and Bun. Features authentication, payments, and real-time data.',
      },
      {
        property: 'og:title',
        content: 'Tanvex - TanStack Start + Convex Production Stack',
      },
      {
        property: 'og:description',
        content:
          'Production-ready full-stack application with authentication and payments.',
      },
      {
        property: 'og:type',
        content: 'website',
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
          <ErrorBoundary>
            <Header />
            <main className="flex-1 flex flex-col overflow-y-auto py-6">
              {children}
            </main>
            <Footer />
            <Toaster />
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
          </ErrorBoundary>
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
