'use client'
import { AutumnProvider } from 'autumn-js/react'
import { useConvex } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useSession } from '@/lib/auth-client'

export function AutumnWrapper({ children }: { children: React.ReactNode }) {
  const convex = useConvex()
  const { isPending: sessionPending } = useSession()

  // Wait for session to be ready before initializing Autumn
  // This prevents Autumn queries from running before Better Auth validates the session in Convex
  if (sessionPending) {
    return <>{children}</>
  }

  return (
    <AutumnProvider convex={convex} convexApi={(api as any).autumn}>
      {children}
    </AutumnProvider>
  )
}

/**
 * Note: We don't need a separate sync wrapper anymore.
 * Customer creation happens automatically when any component calls useCustomer().
 * The AutumnWrapper now only waits for session to be ready before mounting the provider.
 */
