import { httpRouter } from 'convex/server'
import { authComponent, createAuth } from './auth'
import { api } from './_generated/api'
import { httpAction } from './_generated/server'
import { CustomerSchema, WebhookPayload } from './schemas'
import type { z } from 'zod'

const http = httpRouter()

authComponent.registerRoutes(http, createAuth)

// Autumn webhook to upsert customer snapshots for realtime UI
http.route({
  path: '/webhooks/autumn',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    try {
      // Optional shared secret check
      const expected = process.env.AUTUMN_WEBHOOK_SECRET
      const provided = req.headers.get('x-autumn-secret') || undefined
      if (expected && provided !== expected) {
        return new Response('Unauthorized', { status: 401 })
      }

      const json = (await req.json()) as unknown
      const parsed = WebhookPayload.safeParse(json)
      type WebhookData = {
        customer_id?: string
        customerId?: string
        customer?: unknown
        data?: { customer?: unknown }
      }
      const data: WebhookData = parsed.success
        ? parsed.data
        : (json as WebhookData)
      // Try to extract a stable customer/user id and a customer object
      const userId =
        data.customer_id ||
        data.customerId ||
        (data.customer as { id?: string } | undefined)?.id ||
        (data.data?.customer as { id?: string } | undefined)?.id

      const customerRaw = data.customer ?? data.data?.customer ?? null
      const parsedC = CustomerSchema.safeParse(customerRaw)
      const customer: z.infer<typeof CustomerSchema> | null = parsedC.success
        ? parsedC.data
        : null

      if (userId) {
        await ctx.runMutation(api.snapshots.upsert, {
          userId,
          customerId: userId,
          customer,
        })
      }

      return new Response(null, { status: 204 })
    } catch (e) {
      console.error('Autumn webhook error', e)
      return new Response('Bad Request', { status: 400 })
    }
  }),
})

export default http
