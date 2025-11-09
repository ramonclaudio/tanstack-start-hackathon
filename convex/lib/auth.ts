import { authComponent } from '../auth'
import { authLogger } from './logger'
import type { AuthUser } from './types'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from '../_generated/dataModel'

export const getUserId = (user: AuthUser): string | null => {
  return user.userId || user._id || null
}

export const getAuthUserOrNull = async (
  ctx: GenericCtx<DataModel>,
): Promise<AuthUser | null> => {
  try {
    return await authComponent.getAuthUser(ctx)
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthenticated') {
      return null
    }
    authLogger.error('Failed to get auth user', e)
    throw e
  }
}
