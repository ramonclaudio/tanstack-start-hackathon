/* eslint-disable no-console */
/**
 * Convex Backend Logger - Simple and effective
 */

const isDevelopment = process.env.NODE_ENV !== 'production'

type LogContext = Record<string, any>

class ConvexLogger {
  constructor(private module: string) {}

  private log(
    level: 'info' | 'warn' | 'error',
    message: string,
    context?: LogContext,
  ) {
    // In production, only log warnings and errors
    if (!isDevelopment && level === 'info') return

    const log = {
      level,
      module: this.module,
      message,
      context,
      timestamp: Date.now(),
    }

    // Simple console output
    if (isDevelopment) {
      const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️'
      console.log(`${emoji} [${this.module}] ${message}`, context || '')
    } else {
      console.log(JSON.stringify(log))
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
    })
  }

  // Simple helper for auth events
  auth(event: string, context?: LogContext) {
    this.log('info', `Auth: ${event}`, context)
  }

  // Simple helper for billing events
  billing(event: string, context?: LogContext) {
    this.log('info', `Billing: ${event}`, context)
  }

  // Simple helper for performance (only logs if slow)
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

// Export pre-configured loggers for each module
export const authLogger = new ConvexLogger('Auth')
export const autumnLogger = new ConvexLogger('Autumn')

// Export the class for custom loggers
export default ConvexLogger
