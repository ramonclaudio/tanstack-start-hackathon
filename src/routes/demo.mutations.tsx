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

export const Route = createFileRoute('/demo/mutations')({
  component: ExampleMutations,
})

function ExampleMutations() {
  const { data: mutations, isLoading } = useQuery(
    convexQuery(api.demo_mutations.get, {
      paginationOpts: { numItems: 50, cursor: null },
    }),
  )

  const addMutation = useConvexMutation(api.demo_mutations.add)
  const removeMutation = useConvexMutation(api.demo_mutations.remove)

  const [todo, setTodo] = useState('')

  const submitTodo = useCallback(async () => {
    if (todo.trim()) {
      try {
        await addMutation({ text: todo })
        setTodo('')
        toast.success('Item added successfully')
      } catch (error) {
        const errorMessage =
          error instanceof ConvexError
            ? (error.data as { message?: string })?.message ||
              'Failed to add item'
            : 'An unexpected error occurred'

        logger.error('Failed to add mutation', error, {
          component: 'demo.mutations',
          action: 'submitTodo',
        })

        toast.error(errorMessage)
      }
    }
  }, [addMutation, todo])

  const handleRemove = useCallback(
    async (id: Id<'demo_mutations'>) => {
      try {
        await removeMutation({ id })
        toast.success('Item removed successfully')
      } catch (error) {
        const errorMessage =
          error instanceof ConvexError
            ? (error.data as { message?: string })?.message ||
              'Failed to remove item'
            : 'An unexpected error occurred'

        logger.error('Failed to remove mutation', error, {
          component: 'demo.mutations',
          action: 'handleRemove',
          itemId: id,
        })

        toast.error(errorMessage)
      }
    },
    [removeMutation],
  )

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-6 -mt-2">
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
              <div className="flex gap-2">
                <Skeleton className="flex-1 h-14 rounded-md" />
                <Skeleton className="h-14 w-24 rounded-md" />
              </div>
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
              {mutations?.page?.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No mutations yet. Add one below!
                </p>
              ) : (
                <ul className="space-y-2">
                  {mutations?.page?.map(
                    (m: { _id: Id<'demo_mutations'>; text: string }) => (
                      <li
                        key={m._id}
                        className="border rounded-lg p-4 bg-card text-card-foreground h-14 flex items-center justify-between gap-4"
                      >
                        <span>{m.text}</span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemove(m._id)}
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
                  placeholder="Enter a new item..."
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
