import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import * as Sentry from '@sentry/tanstackstart-react'
import { authClient, useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthCardSkeleton } from '@/components/skeletons'
import {
  AuthFormDivider,
  AuthFormFooter,
  GitHubSignInButton,
} from '@/components/auth/shared'

export const Route = createFileRoute('/auth/sign-in')({
  component: SignIn,
})

function SignIn() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isPending && session?.user) {
      navigate({ to: '/dashboard' })
    }
  }, [isPending, session?.user, navigate])

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
            navigate({ to: '/dashboard' })
          },
        },
      )
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to sign in'
      setError(errorMessage)
      Sentry.captureException(err, {
        tags: {
          route: 'sign-in',
          method: 'email',
        },
        contexts: {
          auth: {
            emailDomain: email.split('@')[1] || 'unknown',
          },
        },
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isPending) {
    return <AuthCardSkeleton />
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
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || isPending}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading || isPending}
              />
            </div>
            {error && <div className="text-sm text-red-500">{error}</div>}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isPending}
            >
              {isLoading || isPending ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <AuthFormDivider />

          <GitHubSignInButton
            disabled={isLoading || isPending}
            route="sign-in"
            onError={setError}
            onLoadingChange={setIsLoading}
          />

          <AuthFormFooter
            mode="sign-in"
            onToggle={() => navigate({ to: '/auth/sign-up' })}
          />
        </CardContent>
      </Card>
    </div>
  )
}
