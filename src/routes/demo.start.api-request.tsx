import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/lib/auth-client'

export const Route = createFileRoute('/demo/start/api-request')({
  component: Home,
})

function Home() {
  const { isPending } = useSession()
  const { data: demos } = useSuspenseQuery(convexQuery(api.demos.get, {}))

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-6 -mt-3">
      <div className="w-full max-w-2xl space-y-8">
        {isPending ? (
          <>
            <div className="text-center space-y-2">
              <Skeleton className="h-9 w-72 mx-auto" />
              <Skeleton className="h-6 w-96 mx-auto" />
            </div>

            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </>
        ) : (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Convex Query Demo
              </h1>
              <p className="text-muted-foreground">
                Fetch and display demo tasks from Convex with real-time updates
              </p>
            </div>

            <div className="space-y-4">
              {demos.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No demo tasks found. Add some data to the demos table!
                </p>
              ) : (
                <ul className="space-y-2">
                  {demos.map((item: any) => (
                    <li
                      key={item._id}
                      className="border rounded-lg p-4 bg-card text-card-foreground"
                    >
                      {item.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
