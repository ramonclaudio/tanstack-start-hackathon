import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { authClient, useSession } from '@/lib/auth'
import { requireGuest } from '@/lib/auth-middleware'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AuthFormDivider,
  AuthFormFooter,
  GitHubSignInButton,
} from '@/components/auth/AuthUI'

export const Route = createFileRoute('/auth/sign-in')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: search['redirect'] as string | undefined,
    }
  },
  beforeLoad: async ({ location }) =>
    requireGuest({ defaultRedirect: '/dashboard', location }),
  component: SignIn,
})

function SignIn() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const router = useRouter()
  const search = Route.useSearch()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isPending && session?.user) {
      const redirectTo = search?.redirect
      if (redirectTo) {
        router.history.push(redirectTo)
      } else {
        navigate({ to: '/dashboard' })
      }
    }
  }, [isPending, session?.user, navigate, router, search?.redirect])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await authClient.signIn.email(
        {
          email,
          password,
        },
        {
          onSuccess: () => {
            const redirectTo = search?.redirect
            if (redirectTo) {
              router.history.push(redirectTo)
            } else {
              navigate({ to: '/dashboard' })
            }
          },
        },
      )
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to sign in'
      setError(errorMessage)
      logger.error(
        'Sign in failed',
        err,
        {
          route: 'sign-in',
          method: 'email',
          emailDomain: email.split('@')[1] || 'unknown',
        },
        {
          tags: {
            route: 'sign-in',
            method: 'email',
          },
          contexts: {
            auth: {
              emailDomain: email.split('@')[1] || 'unknown',
            },
          },
        },
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>
            Enter your email and password to sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPending ? (
            <>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
                <Skeleton className="h-9 w-full rounded-md" />
              </form>
              <AuthFormDivider />
              <Skeleton className="h-9 w-full rounded-md" />
              <div className="text-center">
                <Skeleton className="h-5 w-56 mx-auto" />
              </div>
            </>
          ) : (
            <>
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                {error && <div className="text-sm text-red-500">{error}</div>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <AuthFormDivider />

              <GitHubSignInButton
                disabled={isLoading}
                route="sign-in"
                onError={setError}
                onLoadingChange={setIsLoading}
              />

              <AuthFormFooter
                mode="sign-in"
                onToggle={() => navigate({ to: '/auth/sign-up' })}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
