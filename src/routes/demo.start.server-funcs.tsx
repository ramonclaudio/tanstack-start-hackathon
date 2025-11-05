import { useCallback, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { X } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/lib/auth-client'

export const Route = createFileRoute('/demo/start/server-funcs')({
  component: Home,
})

function Home() {
  const { isPending } = useSession()
  const { data: tasks } = useSuspenseQuery(convexQuery(api.tasks.get, {}))
  const addTask = useConvexMutation(api.tasks.add)
  const removeTask = useConvexMutation(api.tasks.remove)

  const [todo, setTodo] = useState('')

  const submitTodo = useCallback(async () => {
    if (todo.trim()) {
      await addTask({ text: todo })
      setTodo('')
    }
  }, [addTask, todo])

  const handleRemove = useCallback(
    async (id: Id<'tasks'>) => {
      await removeTask({ id })
    },
    [removeTask],
  )

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-6 -mt-2">
      <div className="w-full max-w-2xl space-y-8">
        {isPending ? (
          <>
            <div className="text-center space-y-2">
              <Skeleton className="h-9 w-80 mx-auto" />
              <Skeleton className="h-6 w-96 mx-auto" />
            </div>

            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />

              <div className="flex gap-2">
                <Skeleton className="flex-1 h-14" />
                <Skeleton className="h-14 w-20" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Convex Mutations Demo
              </h1>
              <p className="text-muted-foreground">
                Add and manage todos using Convex mutations with real-time
                updates
              </p>
            </div>

            <div className="space-y-4">
              {tasks.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No tasks yet. Add one below!
                </p>
              ) : (
                <ul className="space-y-2">
                  {tasks.map((t: any) => (
                    <li
                      key={t._id}
                      className="border rounded-lg p-4 bg-card text-card-foreground flex items-center justify-between gap-4"
                    >
                      <span>{t.text}</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemove(t._id)}
                        className="shrink-0"
                        aria-label="Delete task"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <Input
                  type="text"
                  value={todo}
                  onChange={(e) => setTodo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      submitTodo()
                    }
                  }}
                  placeholder="Enter a new todo..."
                  className="flex-1 h-14"
                />
                <Button
                  disabled={todo.trim().length === 0}
                  onClick={submitTodo}
                  className="h-14 px-8"
                >
                  Add
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
