const isDevelopment = !process.env['VITE_CONVEX_URL']

type LogContext = Record<string, unknown>

/**
 * Generate correlation ID for request tracking
 * Format: timestamp-random (e.g., 1704067200000-a3f2)
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 6)
  return `${timestamp}-${random}`
}

class ConvexLogger {
  constructor(private module: string) {}

  private log(
    level: 'info' | 'warn' | 'error',
    message: string,
    context?: LogContext,
  ) {
    if (!isDevelopment && level === 'info') return

    const log = {
      level,
      module: this.module,
      message,
      timestamp: Date.now(),
      ...context,
    }

    // Always use console.* for Convex log streaming integration
    // Convex automatically captures console.error/warn/log for log streams
    if (isDevelopment) {
      const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️'
      const consoleMethod =
        level === 'error'
          ? // eslint-disable-next-line no-console
            console.error
          : level === 'warn'
            ? // eslint-disable-next-line no-console
              console.warn
            : // eslint-disable-next-line no-console
              console.log
      // Pretty format for development
      consoleMethod(`${emoji} [${this.module}] ${message}`, context || '')
    } else {
      // Structured JSON for production (Convex log streams)
      const consoleMethod =
        level === 'error'
          ? // eslint-disable-next-line no-console
            console.error
          : level === 'warn'
            ? // eslint-disable-next-line no-console
              console.warn
            : // eslint-disable-next-line no-console
              console.log
      consoleMethod(JSON.stringify(log))
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(message: string, error?: any, context?: LogContext) {
    this.log('error', message, {
      ...context,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    })
  }

  auth(event: string, context?: LogContext) {
    this.log('info', `Auth: ${event}`, context)
  }

  billing(event: string, context?: LogContext) {
    this.log('info', `Billing: ${event}`, context)
  }

  perf(operation: string, duration: number, context?: LogContext) {
    if (duration > 1000) {
      this.log(
        'warn',
        `Slow operation: ${operation} took ${duration}ms`,
        context,
      )
    }
  }
}

export const authLogger = new ConvexLogger('Auth')
export const autumnLogger = new ConvexLogger('Autumn')

export default ConvexLogger
