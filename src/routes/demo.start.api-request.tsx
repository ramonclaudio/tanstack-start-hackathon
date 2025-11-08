import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/lib/auth'
import { usePageLoading } from '@/lib/hooks'

export const Route = createFileRoute('/demo/start/api-request')({
  component: Home,
})

function Home() {
  const { isPending } = useSession()
  const { data: demos, isLoading: demosLoading } = useQuery(
    convexQuery(api.demos.get, {
      paginationOpts: { numItems: 50, cursor: null },
    }),
  )

  const isLoading = usePageLoading([isPending, demosLoading])

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-6 -mt-3">
      <div className="w-full max-w-2xl space-y-8">
        {isLoading ? (
          <>
            <div className="text-center space-y-5">
              <Skeleton className="h-9 w-80 mx-auto" />
              <Skeleton className="h-5 w-full max-w-xl mx-auto" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">
                Convex Query Demo
              </h1>
              <p className="text-muted-foreground">
                Fetch and display demo tasks from Convex with real-time updates
              </p>
            </div>

            <div className="space-y-4">
              {demos?.page?.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No demo tasks found. Add some data to the demos table!
                </p>
              ) : (
                <ul className="space-y-2">
                  {demos?.page?.map((item) => (
                    <li
                      key={item._id}
                      className="border rounded-lg p-4 bg-card text-card-foreground h-14 flex items-center"
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
