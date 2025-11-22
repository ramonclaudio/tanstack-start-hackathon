# Integrations

Optional third-party service configurations.

---

## GitHub OAuth

Enables "Sign in with GitHub" authentication.

### Why Two OAuth Apps?

Callback URLs differ between environments:
- Dev: `https://localhost:3000/api/auth/callback/github`
- Prod: `https://your-domain.netlify.app/api/auth/callback/github`

Using separate apps avoids manual URL switching.

### Setup

1. **Create Dev OAuth App**
   - Go to https://github.com/settings/developers
   - Click "New OAuth App"
   - Application name: `Tanvex (Dev)`
   - Homepage URL: `https://localhost:3000`
   - Callback URL: `https://localhost:3000/api/auth/callback/github`
   - Register application
   - Copy Client ID and generate Client Secret

2. **Set Dev Credentials in Convex**
   - Dashboard → Dev deployment → Settings → Environment Variables
   - Add:
     ```bash
     DEV_GITHUB_CLIENT_ID=<dev client id>
     DEV_GITHUB_CLIENT_SECRET=<dev client secret>
     ```

3. **Create Prod OAuth App**
   - Repeat step 1 with:
   - Application name: `Tanvex (Production)`
   - Homepage URL: `https://your-domain.netlify.app`
   - Callback URL: `https://your-domain.netlify.app/api/auth/callback/github`

4. **Set Prod Credentials**
   - Convex prod deployment → Settings → Environment Variables:
     ```bash
     GITHUB_CLIENT_ID=<prod client id>
     GITHUB_CLIENT_SECRET=<prod client secret>
     ```
   - Netlify → Environment Variables (same values)

### How It Works

Code automatically switches based on `CONVEX_DEPLOYMENT`:
- `dev:*` prefix → Uses `DEV_GITHUB_CLIENT_ID`
- `prod:*` prefix → Uses `GITHUB_CLIENT_ID`

See `convex/auth.config.ts` for implementation.

---

## CodeRabbit API

AI-powered code review report generation.

### Requirements

- CodeRabbit Pro subscription
- Repository must be connected to CodeRabbit

### Setup

1. Get API key from https://coderabbit.ai/settings/api-keys
2. Set in Convex Dashboard (both dev and prod):
   ```bash
   CODERABBIT_API_KEY=<your-api-key>
   ```

### Features

- **Report Templates**: Daily Standup, Sprint, Release Notes, Custom
- **Date Filtering**: Max 90 days recommended (API timeout at 10 minutes)
- **Status Tracking**: pending → completed/failed
- **Auto Cleanup**: Cron removes stale reports every 60 minutes

### Usage

1. Navigate to `/coderabbit` route
2. Select date range (max 90 days)
3. Choose template
4. Submit (generation takes up to 10 minutes)
5. View markdown results

### Troubleshooting

- **Reports fail immediately**: Check API key is set in Convex (not `.env.local`)
- **Timeout errors**: Reduce date range (try 30 days)
- **Empty reports**: Verify repository is connected to CodeRabbit
- **403 errors**: Subscription required

---

## Sentry

Error tracking and performance monitoring.

### Setup

1. Create project at https://sentry.io
2. Copy DSN from project settings
3. Generate auth token for source maps:
   - Settings → Auth Tokens → Create New Token
   - Scopes: `project:releases`, `project:write`

4. **Set in Convex Dashboard** (both dev/prod):
   ```bash
   SENTRY_DSN=<your-dsn>
   SENTRY_AUTH_TOKEN=<your-token>
   SENTRY_ORG=<org-slug>
   SENTRY_PROJECT=<project-slug>
   ```

5. **Set in `.env.local`** (client-side tracking):
   ```bash
   SENTRY_DSN=<your-dsn>
   ```

6. **Set in Netlify** (production):
   ```bash
   SENTRY_DSN=<your-dsn>
   SENTRY_AUTH_TOKEN=<your-token>
   SENTRY_ORG=<org-slug>
   SENTRY_PROJECT=<project-slug>
   ```

### Features

- **Client-side**: React error boundaries, router navigation tracking
- **Server-side**: Convex function errors with correlation IDs
- **Source maps**: Auto-uploaded on build (requires `SENTRY_AUTH_TOKEN`)
- **Trace sampling**: 10% in production
- **Custom ingestion**: Works on free plan

### Configuration

See [MONITORING.md](MONITORING.md) for detailed Sentry configuration.

### Verification

1. Start dev server
2. Trigger an error (e.g., throw in a component)
3. Check Sentry dashboard for event

---

## Related Documentation

- [Environment Variables](ENVIRONMENT.md) - Full variable reference
- [Security](SECURITY.md) - CORS, rate limiting, session handling
- [Monitoring](MONITORING.md) - Logging, performance, Sentry config
