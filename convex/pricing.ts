import { action } from './_generated/server'
import { authComponent } from './auth'
import { autumn } from './autumn'

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
    const productsRes: any = await autumn.products.list(ctx)
    const productsRaw = productsRes?.data ?? productsRes
    const products = Array.isArray(productsRaw)
      ? productsRaw
      : Array.isArray(productsRaw?.list)
        ? productsRaw.list
        : Array.isArray(productsRaw?.products)
          ? productsRaw.products
          : []

    // Optionally fetch customer snapshot when authenticated
    let customer: any = null
    if (authenticated) {
      try {
        const res = await autumn.customers.get(ctx, {
          expand: [
            'entities',
            'invoices',
            'trials_used',
            'rewards',
            'payment_method',
          ] as any,
        })
        customer = (res as any)?.data ?? null
      } catch {
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
          customer = (created as any)?.data ?? null
        } catch {
          customer = null
        }
      }
    }

    return {
      authenticated,
      products,
      customer,
    }
  },
})
