/**
 * Custom hook for managing page loading state
 * Automatically syncs with global loading indicator
 */

import { useEffect } from 'react'
import { useGlobalLoading } from '@/components/GlobalLoading'

/**
 * Syncs page loading state with global loading indicator
 * @param isLoading - Boolean or array of booleans indicating loading state
 * @example
 * // Single loading state
 * usePageLoading(isPending)
 *
 * // Multiple loading states
 * usePageLoading([isPending, dataLoading, userLoading])
 */
export function usePageLoading(isLoading: boolean | Array<boolean>) {
  const { setPageLoading } = useGlobalLoading()

  const loading = Array.isArray(isLoading) ? isLoading.some(Boolean) : isLoading

  useEffect(() => {
    setPageLoading(loading)
    return () => setPageLoading(false)
  }, [loading, setPageLoading])

  return loading
}
