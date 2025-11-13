import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import {
  ChevronRight,
  Clock,
  ExternalLink,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useConvex } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import { getProvider } from './provider-registry'
import { CodeRabbitIcon, CodeRabbitLogo } from './CodeRabbitBranding'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

/**
 * Reports list with client-side data fetching.
 *
 * ARCHITECTURE NOTE:
 * CodeRabbit reports require authenticated Convex context (via authComponent.getAuthUser).
 * During SSR, auth context isn't available (session is in cookies, Convex uses WebSockets).
 * Therefore, this component fetches client-side after mount when auth is ready.
 *
 * Uses Convex user query as gate to ensure WebSocket auth is synced before fetching reports.
 * This prevents race conditions without retry logic.
 */
export function ReportsList() {
  const convex = useConvex()
  const queryClient = useQueryClient()

  // Use Convex user query as auth sync gate (SSR-prefetched in route loader)
  const { data: convexUser } = useQuery(convexQuery(api.user.getUser, {}))

  // Only fetch reports after Convex auth is fully synced
  const { data, isLoading } = useQuery({
    ...convexQuery(api.coderabbit.listReports, {}),
    enabled: !!convexUser?.user,
  })
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: async (reportId: Id<'reports'>) => {
      return await convex.mutation(api.coderabbit.deleteReport, { reportId })
    },
    onSuccess: () => {
      toast.success('Report deleted')
      // Invalidate reports query to refetch
      void queryClient.invalidateQueries({
        queryKey: convexQuery(api.coderabbit.listReports, {}).queryKey,
      })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete report',
      )
    },
  })

  // If not authed or loading, show minimal skeleton
  if (!convexUser?.user || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-48" />
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const reports = data?.page ?? []

  if (reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>No reports generated yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  type Report = {
    _id: string
    provider: string
    fromDate: string
    toDate: string
    fromTimestamp: number
    toTimestamp: number
    promptTemplate?: string
    groupBy?: string
    status: 'pending' | 'completed' | 'failed'
    error?: string
    durationMs?: number
    results: Array<{ group: string; report: string }>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Reports</CardTitle>
        <CardDescription>
          View your generated activity reports ({reports.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {(reports as Array<Report>).map((report) => {
            const isExpanded = expandedReportId === report._id

            return (
              <div
                key={report._id}
                className="group border rounded-lg p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200"
              >
                <div
                  className="flex items-start justify-between gap-4 cursor-pointer"
                  onClick={() => {
                    if (
                      report.status === 'completed' &&
                      report.results.length > 0
                    ) {
                      setExpandedReportId(isExpanded ? null : report._id)
                    }
                  }}
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      {report.provider === 'coderabbit' ? (
                        <>
                          <CodeRabbitIcon className="h-4 w-4 shrink-0" />
                          <Badge variant="secondary" className="text-xs">
                            CodeRabbit
                          </Badge>
                        </>
                      ) : report.provider ? (
                        <Badge variant="secondary" className="text-xs">
                          {getProvider(report.provider)?.name ||
                            report.provider}
                        </Badge>
                      ) : null}
                      <h3 className="text-base font-semibold truncate">
                        {report.promptTemplate || 'Custom Report'}
                      </h3>
                      {report.status === 'pending' && (
                        <>
                          <Clock className="h-4 w-4 text-yellow-500 shrink-0 animate-pulse" />
                          <Badge
                            variant="outline"
                            className="border-yellow-500 text-yellow-500"
                          >
                            Pending
                          </Badge>
                        </>
                      )}
                      {report.status === 'completed' && (
                        <Badge
                          variant="outline"
                          className="border-green-500 text-green-500"
                        >
                          Completed
                        </Badge>
                      )}
                      {report.status === 'failed' && (
                        <>
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                          <Badge variant="destructive">Failed</Badge>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>
                        {new Date(
                          report.fromDate + 'T00:00:00',
                        ).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        -{' '}
                        {new Date(
                          report.toDate + 'T00:00:00',
                        ).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteMutation.mutate(report._id as Id<'reports'>)
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {report.status === 'completed' &&
                      report.results.length > 0 && (
                        <ChevronRight
                          className={`h-5 w-5 text-muted-foreground shrink-0 transition-all duration-200 ${
                            isExpanded
                              ? 'rotate-90'
                              : 'group-hover:translate-x-1'
                          }`}
                        />
                      )}
                  </div>
                </div>

                {/* Error Display */}
                {report.status === 'failed' && report.error && (
                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                    {report.error}
                  </div>
                )}

                {/* Report Results */}
                {isExpanded && report.status === 'completed' && (
                  <div className="mt-6 space-y-4">
                    {report.results.map((result, idx) => {
                      // Check if this is Daily Standup format (has PR Link markers)
                      const isDailyStandup =
                        result.report.includes('**PR Link:**')

                      if (isDailyStandup) {
                        // Split report into individual PRs for Daily Standup
                        const prs = result.report
                          .split(/(?=^- \*\*PR Link:\*\*)/m)
                          .filter((pr: string) => pr.trim())

                        return (
                          <div key={idx} className="space-y-4">
                            <h4 className="font-semibold text-lg mb-4">
                              {result.group}
                            </h4>
                            <div className="space-y-4">
                              {prs.map((pr: string, prIdx: number) => {
                                // Extract PR details for card structure
                                const prLinkMatch = pr.match(
                                  /\*\*PR Link:\*\*\s*\[(.*?)\]\((.*?)\)/,
                                )
                                const summaryMatch = pr.match(
                                  /\*\*Summary:\*\*\s*(.*?)(?=\n|$)/,
                                )
                                const nextStepsMatch = pr.match(
                                  /\*\*Next Steps:\*\*\s*(.*?)(?=\n|$)/,
                                )

                                // Extract PR number from URL or title
                                const prNumberMatch =
                                  prLinkMatch?.[1]?.match(/#(\d+)/) ||
                                  prLinkMatch?.[2]?.match(/\/pull\/(\d+)/)
                                const prNumber = prNumberMatch?.[1]

                                const prTitle =
                                  prLinkMatch?.[1]?.replace(/#\d+:?\s*/, '') ||
                                  `Pull Request ${prIdx + 1}`
                                const prUrl = prLinkMatch?.[2]
                                const summary = summaryMatch?.[1]
                                const nextSteps = nextStepsMatch?.[1]

                                return (
                                  <div
                                    key={prIdx}
                                    className="border rounded-lg p-5 hover:shadow-sm hover:border-primary/20 transition-all duration-200 space-y-4"
                                  >
                                    {/* Header */}
                                    <div className="space-y-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                                          {prNumber && (
                                            <Badge
                                              variant="secondary"
                                              className="font-mono text-xs shrink-0"
                                            >
                                              PR #{prNumber}
                                            </Badge>
                                          )}
                                          {prUrl ? (
                                            <a
                                              href={prUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-base font-semibold hover:text-primary transition-colors truncate group/link inline-flex items-center gap-2"
                                            >
                                              <span className="truncate">
                                                {prTitle}
                                              </span>
                                              <ExternalLink className="h-4 w-4 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
                                            </a>
                                          ) : (
                                            <h4 className="text-base font-semibold truncate">
                                              {prTitle}
                                            </h4>
                                          )}
                                        </div>
                                      </div>
                                      {summary && (
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                          {summary}
                                        </p>
                                      )}
                                    </div>

                                    {/* Next Steps */}
                                    {nextSteps && (
                                      <div className="pt-4 border-t space-y-2">
                                        <div className="flex items-center gap-2">
                                          <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Next Steps
                                          </p>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed pl-3.5">
                                          {nextSteps}
                                        </p>
                                      </div>
                                    )}

                                    {/* Footer */}
                                    <div className="pt-3 border-t flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                                      <span>Powered by</span>
                                      <a
                                        href="https://coderabbit.ai"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:opacity-70 transition-opacity"
                                      >
                                        <CodeRabbitLogo className="h-3.5" />
                                      </a>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      }

                      // Sprint Report / Release Notes - check if we can extract PR-level details
                      const hasMultiplePRs =
                        (result.report.match(/\[#\d+\]/g) || []).length > 1

                      if (hasMultiplePRs) {
                        // Split by PR mentions for card-based layout
                        const sections: Array<{
                          title: string
                          content: string
                        }> = []
                        const lines = result.report.split('\n')
                        let currentSection: {
                          title: string
                          content: string
                        } | null = null

                        lines.forEach((line: string) => {
                          // Match PR links like [#36](url) or **PR:** [#36](url)
                          const prMatch = line.match(/\[#(\d+)\]\((.*?)\)/)
                          if (prMatch) {
                            if (currentSection) {
                              sections.push(currentSection)
                            }
                            currentSection = {
                              title: line,
                              content: '',
                            }
                          } else if (currentSection) {
                            currentSection.content += line + '\n'
                          }
                        })

                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                        if (currentSection) {
                          sections.push(currentSection)
                        }

                        if (sections.length > 0) {
                          return (
                            <div key={idx} className="space-y-4">
                              <h4 className="font-semibold text-lg mb-4">
                                {result.group}
                              </h4>
                              <div className="space-y-4">
                                {sections.map((section, sectionIdx) => {
                                  const prMatch =
                                    section.title.match(/\[#(\d+)\]\((.*?)\)/)
                                  const titleMatch = section.title.match(
                                    /\[#\d+\]\(.*?\):?\s*(.*)/,
                                  )

                                  const prNumber = prMatch?.[1]
                                  const prUrl = prMatch?.[2]
                                  const prTitle =
                                    titleMatch?.[1]?.trim() ||
                                    `Pull Request #${prNumber}`

                                  return (
                                    <Card
                                      key={sectionIdx}
                                      className="group hover:shadow-lg hover:border-primary/20 transition-all duration-200"
                                    >
                                      <CardHeader className="pb-4 bg-card">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2">
                                              {prNumber && (
                                                <Badge
                                                  variant="secondary"
                                                  className="font-mono text-xs px-2 py-0.5"
                                                >
                                                  PR #{prNumber}
                                                </Badge>
                                              )}
                                            </div>
                                            <CardTitle className="text-base leading-tight">
                                              {prUrl ? (
                                                <Button
                                                  variant="link"
                                                  className="h-auto p-0 text-base font-semibold text-foreground hover:text-primary inline-flex items-center gap-1.5 group/link"
                                                  asChild
                                                >
                                                  <a
                                                    href={prUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                  >
                                                    <span>{prTitle}</span>
                                                    <ExternalLink className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all" />
                                                  </a>
                                                </Button>
                                              ) : (
                                                prTitle
                                              )}
                                            </CardTitle>
                                          </div>
                                        </div>
                                      </CardHeader>

                                      {section.content.trim() && (
                                        <CardContent className="pt-0">
                                          <ReactMarkdown
                                            components={{
                                              p: ({ children }) => (
                                                <p className="text-sm leading-relaxed mb-3 text-muted-foreground">
                                                  {children}
                                                </p>
                                              ),
                                              ul: ({ children }) => (
                                                <ul className="space-y-2 mb-4">
                                                  {children}
                                                </ul>
                                              ),
                                              li: ({ children }) => (
                                                <li className="text-sm leading-relaxed list-none flex items-start gap-2.5">
                                                  <span className="text-primary mt-1.5 text-xs">
                                                    ▸
                                                  </span>
                                                  <span className="flex-1">
                                                    {children}
                                                  </span>
                                                </li>
                                              ),
                                              strong: ({ children }) => (
                                                <strong className="font-semibold text-foreground">
                                                  {children}
                                                </strong>
                                              ),
                                              a: ({ href, children }) => (
                                                <Button
                                                  variant="link"
                                                  className="h-auto p-0 text-sm"
                                                  asChild
                                                >
                                                  <a
                                                    href={href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                  >
                                                    {children}
                                                  </a>
                                                </Button>
                                              ),
                                            }}
                                          >
                                            {section.content}
                                          </ReactMarkdown>
                                        </CardContent>
                                      )}

                                      <CardFooter className="border-t py-3 px-6 justify-end">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <span>Powered by</span>
                                          <Button
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0"
                                            asChild
                                          >
                                            <a
                                              href="https://coderabbit.ai"
                                              target="_blank"
                                              rel="noopener noreferrer"
                                            >
                                              <CodeRabbitLogo className="h-3.5" />
                                            </a>
                                          </Button>
                                        </div>
                                      </CardFooter>
                                    </Card>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        }
                      }

                      // Fallback: single card with full markdown (no PR structure detected)
                      return (
                        <div key={idx} className="space-y-4">
                          <h4 className="font-semibold text-lg mb-4">
                            {result.group}
                          </h4>
                          <Card className="hover:shadow-lg hover:border-primary/20 transition-all duration-200">
                            <CardContent className="py-6">
                              <ReactMarkdown
                                components={{
                                  h1: ({ children }) => (
                                    <CardTitle className="text-xl mb-6 pb-3 border-b">
                                      {children}
                                    </CardTitle>
                                  ),
                                  h2: ({ children }) => (
                                    <div className="mt-6 mb-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                        <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground text-xs">
                                          {children}
                                        </h2>
                                      </div>
                                    </div>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="text-sm font-semibold mt-4 mb-2 text-foreground/90">
                                      {children}
                                    </h3>
                                  ),
                                  p: ({ children }) => (
                                    <p className="text-sm leading-relaxed mb-4 text-muted-foreground">
                                      {children}
                                    </p>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="space-y-2 mb-5 ml-3">
                                      {children}
                                    </ul>
                                  ),
                                  li: ({ children }) => (
                                    <li className="text-sm leading-relaxed list-none flex items-start gap-2.5">
                                      <span className="text-primary mt-1.5 text-xs">
                                        ▸
                                      </span>
                                      <span className="flex-1">{children}</span>
                                    </li>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="font-semibold text-foreground">
                                      {children}
                                    </strong>
                                  ),
                                  a: ({ href, children }) => (
                                    <Button
                                      variant="link"
                                      className="h-auto p-0 text-sm font-medium inline-flex items-center gap-1 group/link"
                                      asChild
                                    >
                                      <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        {children}
                                        <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                      </a>
                                    </Button>
                                  ),
                                  em: ({ children }) => (
                                    <em className="text-muted-foreground/80 not-italic text-xs">
                                      {children}
                                    </em>
                                  ),
                                  code: ({ children }) => (
                                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono border border-border/50">
                                      {children}
                                    </code>
                                  ),
                                  blockquote: ({ children }) => (
                                    <blockquote className="border-l-2 border-primary/50 pl-4 py-2 my-4 bg-muted/30 rounded-r">
                                      {children}
                                    </blockquote>
                                  ),
                                }}
                              >
                                {result.report}
                              </ReactMarkdown>
                            </CardContent>
                            <CardFooter className="border-t py-3 px-6 justify-end">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span>Powered by</span>
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0"
                                  asChild
                                >
                                  <a
                                    href="https://coderabbit.ai"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <CodeRabbitLogo className="h-3.5" />
                                  </a>
                                </Button>
                              </div>
                            </CardFooter>
                          </Card>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
