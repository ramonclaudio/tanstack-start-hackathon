import { action } from './_generated/server'
import { api } from './_generated/api'
import { authComponent } from './auth'
import { autumn } from './autumn'

export const get = action({
  args: {},
  handler: async (ctx) => {
    try {
      const user = await authComponent.getAuthUser(ctx)

      const customerId = user.userId || user._id
      if (!customerId) {
        return {
          success: true,
          data: { authenticated: false, user: null, customer: null },
        }
      }

      // Fetch consolidated Autumn customer state (features, products, usage)
      let customerData: any = null
      try {
        const result = await autumn.customers.get(ctx, {
          expand: [
            'entities',
            'invoices',
            'trials_used',
            'rewards',
            'payment_method',
          ] as any,
        })
        const data: any = (result as any).data
        customerData = data ?? null
      } catch (e) {
        // If not found or identify race, create silently and retry once
        try {
          const created = await autumn.customers.create(ctx, {
            expand: [
              'entities',
              'invoices',
              'trials_used',
              'rewards',
              'payment_method',
            ] as any,
            errorOnNotFound: false,
          } as any)
          const createdData: any = (created as any).data
          customerData = createdData ?? null
        } catch {
          customerData = null
        }
      }

      // Upsert realtime snapshot for this user
      try {
        await ctx.runMutation(api.snapshots.upsert, {
          userId: customerId,
          customerId,
          customer: customerData,
        } as any)
      } catch {}

      return {
        success: true,
        data: {
          authenticated: true,
          user: {
            id: customerId,
            name: user.name || '',
            email: user.email || '',
            image: user.image || null,
            createdAt: user.createdAt,
            emailVerified: Boolean(user.emailVerified),
            twoFactorEnabled: Boolean(user.twoFactorEnabled),
          },
          customer: customerData,
        },
      }
    } catch (error) {
      return {
        success: true,
        data: { authenticated: false, user: null, customer: null },
      }
    }
  },
})
