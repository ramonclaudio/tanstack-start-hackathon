import { httpRouter } from 'convex/server'
import { authComponent, createAuth } from './auth'
import { api } from './_generated/api'
import { httpAction } from './_generated/server'

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

      const payload = await req.json()
      // Try to extract a stable customer/user id and a customer object
      const userId =
        payload?.customer_id ||
        payload?.customerId ||
        payload?.customer?.id ||
        payload?.data?.customer?.id

      const customer = payload?.customer || payload?.data?.customer || null

      if (userId) {
        await ctx.runMutation(api.snapshots.upsert, {
          userId,
          customerId: userId,
          customer,
        } as any)
      }

      return new Response(null, { status: 204 })
    } catch (e) {
      console.error('Autumn webhook error', e)
      return new Response('Bad Request', { status: 400 })
    }
  }),
})

export default http
