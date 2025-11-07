import { useEffect } from 'react'
import { useGlobalLoading } from '@/components/GlobalLoading'

export function usePageLoading(isLoading: boolean | Array<boolean>) {
  const { setPageLoading } = useGlobalLoading()

  const loading = Array.isArray(isLoading) ? isLoading.some(Boolean) : isLoading

  useEffect(() => {
    setPageLoading(loading)
    return () => setPageLoading(false)
  }, [loading, setPageLoading])

  return loading
}
