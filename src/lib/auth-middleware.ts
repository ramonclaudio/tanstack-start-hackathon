import { redirect } from '@tanstack/react-router'
import { authClient } from '@/lib/auth'

/**
 * Auth middleware for protected routes.
 * Use in beforeLoad hooks. Handles auth check and redirect.
 */
export async function requireAuth(location: { href: string }) {
  const { data: session } = await authClient.getSession()

  if (!session?.user) {
    throw redirect({
      to: '/auth/sign-in',
      search: { redirect: location.href },
    })
  }

  return session.user
}

/**
 * Auth middleware for public-only routes (sign-in, sign-up).
 * Redirects to dashboard if already authenticated.
 */
export async function requireGuest(defaultRedirect = '/dashboard') {
  const { data: session } = await authClient.getSession()

  if (session?.user) {
    throw redirect({ to: defaultRedirect })
  }
}
