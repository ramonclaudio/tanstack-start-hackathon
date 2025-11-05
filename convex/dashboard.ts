import { action } from './_generated/server'
import { api } from './_generated/api'
import { authComponent } from './auth'
import { autumn } from './autumn'
import { CustomerSchema, DashboardDTO } from './schemas'
import { actionResultSchema } from './actionResult'
import { unwrapAndParse } from './autumnHelpers'
import type { z } from 'zod'

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
      let customerData: z.infer<typeof CustomerSchema> | null = null
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
        customerData = unwrapAndParse(result, CustomerSchema)
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
          customerData = unwrapAndParse(created, CustomerSchema)
        } catch {
          customerData = null
        }
      }

      // Upsert realtime snapshot for this user
      try {
        if (customerData) {
          await ctx.runMutation(api.snapshots.upsert, {
            userId: customerId,
            customerId,
            customer: customerData,
          })
        }
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
      const data = parsed.success ? parsed.data : dto
      const Schema = actionResultSchema(DashboardDTO)
      return Schema.parse({ success: true, data })
    } catch (error) {
      return {
        success: true,
        data: { authenticated: false, user: null, customer: null },
      }
    }
  },
})
