'use client'
import { AutumnProvider } from 'autumn-js/react'
import { useConvex } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AutumnErrorBoundary } from '@/components/AutumnErrorBoundary'

export function AutumnWrapper({ children }: { children: React.ReactNode }) {
  const convex = useConvex()

  // Always provide the AutumnProvider context
  // Components should handle loading states internally using useCustomer({ errorOnNotFound: false })
  return (
    <AutumnErrorBoundary>
      <AutumnProvider convex={convex} convexApi={(api as any).autumn}>
        {children}
      </AutumnProvider>
    </AutumnErrorBoundary>
  )
}

/**
 * Note: We don't need a separate sync wrapper anymore.
 * Customer creation happens automatically when any component calls useCustomer().
 * The AutumnWrapper now only waits for session to be ready before mounting the provider.
 */
