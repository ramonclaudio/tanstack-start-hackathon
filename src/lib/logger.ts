/* eslint-disable no-console */

import * as Sentry from '@sentry/tanstackstart-react'

const isDev = import.meta.env.DEV

type LogContext = Record<string, any>

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

  error(message: string, error?: any, context?: LogContext) {
    const errorContext = {
      ...context,
      error: error instanceof Error ? error.message : error,
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

export const logger = {
  app: new SimpleLogger('App'),
  auth: new SimpleLogger('Auth'),
  api: new SimpleLogger('API'),
  security: new SimpleLogger('Security'),
}

export function createLogger(module: string) {
  return new SimpleLogger(module)
}
