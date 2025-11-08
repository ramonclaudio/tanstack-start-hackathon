import { ConvexError } from 'convex/values'

export class AuthenticationError extends ConvexError<{
  code: string
  message: string
}> {
  constructor(message = 'Authentication required') {
    super({ code: 'UNAUTHENTICATED', message })
  }
}

export class AuthorizationError extends ConvexError<{
  code: string
  message: string
}> {
  constructor(message = 'Unauthorized') {
    super({ code: 'UNAUTHORIZED', message })
  }
}

export class ValidationError extends ConvexError<{
  code: string
  message: string
  field?: string
}> {
  constructor(message: string, field?: string) {
    super({ code: 'VALIDATION_ERROR', message, field })
  }
}

export class NotFoundError extends ConvexError<{
  code: string
  message: string
  resource: string
}> {
  constructor(resource: string) {
    super({ code: 'NOT_FOUND', message: `${resource} not found`, resource })
  }
}
