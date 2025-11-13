import { validateClientEnv } from './env'

const clientEnv = validateClientEnv()
const isDev = process.env.NODE_ENV === 'development'
const isSentryEnabled = Boolean(clientEnv.SENTRY_DSN)

// Lazy load Sentry only if DSN is configured
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let Sentry: typeof import('@sentry/tanstackstart-react') | null = null
if (isSentryEnabled) {
  import('@sentry/tanstackstart-react')
    .then((module) => {
      Sentry = module
    })
    .catch(() => {
      // Sentry not available - continue without it
    })
}

type LogContext = Record<string, unknown>

interface SentryOptions {
  tags?: Record<string, string | number | boolean>
  contexts?: Record<string, Record<string, unknown>>
  level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'
}

interface LoggerConfig {
  perfThresholdMs?: number
  trackAllPerf?: boolean
}

const DEFAULT_CONFIG: Required<LoggerConfig> = {
  perfThresholdMs: 1000,
  trackAllPerf: false,
}

class SimpleLogger {
  private config: Required<LoggerConfig>

  constructor(
    private module: string,
    config?: LoggerConfig,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  private enrichContext(context?: LogContext): {
    timestamp: string
    module: string
    environment: 'development' | 'production'
  } & LogContext {
    return {
      timestamp: new Date().toISOString(),
      module: this.module,
      environment: isDev ? 'development' : 'production',
      ...(context || {}),
    }
  }

  private addBreadcrumb(
    level: 'info' | 'warning' | 'error' | 'debug',
    message: string,
    context?: LogContext,
  ) {
    if (isDev || !Sentry) return

    try {
      Sentry.addBreadcrumb({
        level,
        message,
        category: this.module,
        data: context,
        timestamp: Date.now() / 1000,
      })
    } catch {
      // Silent fail - breadcrumbs are non-critical
    }
  }

  private log(
    level: 'info' | 'warn' | 'error',
    message: string,
    context?: LogContext,
  ) {
    const enrichedContext = this.enrichContext(context)
    const sentryLevel = level === 'warn' ? 'warning' : level

    if (isDev) {
      const method =
        level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
      console[method](
        `[${enrichedContext.timestamp}] [${this.module}]`,
        message,
        context || '',
      )
    }

    this.addBreadcrumb(sentryLevel, message, context)

    if (!isDev && level === 'error' && Sentry) {
      try {
        Sentry.captureMessage(message, 'error')
        Sentry.setContext(this.module, enrichedContext)
      } catch {
        // Silent fail - Sentry not initialized or network error
      }
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(
    message: string,
    error?: unknown,
    context?: LogContext,
    sentryOptions?: SentryOptions,
  ) {
    const errorContext = {
      ...context,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }

    this.log('error', message, errorContext)

    if (error instanceof Error && !isDev && Sentry) {
      try {
        Sentry.captureException(error, {
          tags: sentryOptions?.tags,
          contexts: {
            [this.module]: this.enrichContext(context),
            ...sentryOptions?.contexts,
          },
          level: sentryOptions?.level || 'error',
        })
      } catch {
        // Silent fail - Sentry not initialized or network error
      }
    }
  }

  auth(event: string, context?: LogContext) {
    if (event.includes('fail') || event.includes('error')) {
      this.log('warn', `Auth: ${event}`, context)
    } else if (isDev) {
      this.log('info', `Auth: ${event}`, context)
    }
  }

  perf(operation: string, duration: number, context?: LogContext) {
    const perfContext = {
      ...context,
      duration_ms: duration,
      threshold_ms: this.config.perfThresholdMs,
    }

    if (duration > this.config.perfThresholdMs) {
      this.log('warn', `Slow: ${operation} took ${duration}ms`, perfContext)
    } else if (this.config.trackAllPerf) {
      this.log('info', `${operation} took ${duration}ms`, perfContext)
    }
  }

  debug(message: string, context?: LogContext) {
    if (isDev) {
      const enrichedContext = this.enrichContext(context)
      console.debug(
        `[${enrichedContext.timestamp}] [${this.module}]`,
        message,
        context || '',
      )
      this.addBreadcrumb('debug', message, context)
    }
  }
}

export function createLogger(module: string, config?: LoggerConfig) {
  return new SimpleLogger(module, config)
}

const errorLogger = createLogger('Error')

export const logger = {
  app: createLogger('App'),
  auth: createLogger('Auth'),
  api: createLogger('API', { perfThresholdMs: 500 }),
  security: createLogger('Security'),
  error: (
    message: string,
    error?: unknown,
    context?: LogContext,
    sentryOptions?: SentryOptions,
  ) => {
    errorLogger.error(message, error, context, sentryOptions)
  },
}

export type { LogContext, LoggerConfig, SentryOptions }
