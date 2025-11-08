const isDevelopment = !process.env['VITE_CONVEX_URL']

type LogContext = Record<string, unknown>

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
      context,
      timestamp: Date.now(),
    }

    if (isDevelopment) {
      const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️'
      const consoleMethod =
        level === 'error'
          ? console.error
          : level === 'warn'
            ? console.warn
            : console.error
      consoleMethod(`${emoji} [${this.module}] ${message}`, context || '')
    } else {
      const consoleMethod =
        level === 'error'
          ? console.error
          : level === 'warn'
            ? console.warn
            : console.error
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
