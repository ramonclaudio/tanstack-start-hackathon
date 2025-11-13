import { ConvexError } from 'convex/values'
import { coderabbitLogger } from './logger.js'

const API_BASE_URL = 'https://api.coderabbit.ai/api'
const API_VERSION = 'v1'
const API_TIMEOUT_MS = 600_000 // 10 minutes

/**
 * CodeRabbit error codes
 */
export const CODERABBIT_ERROR_CODES = {
  NOT_CONFIGURED: 'CODERABBIT_NOT_CONFIGURED',
  UNAUTHORIZED: 'CODERABBIT_UNAUTHORIZED',
  FORBIDDEN: 'CODERABBIT_FORBIDDEN',
  NOT_FOUND: 'CODERABBIT_NOT_FOUND',
  RATE_LIMITED: 'CODERABBIT_RATE_LIMITED',
  SERVER_ERROR: 'CODERABBIT_SERVER_ERROR',
  TIMEOUT: 'CODERABBIT_TIMEOUT',
  REQUEST_FAILED: 'CODERABBIT_REQUEST_FAILED',
} as const

/**
 * Validate and return CODERABBIT_API_KEY
 * Returns null if not configured (optional feature)
 */
function getCodeRabbitApiKey(): string | null {
  return process.env['CODERABBIT_API_KEY'] ?? null
}

/**
 * Report template types
 */
export type PromptTemplate =
  | 'Daily Standup Report'
  | 'Sprint Report'
  | 'Release Notes'
  | 'Custom'

/**
 * Filter parameter types
 */
export type FilterParameter =
  | 'REPOSITORY'
  | 'LABEL'
  | 'TEAM'
  | 'USER'
  | 'SOURCEBRANCH'
  | 'TARGETBRANCH'
  | 'STATE'

/**
 * Filter operator types
 */
export type FilterOperator = 'IN' | 'ALL' | 'NOT_IN'

/**
 * Group by types
 */
export type GroupBy =
  | 'NONE'
  | 'REPOSITORY'
  | 'LABEL'
  | 'TEAM'
  | 'USER'
  | 'SOURCEBRANCH'
  | 'TARGETBRANCH'
  | 'STATE'

/**
 * Filter parameter configuration
 */
export interface FilterConfig {
  parameter: FilterParameter
  operator: FilterOperator
  values: Array<string>
}

/**
 * Report generation request
 */
export interface ReportGenerateRequest {
  scheduleRange?: 'Dates'
  from: string // ISO 8601 date format (YYYY-MM-DD)
  to: string // ISO 8601 date format (YYYY-MM-DD)
  prompt?: string
  promptTemplate?: PromptTemplate
  parameters?: Array<FilterConfig>
  groupBy?: GroupBy
  subgroupBy?: GroupBy
  orgId?: string
}

/**
 * Report result group
 */
export interface ReportResult {
  group: string
  report: string // Markdown formatted
}

/**
 * Error response from CodeRabbit API
 */
interface CodeRabbitErrorResponse {
  message: string
  code: string
  issues?: Array<{ message: string }>
}

/**
 * CodeRabbit API client
 */
export class CodeRabbitClient {
  private apiKey: string | null

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? getCodeRabbitApiKey()
  }

  /**
   * Check if CodeRabbit is configured
   */
  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0
  }

  /**
   * Generate developer activity report
   *
   * This endpoint may take up to 10 minutes to respond depending on data volume.
   *
   * @param request Report generation parameters
   * @returns Array of report groups with markdown content
   */
  async generateReport(
    request: ReportGenerateRequest,
  ): Promise<Array<ReportResult>> {
    if (!this.isConfigured()) {
      throw new ConvexError({
        code: CODERABBIT_ERROR_CODES.NOT_CONFIGURED,
        message:
          'CodeRabbit API key not configured. Add CODERABBIT_API_KEY to environment variables.',
      })
    }

    const correlationId = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`

    coderabbitLogger.info('Generating report', {
      correlationId,
      dateRange: `${request.from} to ${request.to}`,
      template: request.promptTemplate,
      groupBy: request.groupBy,
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

    try {
      const startTime = Date.now()

      const response = await fetch(
        `${API_BASE_URL}/${API_VERSION}/report.generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-coderabbitai-api-key': this.apiKey!,
          },
          body: JSON.stringify({
            scheduleRange: 'Dates',
            ...request,
          }),
          signal: controller.signal,
        },
      )

      clearTimeout(timeoutId)
      const duration = Date.now() - startTime

      if (!response.ok) {
        const errorData = (await response.json()) as CodeRabbitErrorResponse
        coderabbitLogger.error('Report generation failed', errorData, {
          correlationId,
          status: response.status,
          duration,
        })

        const errorCode = this.mapHttpStatusToErrorCode(response.status)
        throw new ConvexError({
          code: errorCode,
          message: errorData.message || 'CodeRabbit API request failed',
          details: errorData.issues?.map((i) => i.message).join(', '),
          status: response.status,
        })
      }

      // API wraps response in {result: {data: []}}
      const responseData = (await response.json()) as {
        result: { data: Array<ReportResult> }
      }
      const results = responseData.result.data

      coderabbitLogger.info('Report generated successfully', {
        correlationId,
        groupCount: results.length,
        duration,
      })

      // Warn if request took longer than expected
      coderabbitLogger.perf('generateReport', duration, { correlationId })

      return results
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof ConvexError) {
        throw error
      }

      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        coderabbitLogger.error('Report generation timed out', error, {
          correlationId,
          timeoutMs: API_TIMEOUT_MS,
        })

        throw new ConvexError({
          code: CODERABBIT_ERROR_CODES.TIMEOUT,
          message: `CodeRabbit report generation timed out after ${API_TIMEOUT_MS / 1000}s`,
        })
      }

      coderabbitLogger.error('Unexpected error generating report', error, {
        correlationId,
      })

      throw new ConvexError({
        code: CODERABBIT_ERROR_CODES.REQUEST_FAILED,
        message: 'Failed to generate CodeRabbit report',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Map HTTP status codes to semantic error codes
   */
  private mapHttpStatusToErrorCode(status: number): string {
    switch (status) {
      case 401:
        return CODERABBIT_ERROR_CODES.UNAUTHORIZED
      case 403:
        return CODERABBIT_ERROR_CODES.FORBIDDEN
      case 404:
        return CODERABBIT_ERROR_CODES.NOT_FOUND
      case 429:
        return CODERABBIT_ERROR_CODES.RATE_LIMITED
      case 500:
      case 502:
      case 503:
      case 504:
        return CODERABBIT_ERROR_CODES.SERVER_ERROR
      default:
        return CODERABBIT_ERROR_CODES.REQUEST_FAILED
    }
  }
}

/**
 * Create a new CodeRabbit client instance
 */
export function createCodeRabbitClient(apiKey?: string): CodeRabbitClient {
  return new CodeRabbitClient(apiKey)
}
