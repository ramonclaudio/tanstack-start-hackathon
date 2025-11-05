import { v } from 'convex/values'
import { z } from 'zod'
import { action } from './_generated/server'
import { autumn } from './autumn'

export const openPortal = action({
  args: {
    returnUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const result = await autumn.customers.billingPortal(ctx, {
        returnUrl: args.returnUrl,
      })
      const maybe = result as unknown as { data?: unknown } | string
      let data: unknown
      if (typeof maybe === 'string') {
        data = maybe
      } else if (typeof maybe === 'object') {
        const m = maybe as Record<string, unknown>
        data = Object.prototype.hasOwnProperty.call(m, 'data')
          ? (m as { data?: unknown }).data
          : undefined
      } else {
        data = undefined
      }
      let url = ''
      if (typeof data === 'string') {
        url = data
      } else if (typeof data === 'object') {
        const d = data as Record<string, unknown>
        url = typeof d.url === 'string' ? d.url : ''
      }
      const UrlSchema = z.string().url()
      const parsed = UrlSchema.safeParse(url)
      return { success: true, data: { url: parsed.success ? parsed.data : '' } }
    } catch (e: unknown) {
      const message =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'Failed to open billing portal'
      return {
        success: false,
        error: { message },
      }
    }
  },
})
