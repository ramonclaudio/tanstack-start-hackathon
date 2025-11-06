# Tanvex

Production-ready TanStack Start template with Convex backend, Better Auth, Autumn payments, and Sentry monitoring.

## Stack

**Frontend:** React 19, TanStack Router, Tailwind CSS v4, shadcn/ui
**Backend:** Convex (serverless functions + realtime database)
**Runtime:** Bun
**Auth:** Better Auth (email + OAuth)
**Payments:** Autumn (Stripe integration)
**Monitoring:** Sentry (error tracking + session replay)

## What You Get

- File-based routing with TanStack Start
- Real-time data sync via Convex WebSockets
- Authentication with email and GitHub OAuth
- Payment flows with subscription management
- Production error tracking (client + server)
- Custom production server with intelligent asset loading
- Dark mode with system preference detection
- Type-safe API layer (4k LOC, fully typed)

## Quick Start

```bash
git clone https://github.com/RMNCLDYO/tanvex.git
cd tanvex
bun install
```

### Development

```bash
bun run dev          # Start dev server (localhost:3000)
```

### Production

```bash
bun run build        # Build for production
bun run start        # Run production server
```

## Configuration

Create `.env.local`:

```bash
# Convex
VITE_CONVEX_URL=https://your-convex-url.convex.cloud

# Better Auth
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Autumn (Payments)
AUTUMN_SECRET_KEY=your-autumn-secret-key

# Sentry (Optional)
VITE_SENTRY_DSN=your-sentry-dsn
SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token
```

## Production Server

Custom Bun server (`server.ts`) with:

- **Smart asset loading** - Small files preloaded, large files on-demand
- **ETag caching** - Conditional requests with 304 responses
- **Gzip compression** - Automatic for text/js/css
- **Request tracing** - Sentry integration for errors

Configure via environment:

```bash
PORT=3000
ASSET_PRELOAD_MAX_SIZE=5242880        # 5MB default
ASSET_PRELOAD_INCLUDE_PATTERNS="*.js,*.css,*.woff2"
ASSET_PRELOAD_EXCLUDE_PATTERNS="*.map"
```

## Monitoring

Sentry configured with:

- 10% trace sampling (production)
- 25% session replay sampling
- 100% error replay capture
- Privacy: text masking, email domain-only contexts
- Cost: Free tier ($0/month for <10k sessions/day)

## Architecture

```
src/
├── components/          # React components + shadcn/ui
├── lib/                 # Auth client, utilities
├── routes/              # File-based routes
│   ├── auth/           # Sign in/up pages
│   ├── dashboard.tsx   # Protected dashboard
│   └── pricing.tsx     # Payment flows
└── router.tsx          # Router + Sentry init

convex/
├── auth.ts             # Better Auth integration
├── autumn.ts           # Payment webhook handlers
├── customers.ts        # User data queries
├── dashboard.ts        # Dashboard queries
└── schema.ts           # Database schema

server.ts               # Production server (Bun)
```

## Scripts

```bash
bun run dev          # Development server
bun run build        # Production build
bun run start        # Production server
bun run typecheck    # TypeScript check
bun run format       # Format + lint
bun run check        # Verify formatting/types
bun run all          # Full check + build
```

## Features

**Authentication**

- Email/password sign-up
- GitHub OAuth
- Session management
- Protected routes

**Payments**

- Stripe checkout via Autumn
- Subscription management
- Billing portal access
- Usage-based billing support

**Error Tracking**

- Client-side errors (React boundaries)
- Server-side errors (request handlers)
- Auth failures (sign-in/sign-up)
- Payment errors (checkout/billing)
- Session replay on errors

**Performance**

- Convex WebSocket subscriptions (no polling)
- Optimistic updates
- Smart asset preloading
- Gzip compression
- ETag caching

## License

MIT
