/* eslint-disable no-console */

import * as Sentry from '@sentry/tanstackstart-react'

const isDev = import.meta.env.DEV

type LogContext = Record<string, unknown>

interface LoggerConfig {
  perfThresholdMs?: number
}

const DEFAULT_CONFIG: Required<LoggerConfig> = {
  perfThresholdMs: 1000,
}

class SimpleLogger {
  private config: Required<LoggerConfig>

  constructor(
    private module: string,
    config?: LoggerConfig,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  private enrichContext(context?: LogContext): LogContext & {
    timestamp: string
    module: string
    environment: 'development' | 'production'
  } {
    return {
      timestamp: new Date().toISOString(),
      module: this.module,
      environment: isDev ? 'development' : 'production',
      ...context,
    }
  }

  private log(
    level: 'info' | 'warn' | 'error',
    message: string,
    context?: LogContext,
  ) {
    const enrichedContext = this.enrichContext(context)

    if (isDev) {
      const method =
        level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
      console[method](
        `[${enrichedContext.timestamp}] [${this.module}]`,
        message,
        context || '',
      )
    }

    if (!isDev && level === 'error') {
      Sentry.captureMessage(message, 'error')
      Sentry.setContext(this.module, enrichedContext)
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(message: string, error?: unknown, context?: LogContext) {
    const errorContext = {
      ...context,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }

    this.log('error', message, errorContext)

    if (error instanceof Error && !isDev) {
      Sentry.captureException(error, {
        contexts: { [this.module]: this.enrichContext(context) },
      })
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
    if (duration > this.config.perfThresholdMs) {
      this.log('warn', `Slow: ${operation} took ${duration}ms`, {
        ...context,
        duration_ms: duration,
        threshold_ms: this.config.perfThresholdMs,
      })
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
    }
  }
}

export function createLogger(module: string, config?: LoggerConfig) {
  return new SimpleLogger(module, config)
}

export const logger = {
  app: createLogger('App'),
  auth: createLogger('Auth'),
  api: createLogger('API', { perfThresholdMs: 500 }),
  security: createLogger('Security'),
}

export type { LogContext, LoggerConfig }
