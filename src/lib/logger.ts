/* eslint-disable no-console */

import * as Sentry from '@sentry/tanstackstart-react'

const isDev = import.meta.env.DEV

type LogContext = Record<string, unknown>

class SimpleLogger {
  constructor(private module: string) {}

  private log(
    level: 'info' | 'warn' | 'error',
    message: string,
    context?: LogContext,
  ) {
    if (isDev) {
      const method =
        level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
      console[method](`[${this.module}]`, message, context || '')
    }

    if (!isDev && level === 'error') {
      Sentry.captureMessage(message, 'error')
      if (context) {
        Sentry.setContext(this.module, context)
      }
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
    }

    this.log('error', message, errorContext)

    if (error instanceof Error && !isDev) {
      Sentry.captureException(error)
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
    if (duration > 1000) {
      this.log('warn', `Slow: ${operation} took ${duration}ms`, context)
    }
  }

  debug(message: string, context?: LogContext) {
    if (isDev) {
      console.debug(`[${this.module}]`, message, context || '')
    }
  }
}

export function createLogger(module: string) {
  return new SimpleLogger(module)
}

// Pre-configured loggers for common use cases
export const logger = {
  app: createLogger('App'),
  auth: createLogger('Auth'),
  api: createLogger('API'),
  security: createLogger('Security'),
}
