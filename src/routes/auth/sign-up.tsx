import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import * as Sentry from '@sentry/tanstackstart-react'
import { authClient, useSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SignUpCardSkeleton } from '@/components/skeletons'
import {
  AuthFormDivider,
  AuthFormFooter,
  GitHubSignInButton,
} from '@/components/auth/shared'

export const Route = createFileRoute('/auth/sign-up')({
  component: SignUp,
})

function SignUp() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isPending && session?.user) {
      navigate({ to: '/dashboard' })
    }
  }, [isPending, session?.user, navigate])

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await authClient.signUp.email(
        {
          name,
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
        err instanceof Error ? err.message : 'Failed to sign up'
      setError(errorMessage)
      Sentry.captureException(err, {
        tags: {
          route: 'sign-up',
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
    return <SignUpCardSkeleton />
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Enter your information to create a new account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading || isPending}
              />
            </div>
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
                minLength={8}
              />
            </div>
            {error && <div className="text-sm text-red-500">{error}</div>}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isPending}
            >
              {isLoading || isPending ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>

          <AuthFormDivider />

          <GitHubSignInButton
            disabled={isLoading || isPending}
            route="sign-up"
            onError={setError}
            onLoadingChange={setIsLoading}
          />

          <AuthFormFooter
            mode="sign-up"
            onToggle={() => navigate({ to: '/auth/sign-in' })}
          />
        </CardContent>
      </Card>
    </div>
  )
}
