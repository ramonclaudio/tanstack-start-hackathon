import { query } from './_generated/server'
import { authComponent } from './auth'

/**
 * Get user info for Autumn sync.
 * Note: Customer creation happens automatically through the Autumn identify function
 * when useCustomer() is called on the frontend.
 * This query just verifies the user is authenticated.
 */
export const getUserForAutumn = query({
  args: {},
  handler: async (ctx) => {
    try {
      const user = await authComponent.getAuthUser(ctx)

      const customerId = user.userId || user._id
      if (!customerId) return { authenticated: false }

      return {
        authenticated: true,
        customerId,
        userData: {
          name: user.name || '',
          email: user.email || '',
        },
      }
    } catch (error) {
      const msg =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message)
          : String(error)
      if (msg !== 'Unauthenticated') {
        console.error('customers.getUserForAutumn failed', error)
      }
      return { authenticated: false }
    }
  },
})

/**
 * Get the current user's Autumn customer data
 */
export const getCurrentCustomer = query({
  args: {},
  handler: async (ctx) => {
    try {
      const user = await authComponent.getAuthUser(ctx)

      const customerId = user.userId || user._id
      if (!customerId) return null

      // Note: This will be handled by the useCustomer hook on the frontend
      // This query is mainly for server-side access if needed
      return { customerId }
    } catch (error) {
      const msg =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message)
          : String(error)
      if (msg !== 'Unauthenticated') {
        console.error('customers.getCurrentCustomer failed', error)
      }
      return null
    }
  },
})
