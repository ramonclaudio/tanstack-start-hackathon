import { createContext, useContext, useEffect } from 'react'
import { authClient } from './auth'
import { logger } from './logger'

import type { BetterFetchError } from '@better-fetch/fetch'

type Session = typeof authClient.$Infer.Session

interface AuthContextValue {
  session: Session | null
  isLoading: boolean
  isError: boolean
  error: BetterFetchError | null
  refetch: (queryParams?: { query?: Record<string, unknown> }) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending, error, refetch } = authClient.useSession()

  const isLoading = isPending
  const isError = error !== null
  const sessionData = session ?? null

  useEffect(() => {
    if (isError && error) {
      logger.auth.error('Session fetch failed', error, {
        status: error.status,
        statusText: error.statusText,
      })
    } else if (!isLoading) {
      logger.auth.debug('Session state updated', {
        authenticated: sessionData !== null,
        userId: sessionData?.user?.id,
      })
    }
  }, [sessionData, isLoading, isError, error])

  return (
    <AuthContext.Provider
      value={{ session: sessionData, isLoading, isError, error, refetch }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
