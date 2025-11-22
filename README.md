# Tanvex

Full-stack TypeScript application demonstrating TanStack Start + Convex integration with production authentication, billing, and monitoring.

**Stats:** 9,080 lines of TypeScript across 73 files.

## What This Is

A SaaS starter template built to explore best practices for:
- Server-side rendering with TanStack Start
- Real-time backend with Convex
- Type-safe routing and API layers
- Production monitoring and error tracking

Not a framework. Not a boilerplate generator. Just working code demonstrating integration patterns.

## Tech Stack

**Frontend:**
- React 19.2.0 (concurrent features)
- TanStack Start 1.135.2 (SSR meta-framework)
- TanStack Router 1.135.2 (file-based routing)
- TanStack Query 5.90.7 (server state)
- Vite 7.2.2 (build tool)
- Tailwind CSS 4.1.17 (styling)
- Radix UI (accessible components)

**Backend:**
- Convex 1.29.0 (serverless backend, real-time sync)
- Better Auth 1.3.27 (authentication)
- Autumn JS 0.1.47 (Stripe billing)

**Monitoring:**
- Sentry 10.25.0 (error tracking, client + server)
- CodeRabbit API (AI code review reports)

**Runtime:**
- Bun (package manager, lockfile)
- Netlify (deployment platform)

## Features

### Authentication (Better Auth)
- Email/password with rate limiting (5 req/10s)
- GitHub OAuth (separate dev/prod apps)
- Session management via cookies
- Environment-aware SITE_URL switching

### Billing (Autumn + Stripe)
- Multi-tier pricing (Free, Starter, Pro)
- Monthly/annual toggle
- Subscription status dashboard
- Failed payment alerts
- Billing portal integration

### CodeRabbit Integration
- AI-powered code review reports
- Date range filtering (max 90 days recommended)
- Template selection (Daily Standup, Sprint, Release Notes, Custom)
- Report history with pagination
- Status tracking (pending/completed/failed)
- Stale report cleanup (cron: every 60 minutes)

### Error Tracking (Sentry)
- Client-side React error boundaries
- Server-side Convex error capture
- Custom ingestion client (works on free plan)
- 10% trace sampling
- Correlation IDs for request tracking

### UI/UX
- Dark mode (localStorage persistence, system preference detection)
- Responsive design (mobile-first)
- Loading skeletons
- Toast notifications (Sonner)
- Accessible components (Radix UI)

## Quick Start

```bash
# Install dependencies
bun install

# Setup environment
cp .env.example .env.local

# Start Convex backend (auto-fills CONVEX_URL and CONVEX_DEPLOYMENT in .env.local)
bunx convex dev

# Configure required secrets in .env.local:
# - BETTER_AUTH_SECRET (generate: openssl rand -base64 32)
# - AUTUMN_SECRET_KEY (from https://app.useautumn.com)

# Set secrets in Convex backend
bunx convex env set BETTER_AUTH_SECRET "your_secret"
bunx convex env set AUTUMN_SECRET_KEY "your_key"

# Start dev server (runs on https://localhost:3000)
bun run dev
```

### Optional: GitHub OAuth

```bash
# Create OAuth app at https://github.com/settings/developers
# Callback URL: https://localhost:3000/api/auth/callback/github

# Add to .env.local:
DEV_GITHUB_CLIENT_ID=your_dev_id
DEV_GITHUB_CLIENT_SECRET=your_dev_secret

# Set in Convex:
bunx convex env set DEV_GITHUB_CLIENT_ID "your_dev_id"
bunx convex env set DEV_GITHUB_CLIENT_SECRET "your_dev_secret"

# For production, use GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET
```

### Optional: CodeRabbit Reports

```bash
# Requires CodeRabbit Pro subscription
# Get API key from CodeRabbit dashboard

# Add to Convex only (not .env.local):
bunx convex env set CODERABBIT_API_KEY "your_api_key"
```

### Optional: Sentry

```bash
# Create project at https://sentry.io

# Add to .env.local:
SENTRY_DSN=https://key@o0.ingest.sentry.io/0

# Add to Convex:
bunx convex env set SENTRY_DSN "https://key@o0.ingest.sentry.io/0"

# Optional: Source map uploads (production only)
SENTRY_AUTH_TOKEN=your_token
SENTRY_ORG=your_org_slug
SENTRY_PROJECT=your_project_slug
```

## Environment Variables

**Client-side (exposed to browser):**
```bash
VITE_DEV_SITE_URL=https://localhost:3000           # Dev only
VITE_SITE_URL=https://yourdomain.com               # Production
CONVEX_URL=https://your-deployment.convex.cloud    # Auto-filled by Convex CLI
CONVEX_SITE_URL=https://your-deployment.convex.site
SENTRY_DSN=https://key@o0.ingest.sentry.io/0       # Optional
```

**Server-side (private, set in Convex Dashboard):**
```bash
BETTER_AUTH_SECRET=<openssl rand -base64 32>       # Required
AUTUMN_SECRET_KEY=<from Autumn dashboard>          # Required
DEV_GITHUB_CLIENT_ID=<dev OAuth app>               # Optional
DEV_GITHUB_CLIENT_SECRET=<dev OAuth secret>        # Optional
GITHUB_CLIENT_ID=<prod OAuth app>                  # Optional
GITHUB_CLIENT_SECRET=<prod OAuth secret>           # Optional
CODERABBIT_API_KEY=<CodeRabbit API key>            # Optional
SENTRY_DSN=<Sentry project DSN>                    # Optional
```

See `.env.example` for complete documentation.

## Architecture

### Directory Structure

```
src/
├── components/
│   ├── auth/              # AuthUI component
│   ├── dashboard/         # Billing widgets, skeletons
│   ├── layout/            # Header, footer
│   ├── pricing/           # Pricing table, checkout dialog
│   ├── reports/           # CodeRabbit report forms/lists
│   ├── theme/             # Dark mode toggle
│   └── ui/                # shadcn components (17 components)
├── lib/
│   ├── auth-context.tsx   # React Context for auth state
│   ├── auth-middleware.ts # Protected route logic
│   ├── auth.ts            # Better Auth client
│   ├── env.ts             # Zod environment validation
│   ├── logger.ts          # Client-side logging
│   └── utils.ts           # Tailwind utilities
├── routes/
│   ├── __root.tsx         # Root layout
│   ├── index.tsx          # Home page
│   ├── dashboard.tsx      # Protected dashboard
│   ├── pricing.tsx        # Pricing page
│   ├── reports.tsx        # CodeRabbit reports
│   ├── auth/
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   └── api/
│       └── auth/$.ts      # Better Auth API handler
└── router.tsx             # Router config + Sentry init

convex/
├── auth.config.ts         # Better Auth configuration
├── auth.ts                # Auth initialization
├── autumn.ts              # Billing integration
├── coderabbit.ts          # Report generation functions
├── convex.config.ts       # Convex plugins (Better Auth, Autumn)
├── crons.ts               # Scheduled jobs (report cleanup)
├── http.ts                # HTTP routes + CORS
├── schema.ts              # Database schema (tasks, reports)
├── tasks.ts               # Demo CRUD operations
├── user.ts                # User queries
└── lib/
    ├── coderabbitClient.ts    # CodeRabbit API client
    ├── coderabbitValidators.ts # Report validation
    ├── errors.ts              # Typed error payloads
    ├── logger.ts              # Structured logging
    ├── sentry.ts              # Sentry integration
    ├── types.ts               # Shared types
    └── validators.ts          # Input validation
```

### Database Schema (Convex)

**`tasks` table:**
```typescript
{
  text: string
  completed: boolean
}
```
- Index: `by_completed`
- Purpose: Demo CRUD operations

**`reports` table:**
```typescript
{
  userId: string              // Better Auth user ID
  provider: string            // 'coderabbit' | future providers
  fromTimestamp: number       // Unix ms (for efficient queries)
  toTimestamp: number         // Unix ms
  fromDate: string            // ISO 8601 (YYYY-MM-DD)
  toDate: string              // ISO 8601 (YYYY-MM-DD)
  promptTemplate?: string     // Template name
  prompt?: string             // Custom AI prompt
  groupBy?: string            // Group dimension
  results: Array<{
    group: string
    report: string            // Markdown content
  }>
  status: 'pending' | 'completed' | 'failed'
  error?: string
  durationMs?: number
}
```
- Indexes: `by_user`, `by_user_and_provider`, `by_user_and_date`, `by_status`

**Better Auth tables** (auto-generated):
- `users`, `sessions`, `accounts`, `verificationTokens`

**Autumn tables** (auto-generated):
- `subscriptions`, `products`, `customers`, `usage`

### Request Flow

```
Browser
  ↓
Netlify Edge (HTTPS)
  ↓
TanStack Start SSR
  ├─ Static assets (dist/client)
  ├─ Server routes (dist/server)
  └─ API routes (/api/auth/*)
      ↓
Convex Cloud (WebSocket + HTTPS)
  ├─ Queries (real-time, read-only)
  ├─ Mutations (transactional writes)
  ├─ Actions (external API calls)
  └─ HTTP routes (auth, health check)
      ↓
External Services
  ├─ Sentry (error tracking)
  ├─ Stripe (via Autumn)
  ├─ CodeRabbit API (report generation)
  └─ GitHub OAuth
```

### Authentication Flow

1. User submits credentials → `/api/auth/sign-in`
2. Better Auth validates → Creates session cookie
3. Convex receives cookie → Validates via `getUser()` query
4. Frontend auth context updates → Triggers protected route access

### Billing Flow

1. User selects pricing tier → `prepareCheckout` action
2. Response types:
   - **New customer**: Stripe checkout URL (redirect)
   - **Existing customer**: Checkout modal (inline)
3. Stripe processes payment → Webhook updates Convex
4. Dashboard shows subscription status

### Report Generation Flow

1. User submits date range + filters → `generateAndSaveReport` action
2. Backend calls CodeRabbit API (10min timeout)
3. Status stored as 'pending' in `reports` table
4. Poll for completion → Update to 'completed' or 'failed'
5. Frontend displays markdown results

## Development

```bash
bun run dev          # Start dev server (https://localhost:3000)
bun run typecheck    # TypeScript validation
bun run format       # Prettier + ESLint
bun run check        # Verify formatting
bun run all          # Full check + build
```

Dev server uses HTTPS via local certificates in `certificates/` directory.

## Production Build

```bash
bun run build        # Build client + server bundles
bunx convex deploy   # Deploy Convex backend to production
```

Build outputs:
- `dist/client` - Static assets + client JS
- `dist/server` - Server-side route handlers

Source maps uploaded to Sentry if `SENTRY_AUTH_TOKEN` is set.

## Deployment (Netlify)

```bash
# Connect to Netlify
netlify link

# Set environment variables in Netlify Dashboard
# (Copy from .env.local, excluding CONVEX_* vars)

# Deploy
git push origin main
```

Netlify configuration (`netlify.toml`):
- Build command: `vite build`
- Publish directory: `dist/client`
- Environment secrets allowlist (prevents false-positive secret detection)

### Environment Switching

**Development:**
- `CONVEX_DEPLOYMENT=dev:...`
- Uses `VITE_DEV_SITE_URL` + `DEV_GITHUB_CLIENT_ID`

**Production:**
- `CONVEX_DEPLOYMENT=prod:...`
- Uses `VITE_SITE_URL` + `GITHUB_CLIENT_ID`

Auth configuration automatically switches based on `CONVEX_DEPLOYMENT` prefix.

## Code Quality

### TypeScript Configuration
- Strict mode enabled
- No unused locals/parameters
- ES2022 target
- Bundler module resolution

### Patterns

**Error Handling:**
```typescript
// Convex functions
import { ConvexError } from "convex/values"

throw new ConvexError({
  code: "UNAUTHENTICATED",
  message: "User not authenticated"
})
```

**Logging:**
```typescript
// With correlation IDs
logger.info("Operation started", { correlationId, userId })
logger.performance("Query completed", { correlationId, durationMs })
```

**Validation:**
```typescript
// Input validation
const validated = validateText(input, {
  minLength: 1,
  maxLength: 100
})
```

### Performance Monitoring

Convex query limits (warnings at 60%):
- 16,384 docs scanned per query
- 4,096 database calls per query
- 8MiB data per query
- 1s execution time

Operations >1s trigger performance warnings in logs.

## Security

**Implemented:**
- CORS allowlist (localhost + Netlify previews + production domain)
- Rate limiting (5 req/10s on auth endpoints)
- Environment variable validation (Zod schemas)
- HTTP/2 header filtering (Better Auth API routes)
- Secure cookie handling (httpOnly, sameSite)
- HTTPS in development
- Sentry PII filtering (`sendDefaultPii: false`)

**Considerations:**
- 2FA supported in Better Auth schema, requires UI implementation
- Email verification optional, can be enforced
- Audit logging not implemented (add for sensitive operations)

## Monitoring

### Sentry Configuration
- 10% trace sample rate (production)
- Correlation IDs in breadcrumbs
- Router navigation tracking
- Custom error ingestion (free plan compatible)

### Logging
- Structured JSON logs (production)
- Pretty-printed logs (development)
- Correlation IDs for request tracing
- Performance warnings (>1s operations)

### Convex Dashboard
- Real-time query performance
- Function execution logs
- Error tracking
- Database inspection

## Troubleshooting

**Issue: Convex deployment not found**
- Run `bunx convex dev` to initialize
- Check `.env.local` for `CONVEX_DEPLOYMENT` and `CONVEX_URL`

**Issue: Better Auth errors**
- Verify `BETTER_AUTH_SECRET` is set in Convex Dashboard
- Check SITE_URL matches current environment

**Issue: GitHub OAuth fails**
- Confirm callback URL: `https://localhost:3000/api/auth/callback/github`
- Verify dev credentials use `DEV_GITHUB_CLIENT_ID` prefix

**Issue: Payments not working**
- Confirm Autumn secret key is valid
- Check Stripe webhook configuration
- Verify Autumn Convex plugin is installed

**Issue: CodeRabbit reports fail**
- Requires CodeRabbit Pro subscription
- API key must be set in Convex (not .env.local)
- Report generation can take up to 10 minutes

## Scripts

```bash
bun run dev              # Development server
bun run build            # Production build
bun run start            # Preview production build locally
bun run typecheck        # TypeScript validation
bun run format           # Format with Prettier
bun run format:check     # Verify formatting
bun run lint             # Run ESLint
bun run check            # Format + lint + typecheck
bun run all              # Full check + build
```

## License

MIT
