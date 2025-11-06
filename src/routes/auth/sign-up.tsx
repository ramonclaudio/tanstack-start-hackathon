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
import { SignUpCardSkeleton } from '@/components/skeletons'

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

  // If already signed in (or once session resolves), redirect to dashboard
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
            emailDomain: email.split('@')[1] || 'unknown', // Only send domain for privacy
          },
        },
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGitHubSignIn = async () => {
    setError('')
    setIsLoading(true)
    try {
      await authClient.signIn.social({
        provider: 'github',
      })
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to sign in with GitHub'
      setError(errorMessage)
      Sentry.captureException(err, {
        tags: {
          route: 'sign-up',
          method: 'github',
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
        <>
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGitHubSignIn}
              disabled={isLoading || isPending}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33c.85 0 1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z"
                />
              </svg>
              GitHub
            </Button>

            <div className="text-center text-sm">
              Already have an account?{' '}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate({ to: '/auth/sign-in' })}
              >
                Sign in
              </Button>
            </div>
          </CardContent>
        </>
      </Card>
    </div>
  )
}
