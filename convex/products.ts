import { v } from 'convex/values'
import { action, query } from './_generated/server'
import { api } from './_generated/api'
import { autumn } from './autumn'
import { unwrap } from './utils'
import { PricingDTO } from './schemas'

export const refresh = action({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    // Fetch products from Autumn
    const productsRes = (await autumn.products.list(ctx)) as
      | { data?: unknown }
      | unknown
    const productsRaw: unknown = unwrap<unknown>(productsRes as any)

    // Normalize to array
    let productsArray: Array<unknown> = []
    if (Array.isArray(productsRaw)) {
      productsArray = productsRaw
    } else if (typeof productsRaw === 'object' && productsRaw !== null) {
      const pr = productsRaw as Record<string, unknown>
      const list = pr['list']
      const prods = pr['products']
      productsArray = Array.isArray(list)
        ? list
        : Array.isArray(prods)
          ? prods
          : []
    }

    // Validate to our minimal UI shape if possible
    const parsed = PricingDTO.shape.products.safeParse(productsArray)
    const freshProducts = parsed.success ? parsed.data : []

    // Normalize minor fields before caching to ease validators
    const normalizedForCache = (
      parsed.success ? freshProducts : productsArray
    ).map((p: any) => ({
      ...p,
      items: Array.isArray(p?.items)
        ? p.items.map((it: any) => ({
            ...it,
            interval: it?.interval ?? undefined,
          }))
        : [],
    }))

    // Upsert cache
    await ctx.runMutation(api.productCache.upsert as any, {
      key,
      products: normalizedForCache,
    })

    return { success: true, data: { count: normalizedForCache.length } }
  },
})

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const TTL_MS = 6 * 60 * 60 * 1000
    const doc = await ctx.db
      .query('product_cache')
      .filter((q) => q.eq(q.field('key'), key))
      .first()
    const products = Array.isArray(doc?.products)
      ? (doc!.products as Array<any>)
      : []
    const updatedAt = doc?.updatedAt ?? 0
    const stale = !updatedAt || Date.now() - updatedAt > TTL_MS
    return { products, updatedAt, stale }
  },
})
