import { v } from 'convex/values'
import { z } from 'zod'
import { unwrap } from './utils'
import { action } from './_generated/server'
import { autumn } from './autumn'
import { actionResultSchema } from './actionResult'

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
      const data = unwrap<string | { url?: string }>(maybe as any)
      let url = ''
      if (typeof data === 'string') {
        url = data
      } else if (typeof data === 'object') {
        const d = data as Record<string, unknown>
        url = typeof d.url === 'string' ? d.url : ''
      }
      const UrlSchema = z.string().url()
      const parsedUrl = UrlSchema.safeParse(url)
      const payload = { url: parsedUrl.success ? parsedUrl.data : '' }
      const Schema = actionResultSchema(
        z.object({ url: UrlSchema.or(z.literal('')) }),
      )
      const safe = Schema.safeParse({ success: true, data: payload })
      return safe.success ? safe.data : { success: true, data: payload }
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
