import type { authComponent } from '../auth'

/**
 * Common type definitions for Convex functions
 */

export type AuthUser = Awaited<ReturnType<typeof authComponent.getAuthUser>>

export type UserProfile = {
  id: string
  name: string
  email: string
  image: string | null
  createdAt: number
  emailVerified: boolean
  twoFactorEnabled: boolean
}

export type AuthenticatedUserResponse = {
  authenticated: true
  user: UserProfile
}

export type UnauthenticatedUserResponse = {
  authenticated: false
  user: null
}

export type UserResponse =
  | AuthenticatedUserResponse
  | UnauthenticatedUserResponse
