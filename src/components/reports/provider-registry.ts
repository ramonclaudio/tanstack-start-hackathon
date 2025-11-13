/**
 * Report Provider Registry
 *
 * Centralized configuration for all report providers (CodeRabbit, Sentry, etc.)
 */

export interface ReportProvider {
  id: string
  name: string
  description: string
  icon?: string
  requiresConfig: boolean
  enabled: boolean
  comingSoon?: boolean
}

export const REPORT_PROVIDERS: Record<string, ReportProvider> = {
  coderabbit: {
    id: 'coderabbit',
    name: 'CodeRabbit',
    description: 'Developer activity reports from pull requests',
    requiresConfig: true,
    enabled: true,
  },
} as const

export type ProviderId = keyof typeof REPORT_PROVIDERS

export const getProvider = (id: string): ReportProvider | undefined => {
  return REPORT_PROVIDERS[id]
}

export const getAllProviders = (): Array<ReportProvider> => {
  return Object.values(REPORT_PROVIDERS)
}
