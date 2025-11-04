import { useCustomer } from 'autumn-js/react'
import { useSession } from '@/lib/auth-client'

/**
 * Hook to ensure Better Auth users are synced to Autumn customers.
 * Customer creation happens automatically through Autumn's identify function
 * when useCustomer() is called. This ensures 1:1 parity between users and customers.
 *
 * Simply calling useCustomer() when a user is authenticated will:
 * 1. Call the identify function in convex/autumn.ts
 * 2. Automatically create an Autumn customer if one doesn't exist
 * 3. Return the customer data
 *
 * NOTE: This hook should only be called when a user is authenticated.
 */
export function useAutumnSync() {
  const { data: session, isPending: sessionPending } = useSession()
  // Use consistent options to share the same query instance across the app
  const { customer, isLoading, error, refetch } = useCustomer({
    errorOnNotFound: false,
  })

  // Identify will return null until a user exists; treat session-pending as syncing
  const isSynced = Boolean(session?.user && customer)

  return {
    isSyncing: sessionPending || isLoading,
    isSynced,
    error,
    customer,
    refetch,
  }
}
