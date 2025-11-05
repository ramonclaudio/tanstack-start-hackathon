import { action } from './_generated/server'
import { api } from './_generated/api'
import { authComponent } from './auth'
import { autumn } from './autumn'
import { CustomerSchema, DashboardDTO } from './schemas'

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
      let customerData: unknown = null
      try {
        const result = await autumn.customers.get(ctx, {
          expand: [
            'entities',
            'invoices',
            'trials_used',
            'rewards',
            'payment_method',
          ] as const,
        })
        let data: unknown = result
        if (typeof result === 'object') {
          const r = result as Record<string, unknown>
          data = Object.prototype.hasOwnProperty.call(r, 'data')
            ? (r as { data?: unknown }).data
            : result
        }
        data = data ?? null
        const parsed = CustomerSchema.safeParse(data)
        customerData = parsed.success ? parsed.data : data
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
            ] as const,
            errorOnNotFound: false,
          })
          let createdData: unknown = created
          if (typeof created === 'object') {
            const r = created as Record<string, unknown>
            createdData = Object.prototype.hasOwnProperty.call(r, 'data')
              ? (r as { data?: unknown }).data
              : created
          }
          createdData = createdData ?? null
          const parsed = CustomerSchema.safeParse(createdData)
          customerData = parsed.success ? parsed.data : createdData
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
        })
      } catch {}

      const dto = {
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
      }
      const parsed = DashboardDTO.safeParse(dto)
      return { success: true, data: parsed.success ? parsed.data : dto }
    } catch (error) {
      return {
        success: true,
        data: { authenticated: false, user: null, customer: null },
      }
    }
  },
})
