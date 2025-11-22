# Troubleshooting

Common problems and solutions.

---

## Convex Issues

### Deployment Not Found

**Symptom:** `ConvexError: Deployment not found`

**Cause:** Convex backend not initialized.

**Solution:**
```bash
bunx convex dev  # Initializes deployment and fills .env.local
```

Verify `.env.local` contains:
```bash
CONVEX_DEPLOYMENT=dev:*
CONVEX_URL=https://*.convex.cloud
```

### Environment Variables Not Loading

**Symptom:** `undefined` when accessing `process.env.VARIABLE`

**Cause:** Variables not set in Convex Dashboard.

**Solution:**
1. Go to https://dashboard.convex.dev
2. Select deployment → Settings → Environment Variables
3. Add missing variables
4. Redeploy: `bunx convex deploy`

**Note:** `.env.local` is for client builds only. Server functions read from Convex Dashboard.

### Query Performance Warnings

**Symptom:** `Warning: Query exceeded 60% of limit`

**Cause:** Inefficient query (missing indexes, too many docs scanned).

**Solution:**

1. **Add index:**
   ```typescript
   // convex/schema.ts
   defineTable({ email: v.string() })
     .index('by_email', ['email'])
   ```

2. **Use pagination:**
   ```typescript
   .take(50)  // Don't load all records
   ```

3. **Filter server-side:**
   ```typescript
   // Bad: Load all, filter client-side
   const all = await ctx.db.query('users').collect()
   const filtered = all.filter(u => u.active)

   // Good: Filter in query
   const filtered = await ctx.db
     .query('users')
     .filter(q => q.eq(q.field('active'), true))
     .collect()
   ```

---

## Authentication Issues

### Better Auth Errors

**Symptom:** `Authentication failed` or `Invalid session`

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| `BETTER_AUTH_SECRET` not set | Set in Convex Dashboard |
| `SITE_URL` mismatch | Dev: `VITE_DEV_SITE_URL`, Prod: `VITE_SITE_URL` |
| Cookies not sent | Check HTTPS enabled (required) |
| Session expired | Default: 7 days. Clear cookies and re-login |

**Debug:**
```bash
# Check cookies in browser DevTools
# Application → Cookies → https://localhost:3000
# Look for: better-auth.session_token
```

### GitHub OAuth Fails

**Symptom:** `redirect_uri_mismatch` or `401 Unauthorized`

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Wrong callback URL | Dev: `https://localhost:3000/api/auth/callback/github`<br/>Prod: `https://your-domain.netlify.app/api/auth/callback/github` |
| Using prod credentials in dev | Use `DEV_GITHUB_CLIENT_ID` in dev deployment |
| Using dev credentials in prod | Use `GITHUB_CLIENT_ID` (no `DEV_` prefix) in prod |
| Credentials not set | Check Convex Dashboard → Environment Variables |

**Verify setup:**
```bash
# Dev deployment should have:
DEV_GITHUB_CLIENT_ID=...
DEV_GITHUB_CLIENT_SECRET=...

# Prod deployment should have:
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### HTTPS Certificate Errors

**Symptom:** `ERR_CERT_AUTHORITY_INVALID` or OAuth fails silently

**Cause:** Certificates not installed or trusted.

**Solution:**
```bash
# Reinstall CA
mkcert -install

# Regenerate certificates
rm -rf certificates
mkdir certificates
mkcert -key-file certificates/localhost-key.pem -cert-file certificates/localhost.pem localhost 127.0.0.1 ::1

# Restart dev server
bun run dev
```

Firefox users: Install `nss` (`brew install nss` on macOS).

---

## Billing Issues

### Payments Not Working

**Symptom:** Checkout fails or subscription not updated

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Invalid Autumn key | Verify `AUTUMN_SECRET_KEY` in Convex Dashboard |
| Stripe webhook not configured | Check Autumn dashboard for webhook status |
| Network timeout | Autumn API can be slow, wait 30s before retry |
| Wrong environment | Dev uses test mode, prod uses live mode |

**Debug:**
```bash
# Check Convex logs for Autumn API errors
# Dashboard → Logs → Filter by "autumn" or "stripe"
```

### Subscription Status Not Updating

**Symptom:** Dashboard shows old subscription after payment

**Cause:** Webhook not received or processing failed.

**Solution:**
1. Check Autumn webhook logs
2. Manually trigger webhook (Stripe dashboard)
3. Verify webhook endpoint accessible (Convex HTTP routes)
4. Check Convex logs for webhook processing errors

---

## CodeRabbit Issues

### Reports Fail Immediately

**Symptom:** Status goes straight to `failed`

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| API key not set | Add `CODERABBIT_API_KEY` in Convex Dashboard |
| No Pro subscription | Upgrade at https://coderabbit.ai/pricing |
| Repository not connected | Connect repo in CodeRabbit dashboard |
| Invalid API key | Regenerate at https://coderabbit.ai/settings/api-keys |

### Reports Timeout

**Symptom:** Status stuck on `pending` for >10 minutes

**Cause:** Date range too large (API timeout).

**Solution:**
- Reduce date range to 30 days or less
- Use narrower filters (specific repository, team)
- Try different template (some generate faster)

### Empty Reports

**Symptom:** Report completes but shows no data

**Causes:**
- No PRs in date range
- Repository has no CodeRabbit analysis
- Filters exclude all results

**Solution:** Remove filters and try wider date range.

---

## Build Issues

### TypeScript Errors

**Symptom:** `bun run build` fails with type errors

**Solution:**
```bash
# Check types without building
bun run typecheck

# Common fixes:
# 1. Update Convex schema
bunx convex dev  # Regenerates convex/_generated

# 2. Clear cache
rm -rf node_modules .tanstack dist
bun install

# 3. Check for missing imports
```

### Vite Build Failures

**Symptom:** `Error: Failed to build`

**Common causes:**

| Error | Solution |
|-------|----------|
| `Cannot find module` | Run `bun install` |
| `Out of memory` | Increase Node heap: `NODE_OPTIONS=--max_old_space_size=4096 bun run build` |
| `ENOENT: no such file` | Check import paths (case-sensitive) |
| Certificate errors | Build doesn't need HTTPS, remove cert references in build config |

---

## Deployment Issues

### Netlify Build Fails

**Symptom:** Deploy fails on Netlify

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Missing env vars | Set in Netlify → Environment Variables |
| Wrong build command | Should be `vite build` (check `netlify.toml`) |
| Wrong Node version | Netlify uses Node 18 by default, specify in `package.json`: `"engines": { "node": "20.x" }` |
| Convex not deployed | Deploy backend first: `bunx convex deploy` |

**Debug:**
```bash
# Local production build test
bun run build
bun run start  # Preview production build
```

### Functions Not Deploying

**Symptom:** Convex functions not updated after deploy

**Solution:**
```bash
# Force redeploy
bunx convex deploy --cmd 'bun run build'

# Clear Convex cache
bunx convex deploy --clear-cache

# Check deployment logs
bunx convex logs
```

---

## Sentry Issues

### Events Not Appearing

**Symptom:** Errors not showing in Sentry dashboard

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| `SENTRY_DSN` not set | Add to `.env.local` (client) and Convex Dashboard (server) |
| Sampling excludes event | 10% sampling in prod, 100% in dev |
| Sentry offline/blocked | Check browser console for Sentry errors |
| Environment filter | Verify environment filter in Sentry dashboard |

**Test Sentry:**
```typescript
// Trigger test error
throw new Error('Test error')

// Or use Sentry test
Sentry.captureException(new Error('Test'))
```

### Source Maps Not Working

**Symptom:** Stack traces show minified code

**Cause:** `SENTRY_AUTH_TOKEN` not set or source maps not uploaded.

**Solution:**
```bash
# Verify token set in Convex Dashboard + Netlify
# Check build logs for "Uploading source maps to Sentry"

# Manual upload:
bunx sentry-cli sourcemaps upload --org <org> --project <project> dist/
```

---

## Performance Issues

### Slow Page Loads

**Causes:**

1. **Unoptimized images:** Use WebP, lazy loading
2. **Large bundles:** Code split with dynamic imports
3. **Blocking queries:** Use `useQuery` with suspense
4. **No caching:** Enable Convex query caching

**Debug:**
```bash
# Analyze bundle size
bunx vite-bundle-visualizer

# Check network tab for slow requests
# DevTools → Network → Sort by time
```

### High Database Latency

**Symptom:** Queries take >500ms

**Solutions:**

1. **Add indexes** (see Query Performance Warnings above)
2. **Reduce data fetched:** Use pagination, select specific fields
3. **Cache results:** Convex auto-caches, ensure queries are deterministic
4. **Batch operations:** Combine multiple queries

**Monitor:**
- Convex Dashboard → Performance tab
- Check "Database calls per query" metric

---

## Getting Help

**Still stuck?**

1. **Check Convex logs:** https://dashboard.convex.dev → Logs
2. **Check browser console:** DevTools → Console
3. **Check Sentry:** https://sentry.io → Issues
4. **Convex Discord:** https://discord.gg/convex
5. **GitHub Issues:** https://github.com/your-repo/issues

**When reporting issues, include:**
- Error message (full stack trace)
- Environment (dev/prod, browser, OS)
- Steps to reproduce
- Relevant logs (Convex, Sentry, browser console)
