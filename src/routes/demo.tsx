import { useCallback, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { ConvexError } from 'convex/values'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { logger } from '@/lib/logger'

export const Route = createFileRoute('/demo')({
  component: TaskMutations,
})

function TaskMutations() {
  const { data: tasks, isLoading } = useQuery(
    convexQuery(api.tasks.list, {
      paginationOpts: { numItems: 50, cursor: null },
    }),
  )

  const createTask = useConvexMutation(api.tasks.create)
  const removeTask = useConvexMutation(api.tasks.remove)

  const [taskText, setTaskText] = useState('')

  const submitTask = useCallback(async () => {
    if (taskText.trim()) {
      try {
        await createTask({ text: taskText })
        setTaskText('')
        toast.success('Task created successfully')
      } catch (error) {
        const errorMessage =
          error instanceof ConvexError
            ? (error.data as { message?: string })?.message ||
              'Failed to create task'
            : 'An unexpected error occurred'

        logger.error('Failed to create task', error, {
          component: 'tasks.mutations',
          action: 'submitTask',
        })

        toast.error(errorMessage)
      }
    }
  }, [createTask, taskText])

  const handleRemove = useCallback(
    async (id: Id<'tasks'>) => {
      try {
        await removeTask({ id })
        toast.success('Task deleted successfully')
      } catch (error) {
        const errorMessage =
          error instanceof ConvexError
            ? (error.data as { message?: string })?.message ||
              'Failed to delete task'
            : 'An unexpected error occurred'

        logger.error('Failed to remove task', error, {
          component: 'tasks.mutations',
          action: 'handleRemove',
          taskId: id,
        })

        toast.error(errorMessage)
      }
    },
    [removeTask],
  )

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-6 -mt-2">
      <div className="w-full max-w-2xl space-y-8">
        {isLoading ? (
          <>
            <div className="text-center space-y-5">
              <Skeleton className="h-10 w-80 mx-auto" />
              <Skeleton className="h-5 w-full max-w-xl mx-auto" />
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Skeleton className="flex-1 h-14 rounded-md" />
                <Skeleton className="h-14 w-20 rounded-md" />
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">
                Convex Tasks Demo
              </h1>
              <p className="text-muted-foreground">
                Add and manage tasks with real-time updates using Convex
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      submitTask()
                    }
                  }}
                  placeholder="Enter a new item..."
                  className="flex-1 h-14"
                />
                <Button
                  disabled={taskText.trim().length === 0}
                  onClick={submitTask}
                  className="h-14 px-8"
                >
                  Add
                </Button>
              </div>

              {tasks?.page?.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No tasks yet. Add one above!
                </p>
              ) : (
                <ul className="space-y-2">
                  {tasks?.page?.map(
                    (task: { _id: Id<'tasks'>; text: string }) => (
                      <li
                        key={task._id}
                        className="border rounded-lg p-4 bg-card text-card-foreground h-14 flex items-center justify-between gap-4"
                      >
                        <span>{task.text}</span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemove(task._id)}
                          className="shrink-0"
                          aria-label="Delete item"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
