import * as Sentry from '@sentry/tanstackstart-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

interface GitHubSignInButtonProps {
  disabled?: boolean
  route: 'sign-in' | 'sign-up'
  onError: (error: string) => void
  onLoadingChange: (loading: boolean) => void
}

export function GitHubSignInButton({
  disabled,
  route,
  onError,
  onLoadingChange,
}: GitHubSignInButtonProps) {
  const handleGitHubSignIn = async () => {
    onError('')
    onLoadingChange(true)
    try {
      await authClient.signIn.social({ provider: 'github' })
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to sign in with GitHub'
      onError(errorMessage)
      Sentry.captureException(err, {
        tags: {
          route,
          method: 'github',
        },
      })
    } finally {
      onLoadingChange(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleGitHubSignIn}
      disabled={disabled}
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33c.85 0 1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z"
        />
      </svg>
      GitHub
    </Button>
  )
}

export function AuthFormDivider() {
  return (
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
  )
}

interface AuthFormFooterProps {
  mode: 'sign-in' | 'sign-up'
  onToggle: () => void
}

export function AuthFormFooter({ mode, onToggle }: AuthFormFooterProps) {
  return (
    <div className="text-center text-sm">
      {mode === 'sign-in'
        ? "Don't have an account? "
        : 'Already have an account? '}
      <Button variant="link" className="p-0 h-auto" onClick={onToggle}>
        {mode === 'sign-in' ? 'Sign up' : 'Sign in'}
      </Button>
    </div>
  )
}
