import { action } from './_generated/server'
import { authComponent } from './auth'
import { api } from './_generated/api'
import { autumn } from './autumn'
import { CustomerSchema, PricingDTO } from './schemas'
import type { z } from 'zod'

export const get = action({
  args: {},
  handler: async (ctx) => {
    let authenticated = false
    try {
      await authComponent.getAuthUser(ctx)
      authenticated = true
    } catch (_) {
      authenticated = false
    }

    // Always list products (public)
    const productsRes = (await autumn.products.list(ctx)) as
      | { data?: unknown }
      | unknown
    let productsRaw: unknown = (await import('./utils')).unwrap<unknown>(
      productsRes as any,
    )
    productsRaw = productsRaw ?? []
    let productsArray: Array<unknown> = []
    if (Array.isArray(productsRaw)) {
      productsArray = productsRaw
    } else if (typeof productsRaw === 'object') {
      const pr = productsRaw as Record<string, unknown>
      const list = pr['list']
      const prods = pr['products']
      productsArray = Array.isArray(list)
        ? list
        : Array.isArray(prods)
          ? prods
          : []
    }
    const productsParsed = PricingDTO.shape.products.safeParse(productsArray)
    const products = productsParsed.success
      ? productsParsed.data
      : productsArray

    // Optionally fetch customer snapshot when authenticated
    let customer: z.infer<typeof CustomerSchema> | null = null
    if (authenticated) {
      try {
        const res = await autumn.customers.get(ctx, {
          expand: [
            'entities',
            'invoices',
            'trials_used',
            'rewards',
            'payment_method',
          ] as const,
        })
        let raw: unknown = (await import('./utils')).unwrap<unknown>(res as any)
        raw = raw ?? null
        const parsed = CustomerSchema.safeParse(raw)
        customer = parsed.success ? parsed.data : null
      } catch {
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
          let raw: unknown = (await import('./utils')).unwrap<unknown>(
            created as any,
          )
          raw = raw ?? null
          const parsed = CustomerSchema.safeParse(raw)
          customer = parsed.success ? parsed.data : null
        } catch {
          customer = null
        }
      }

      // Upsert snapshot for realtime
      if (customer) {
        try {
          const user = await authComponent.getAuthUser(ctx)
          const u = user as { userId?: string; _id?: string }
          const userId = u.userId || u._id
          if (userId) {
            await ctx.runMutation(api.snapshots.upsert, {
              userId,
              customerId: userId,
              customer,
            })
          }
        } catch {}
      }
    }

    const dto = { authenticated, products, customer }
    const parsed = PricingDTO.safeParse(dto)
    return { success: true, data: parsed.success ? parsed.data : dto }
  },
})
