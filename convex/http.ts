import { httpRouter } from 'convex/server'
import { authComponent, createAuth } from './auth'

const http = httpRouter()

// Register Better Auth routes
authComponent.registerRoutes(http, createAuth)

// Note: Autumn webhooks are handled internally by the Autumn component
// No need for custom webhook handlers - the component manages its own data

export default http
