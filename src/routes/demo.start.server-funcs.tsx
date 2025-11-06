import { useCallback, useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { X } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FormRowSkeleton,
  HeroSkeleton,
  ListSkeleton,
} from '@/components/skeletons'
import { useSession } from '@/lib/auth-client'
import { useGlobalLoading } from '@/components/GlobalLoading'

export const Route = createFileRoute('/demo/start/server-funcs')({
  component: Home,
})

function Home() {
  const { isPending } = useSession()
  const { setPageLoading } = useGlobalLoading()
  const { data: tasks, isLoading: tasksLoading } = useQuery(
    convexQuery(api.tasks.get, {}),
  )

  useEffect(() => {
    setPageLoading(isPending || tasksLoading)
    return () => setPageLoading(false)
  }, [isPending, tasksLoading, setPageLoading])

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
        {isPending || tasksLoading ? (
          <>
            <HeroSkeleton />
            <div className="space-y-4">
              <ListSkeleton count={3} className="h-14" />
              <FormRowSkeleton />
            </div>
          </>
        ) : (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">
                Convex Mutations Demo
              </h1>
              <p className="text-muted-foreground">
                Add and manage todos using Convex mutations with real-time
                updates
              </p>
            </div>

            <div className="space-y-4">
              {tasks?.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No tasks yet. Add one below!
                </p>
              ) : (
                <ul className="space-y-2">
                  {tasks?.map((t: any) => (
                    <li
                      key={t._id}
                      className="border rounded-lg p-4 bg-card text-card-foreground h-14 flex items-center justify-between gap-4"
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
