import { useReducer } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAction } from 'convex/react'
import { AlertCircle, Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { api } from '../../../convex/_generated/api'
import {
  CodeRabbitReportForm,
  getCodeRabbitReportPayload,
} from './CodeRabbitReportForm'
import type { CodeRabbitReportFormData } from './CodeRabbitReportForm'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

/**
 * Form state type
 */
type FormState = {
  fromDate: Date | undefined
  toDate: Date | undefined
  coderabbitFormData: CodeRabbitReportFormData
}

/**
 * Form actions
 */
type FormAction =
  | { type: 'SET_FROM_DATE'; date: Date | undefined }
  | { type: 'SET_TO_DATE'; date: Date | undefined }
  | { type: 'SET_CODERABBIT_DATA'; data: CodeRabbitReportFormData }

/**
 * Form reducer
 */
function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FROM_DATE':
      return { ...state, fromDate: action.date }
    case 'SET_TO_DATE':
      return { ...state, toDate: action.date }
    case 'SET_CODERABBIT_DATA':
      return { ...state, coderabbitFormData: action.data }
    default:
      return state
  }
}

/**
 * Report form with client-side data submission.
 *
 * ARCHITECTURE NOTE:
 * Route loader prefetches api.user.getUser during SSR, ensuring Convex auth is synced
 * before this component renders. No defensive skeleton needed.
 */
export function ReportForm() {
  const generateCodeRabbitReport = useAction(
    api.coderabbit.generateAndSaveReport,
  )

  // Consolidated form state
  const [state, dispatch] = useReducer(formReducer, {
    fromDate: undefined,
    toDate: undefined,
    coderabbitFormData: {
      promptTemplate: 'Select template',
      customPrompt: '',
      groupBy: 'NONE',
      subgroupBy: 'NONE',
      orgId: '',
      filters: [],
    },
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (!state.fromDate || !state.toDate) {
        throw new Error('Please select both start and end dates')
      }
      if (
        !state.coderabbitFormData.promptTemplate ||
        state.coderabbitFormData.promptTemplate === 'Select template'
      ) {
        throw new Error('Please select a report template')
      }
      const payload = getCodeRabbitReportPayload(state.coderabbitFormData)
      const reportId = await generateCodeRabbitReport({
        from: format(state.fromDate, 'yyyy-MM-dd'),
        to: format(state.toDate, 'yyyy-MM-dd'),
        ...payload,
      })
      return reportId
    },
    onSuccess: () => {
      // Auto-reset mutation after 3 seconds to allow re-submission
      setTimeout(() => {
        mutation.reset()
      }, 3000)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Generate Activity Reports</CardTitle>
        <CardDescription>
          Create reports from multiple providers. This may take up to 10 minutes
          per provider.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date Range with Calendar Pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-11',
                      !state.fromDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {state.fromDate
                      ? format(state.fromDate, 'PPP')
                      : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={state.fromDate}
                    onSelect={(date) =>
                      dispatch({ type: 'SET_FROM_DATE', date })
                    }
                    disabled={(date) =>
                      date > new Date() ||
                      (state.toDate ? date > state.toDate : false)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-11',
                      !state.toDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {state.toDate ? format(state.toDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={state.toDate}
                    onSelect={(date) => dispatch({ type: 'SET_TO_DATE', date })}
                    disabled={(date) =>
                      date > new Date() ||
                      (state.fromDate ? date < state.fromDate : false)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="border-t pt-6">
            <CodeRabbitReportForm
              value={state.coderabbitFormData}
              onChange={(data) =>
                dispatch({ type: 'SET_CODERABBIT_DATA', data })
              }
            />
          </div>

          {/* Error Display */}
          {mutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : 'Failed to generate report'}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {mutation.isSuccess && (
            <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
              <AlertDescription className="text-green-700 dark:text-green-400">
                Report generated successfully! View it in the reports list
                below.
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={
              mutation.isPending ||
              !state.fromDate ||
              !state.toDate ||
              !state.coderabbitFormData.promptTemplate ||
              state.coderabbitFormData.promptTemplate === 'Select template'
            }
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Report...
              </>
            ) : (
              'Generate Report'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
