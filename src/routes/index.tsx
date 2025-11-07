import { createFileRoute } from '@tanstack/react-router'
import logo from '../logo.svg'
import { Button } from '@/components/ui/button'
import {
  ButtonRowSkeleton,
  HeroSkeleton,
  LogoSkeleton,
} from '@/components/skeletons'
import { useSession } from '@/lib/auth-client'
import { usePageLoading } from '@/lib/hooks/use-page-loading'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const { isPending } = useSession()
  const isLoading = usePageLoading(isPending)

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center min-h-full -my-6">
      {isLoading ? (
        <>
          <LogoSkeleton className="mb-8" />
          <div className="mb-8">
            <HeroSkeleton />
          </div>
          <ButtonRowSkeleton />
        </>
      ) : (
        <>
          <img
            src={logo}
            className="h-40 w-40 pointer-events-none animate-[spin_20s_linear_infinite] mb-8"
            alt="logo"
          />

          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Welcome to Tanvex
          </h1>

          <p className="text-muted-foreground text-lg mb-8 max-w-md">
            TanStack Start + Convex + Bun production server
          </p>

          <div className="flex gap-4">
            <Button variant="default" asChild>
              <a
                href="https://docs.convex.dev"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn Convex
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://tanstack.com/start"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn TanStack
              </a>
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
