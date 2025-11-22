# Environment Variables

> [!CAUTION]
> Three locations with different purposes. **Don't mix them up.**

| Location | Purpose | What differs dev→prod |
|----------|---------|:---------------------:|
| **Convex Dashboard** | Backend runtime | URL + GitHub credentials |
| **.env.local** | Local client build | Auto-filled by CLI |
| **Netlify** | Prod client build | Uses prod values only |

---

## Convex Dashboard

Set at: https://dashboard.convex.dev → deployment → Settings → Environment Variables

### Development Deployment

```bash
# Auto-switched based on CONVEX_DEPLOYMENT prefix
CONVEX_DEPLOYMENT=dev:your-id
VITE_DEV_SITE_URL=https://localhost:3000
DEV_GITHUB_CLIENT_ID=<dev OAuth app>
DEV_GITHUB_CLIENT_SECRET=<dev OAuth secret>

# Same in both dev/prod
BETTER_AUTH_SECRET=<openssl rand -base64 32>
AUTUMN_SECRET_KEY=<from https://app.useautumn.com>
SENTRY_DSN=<from https://sentry.io>
SENTRY_AUTH_TOKEN=<for source maps>
SENTRY_ORG=<org slug>
SENTRY_PROJECT=<project slug>
CODERABBIT_API_KEY=<optional, requires Pro>
```

### Production Deployment

```bash
# Auto-switched based on CONVEX_DEPLOYMENT prefix
CONVEX_DEPLOYMENT=prod:your-id
VITE_SITE_URL=https://your-domain.netlify.app
GITHUB_CLIENT_ID=<prod OAuth app>
GITHUB_CLIENT_SECRET=<prod OAuth secret>

# Same as dev (copy from above)
BETTER_AUTH_SECRET=<same as dev>
AUTUMN_SECRET_KEY=<same as dev>
SENTRY_DSN=<same as dev>
SENTRY_AUTH_TOKEN=<same as dev>
SENTRY_ORG=<same as dev>
SENTRY_PROJECT=<same as dev>
CODERABBIT_API_KEY=<same as dev>
```

> [!NOTE]
> **Why separate OAuth apps?**
> Callback URLs differ between dev (`localhost:3000`) and prod (`your-domain.netlify.app`). Using separate apps with `DEV_*` prefix avoids manual URL changes.

---

## .env.local

Auto-filled by `bunx convex dev`. Only add manually:

```bash
SENTRY_DSN=<for client-side error tracking>
```

> [!WARNING]
> Do not commit this file.

---

## Netlify

Set at: https://app.netlify.com → Site → Environment Variables

```bash
# Deployment config
VITE_SITE_URL=https://your-domain.netlify.app
CONVEX_DEPLOYMENT=prod:your-id
CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_SITE_URL=https://your-deployment.convex.site
CONVEX_NETLIFY_PROD_DEPLOY_KEY=<from Convex Dashboard>

# OAuth (use PROD credentials, NOT DEV_*)
GITHUB_CLIENT_ID=<prod app>
GITHUB_CLIENT_SECRET=<prod secret>

# Optional monitoring
SENTRY_DSN=<optional>
SENTRY_AUTH_TOKEN=<optional>
SENTRY_ORG=<optional>
SENTRY_PROJECT=<optional>
```

---

## Variable Reference

| Variable | Required | Location | Purpose |
|----------|:--------:|----------|---------|
| `BETTER_AUTH_SECRET` | ✅ | Convex | Session encryption |
| `AUTUMN_SECRET_KEY` | ✅ | Convex | Stripe billing API |
| `VITE_DEV_SITE_URL` | Dev only | Convex | Local dev URL |
| `VITE_SITE_URL` | Prod only | Convex + Netlify | Production URL |
| `DEV_GITHUB_CLIENT_ID` | Optional | Convex dev | GitHub OAuth dev |
| `DEV_GITHUB_CLIENT_SECRET` | Optional | Convex dev | GitHub OAuth dev |
| `GITHUB_CLIENT_ID` | Optional | Convex prod + Netlify | GitHub OAuth prod |
| `GITHUB_CLIENT_SECRET` | Optional | Convex prod + Netlify | GitHub OAuth prod |
| `SENTRY_DSN` | Optional | All | Error tracking |
| `SENTRY_AUTH_TOKEN` | Optional | Convex + Netlify | Source map upload |
| `SENTRY_ORG` | Optional | Convex + Netlify | Sentry org |
| `SENTRY_PROJECT` | Optional | Convex + Netlify | Sentry project |
| `CODERABBIT_API_KEY` | Optional | Convex | AI code reviews |
| `CONVEX_DEPLOYMENT` | Auto | .env.local | Deployment identifier |
| `CONVEX_URL` | Auto | .env.local + Netlify | Backend URL |
| `CONVEX_SITE_URL` | Auto | Netlify | HTTP routes URL |
| `CONVEX_NETLIFY_PROD_DEPLOY_KEY` | Prod | Netlify | Deploy trigger |

---

## Common Mistakes

> [!WARNING]
> **Using `DEV_GITHUB_CLIENT_ID` in production:**
> - Production must use `GITHUB_CLIENT_ID` (no `DEV_` prefix)
> - Netlify should never have `DEV_*` variables

> [!WARNING]
> **Mixing dev/prod URLs:**
> - Dev: `VITE_DEV_SITE_URL=https://localhost:3000`
> - Prod: `VITE_SITE_URL=https://your-domain.netlify.app`
> - Code auto-switches based on `CONVEX_DEPLOYMENT` prefix

> [!WARNING]
> **Forgetting to set in Convex:**
> - `.env.local` is for client-side builds only
> - Backend (Convex) reads from Dashboard → Environment Variables
> - Setting vars only in `.env.local` won't work for server functions
