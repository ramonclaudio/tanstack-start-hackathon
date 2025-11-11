import { useEffect, useState } from 'react'

/**
 * ClientOnly component prevents hydration mismatches by only rendering
 * children on the client after hydration is complete.
 *
 * Use this for components that:
 * - Call external APIs
 * - Use browser-only features
 * - Have non-deterministic rendering (Date.now(), Math.random(), etc.)
 *
 * @see https://tanstack.com/start/latest/docs/framework/react/guide/hydration-errors
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
