import { action } from './_generated/server'
import { authComponent } from './auth'
import { api } from './_generated/api'
import { autumn } from './autumn'
import { CustomerSchema, PricingDTO } from './schemas'
import { actionResultSchema } from './actionResult'
import { unwrap } from './utils'
import { unwrapAndParse } from './autumnHelpers'
import type { z } from 'zod'

export const get = action({
  args: {},
  handler: async (ctx) => {
    const TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
    let authenticated = false
    try {
      await authComponent.getAuthUser(ctx)
      authenticated = true
    } catch (_) {
      authenticated = false
    }

    // Try to get cached products first
    const cachedDoc = await ctx.runQuery(api.productCache.get, {
      key: 'default',
    })
    const cachedProductsParsed = PricingDTO.shape.products.safeParse(
      cachedDoc?.products ?? [],
    )
    const cachedProducts = cachedProductsParsed.success
      ? cachedProductsParsed.data
      : []

    // Check if cache is stale
    const lastUpdated = cachedDoc?.updatedAt ?? 0
    const stale = !lastUpdated || Date.now() - lastUpdated > TTL_MS

    // If cache is stale, trigger background refresh (fire-and-forget)
    if (stale) {
      ctx.runAction(api.products.refresh, { key: 'default' }).catch(() => {})
    }

    // Always try to fetch fresh products
    let freshProducts: z.infer<typeof PricingDTO.shape.products> = []
    try {
      const productsRes = await autumn.products.list(ctx)
      const productsRaw = unwrap<unknown>(productsRes)

      let productsArray: Array<unknown> = []
      if (Array.isArray(productsRaw)) {
        productsArray = productsRaw
      } else if (productsRaw && typeof productsRaw === 'object') {
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
      if (productsParsed.success) {
        freshProducts = productsParsed.data

        // Update cache with fresh products
        const normalizedForCache = freshProducts.map((p) => ({
          ...p,
          items: p.items.map((it) => ({
            ...it,
            interval: it.interval ?? undefined,
          })),
        }))
        await ctx.runMutation(api.productCache.upsert, {
          key: 'default',
          products: normalizedForCache,
        })
      }
    } catch (error) {
      console.error('Failed to fetch fresh products:', error)
    }

    // Use fresh products if available, otherwise fall back to cache
    const products = freshProducts.length > 0 ? freshProducts : cachedProducts

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
        customer = unwrapAndParse(res, CustomerSchema)
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
          customer = unwrapAndParse(created, CustomerSchema)
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
    const data = parsed.success ? parsed.data : dto
    const Schema = actionResultSchema(
      parsed.success ? PricingDTO : (await import('zod')).z.any(),
    )
    return Schema.parse({ success: true, data })
  },
})
