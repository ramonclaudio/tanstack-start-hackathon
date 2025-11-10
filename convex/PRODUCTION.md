# Convex Production Operations Guide

## Overview

This guide covers production monitoring, observability, and operational practices for the Tanvex Convex backend.

## Required Setup

### 1. Environment Variables

**Production Deployment (Convex Dashboard → Settings → Environment Variables):**

```bash
# Required
SITE_URL=https://your-production-domain.com
AUTUMN_SECRET_KEY=your_autumn_key

# Optional - Sentry (if not using Convex Pro Dashboard integration)
SENTRY_DSN=https://public@sentry.io/project-id

# Optional - GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

**Development (.env.local):**

```bash
SITE_URL=http://localhost:3000
AUTUMN_SECRET_KEY=dev_key
SENTRY_DSN=https://public@sentry.io/dev-project-id
```

### 2. Log Retention Setup (Pro Plan Only)

**⚠️ IMPORTANT:** Convex only keeps limited logs and may erase them during maintenance.

**Pro Plan:** Set up log streaming to third-party service.
**Free/Self-Hosted:** Logs only available in Dashboard (limited retention).

#### Option A: Axiom (Recommended)

1. Sign up at [axiom.co](https://axiom.co)
2. Create dataset: `tanvex-convex-logs`
3. Get API token from Settings
4. Configure in Convex Dashboard → Integrations → Log Streams (Pro only)
5. Test with: `npx convex logs --tail`

#### Option B: Datadog

1. Create Datadog account
2. Get API key from Organization Settings
3. Configure in Convex Dashboard → Integrations → Log Streams (Pro only)
4. Set up monitors for error rates and latency

#### Option C: Logtail (Better Stack)

1. Sign up at [betterstack.com](https://betterstack.com)
2. Create log source
3. Configure in Convex Dashboard → Integrations → Log Streams (Pro only)

**Free Plan Alternative:**

Monitor logs in real-time via:

```bash
npx convex logs --tail
```

Or view in Dashboard → Logs page. Keep Sentry configured for exception tracking.

### 3. Error Monitoring

**Sentry Setup - Two Options:**

#### Option A: Built-in Integration (Convex Pro Only)

Convex Pro has native Sentry integration - no custom code needed.

1. Create Sentry project at [sentry.io](https://sentry.io)
2. Get your [Sentry DSN](https://docs.sentry.io/product/sentry-basics/concepts/dsn-explainer/)
3. Configure in Convex Dashboard:
   - Navigate to **Deployment Settings**
   - Click **Integrations** tab
   - Click **Sentry** card
   - Paste your DSN
   - (Optional) Add custom tags

**Automatically tracked:**

- `func`: Function name (e.g., "tasks:create")
- `func_type`: "query", "mutation", "action", or "http_action"
- `request_id`: Convex request ID
- `environment`: "prod", "dev", or "preview"
- `user`: tokenIdentifier (if authenticated)

#### Option B: Manual Integration (Free Plan / Self-Hosted)

This codebase includes Sentry integration that works on ALL plans.

1. Create Sentry project at [sentry.io](https://sentry.io)
2. Get your DSN
3. Set `SENTRY_DSN` environment variable in Dashboard or `.env.local`
4. Deploy

**In Your Code (Option B only):**

```typescript
import { captureException } from './lib/sentry'

try {
  // Your code
} catch (error) {
  // Logs to console + sends to Sentry
  await captureException(error, {
    correlationId,
    functionName: 'tasks.create',
    tags: { operation: 'create_task' },
    extra: { userId: user.id },
  })
  throw error
}
```

**What's Reported:**

- Exception traces with stack traces
- ConvexError payloads with error codes
- Correlation IDs for tracing
- Function names and contexts
- Custom tags and metadata

**Not Reported:**

- CORS errors (too noisy, logged to console only)
- Expected auth failures (e.g., unauthenticated users)

**Performance Impact:**

Sentry calls are async and fire-and-forget. Failed Sentry requests don't break your app.

### 4. Performance Monitoring

**Built-in Metrics:**

All queries and mutations automatically track:

- Correlation IDs for request tracing
- Execution duration
- Database call counts
- Document scan estimates

**Slow Query Detection:**

Queries log warnings when:

- Duration > 100ms
- Database calls > 10
- Document scans > 10,000

**Example Log:**

```json
{
  "level": "warn",
  "module": "tasks",
  "message": "Slow query detected",
  "correlationId": "1704067200000-a3f2",
  "function": "tasks.list",
  "duration": "237.42ms",
  "dbCalls": 15,
  "docsScanned": 342
}
```

## Monitoring Best Practices

### Dashboard Monitoring

**Key Metrics to Track:**

1. **Error Rate:** Dashboard → Logs → Filter by level:error
2. **Function Duration:** Dashboard → Functions → Performance
3. **Database Limits:** Watch for "OCC" (optimistic concurrency) errors
4. **Storage Growth:** Dashboard → Data → Storage metrics

**Alert Thresholds:**

- Error rate > 1% of requests
- P95 latency > 500ms
- Storage > 80% of plan limit
- OCC errors > 5% of mutations

### Log Querying

**Find Errors by Correlation ID:**

```bash
# Stream logs in real-time
npx convex logs --tail

# Search for specific correlation ID
# Copy correlation ID from error, search in Dashboard → Logs
```

**Common Queries:**

```
# All errors in last hour
level:error timestamp:>-1h

# Slow queries
message:"Slow query detected"

# Specific function errors
function:"tasks.list" level:error

# High database usage
dbCalls:>50
```

### Incident Response

**Error Investigation Flow:**

1. **Get Alert** → Check Sentry/log stream notification
2. **Find Correlation ID** → Extract from error message
3. **Search Logs** → Paste correlation ID in Dashboard → Logs
4. **Check Context** → Review full request trace
5. **Identify Root Cause** → Check function code, data state
6. **Deploy Fix** → `npx convex deploy`
7. **Verify** → Monitor logs for 10min post-deploy

**Common Issues:**

| Error                 | Likely Cause                  | Fix                                 |
| --------------------- | ----------------------------- | ----------------------------------- |
| `OCC` errors          | Concurrent mutation conflicts | Add retry logic or use transactions |
| Query timeout (>1s)   | Too many docs scanned         | Add index, optimize query           |
| `NOT_FOUND` errors    | Race condition or bad ref     | Add existence checks                |
| `VALIDATION_ERROR`    | Client sending bad data       | Update client validation            |
| Sentry failed to send | Bad DSN or network            | Check env var format                |

## Schema Migration Strategy

**Safe Schema Changes (0 Users):**

Since you have 0 users, you can make breaking schema changes freely:

1. **Add New Table:**

   ```typescript
   // convex/schema.ts
   users: defineTable({
     email: v.string(),
     name: v.string(),
   }),
   ```

2. **Add Field:**

   ```typescript
   tasks: defineTable({
     text: v.string(),
     completed: v.boolean(),
     priority: v.optional(v.string()), // New field
   }),
   ```

3. **Remove Field:**
   - Remove from schema
   - Deploy (schema validation will fail if data exists)
   - This is fine with 0 users

**Future Migration Strategy (With Users):**

1. **Add Optional Field → Backfill → Make Required:**

   ```typescript
   // Step 1: Add as optional
   priority: v.optional(v.string())

   // Step 2: Run migration (separate script)
   await ctx.db.patch(taskId, { priority: 'medium' })

   // Step 3: Make required after all docs migrated
   priority: v.string()
   ```

2. **Change Field Type:**

   ```typescript
   // Step 1: Union old + new type
   status: v.union(v.boolean(), v.string())

   // Step 2: Migrate data
   // Step 3: Remove old type
   status: v.string()
   ```

## Deployment Workflow

### Manual Deployment

```bash
# Deploy to production
npx convex deploy --prod

# View deployment status
npx convex status

# Check logs post-deploy
npx convex logs --tail --deployment production
```

### CI/CD Deployment (Recommended)

**GitHub Actions Example:**

```yaml
name: Deploy to Convex

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm ci
      - run: npx convex deploy --prod
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}
```

**Setup:**

1. Get deploy key: Dashboard → Settings → Generate Production Deploy Key
2. Add to GitHub: Repo → Settings → Secrets → New secret
3. Name: `CONVEX_DEPLOY_KEY`
4. Push to `main` triggers auto-deploy

### Rollback Strategy

**If Deployment Breaks Production:**

1. **Immediate:** Revert git commit

   ```bash
   git revert HEAD
   git push origin main
   ```

2. **CI will auto-deploy previous version**

3. **Manual rollback (if CI broken):**

   ```bash
   git checkout <previous-commit>
   npx convex deploy --prod
   ```

4. **Check logs:**
   ```bash
   npx convex logs --tail --deployment production
   ```

## Performance Optimization

### Query Optimization

**Add Indexes for Common Queries:**

```typescript
// convex/schema.ts
tasks: defineTable({
  text: v.string(),
  completed: v.boolean(),
  userId: v.string(),
})
  .index('by_completed', ['completed'])
  .index('by_user', ['userId'])
  .index('by_user_completed', ['userId', 'completed'])
```

**Pagination Best Practices:**

- Always use `.paginate()` for lists
- Set reasonable `initialNumItems` (50-100)
- Use cursor-based pagination (built-in)

**Avoid N+1 Queries:**

```typescript
// ❌ Bad: N+1 query
for (const task of tasks) {
  const user = await ctx.db.get(task.userId)
}

// ✅ Good: Batch read
const userIds = tasks.map((t) => t.userId)
const users = await Promise.all(userIds.map((id) => ctx.db.get(id)))
```

### Database Limits

**Hard Limits:**

- 16,384 documents scanned per query
- 8MiB data returned per query
- 4,096 database calls per function
- 1 second execution timeout (queries)
- 5 minutes execution timeout (actions)

**Monitoring:**

```typescript
import {
  resetQueryTracking,
  trackDbCall,
  getQueryMetrics,
} from './lib/validators'

// At function start
resetQueryTracking()

// Before each db call
trackDbCall(estimatedDocs)

// Check metrics
const { dbCalls, docsScanned } = getQueryMetrics()
```

## Security Best Practices

### Environment Variable Safety

- ✅ Use Convex Dashboard for production secrets
- ✅ Never commit `.env.local` to git
- ✅ Rotate secrets quarterly
- ❌ Don't log secret values
- ❌ Don't expose secrets in client code

### CORS Configuration

```typescript
// convex/http.ts
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  process.env.SITE_URL,
  process.env.NEXT_PUBLIC_SITE_URL,
].filter(Boolean)
```

**Update for Production:**

- Set exact production domain
- Remove wildcard origins
- CORS errors are logged but NOT sent to Sentry (too noisy)

### Rate Limiting

**Built-in (Better Auth):**

```typescript
rateLimit: {
  enabled: true,
  storage: 'database',
  window: 60,
  max: 100,
  customRules: {
    '/sign-in/email': { window: 10, max: 5 },
    '/sign-up/email': { window: 10, max: 5 },
  },
}
```

**Add Custom Rate Limits:**

Use Convex scheduled functions or third-party rate limiters.

## Scheduled Functions

**Backwards Compatibility:**

Scheduled functions always run their **currently deployed version** with **old arguments**.

**Example Safe Pattern:**

```typescript
// v1: Original
export const processTask = internalMutation({
  args: { taskId: v.id('tasks') },
  handler: async (ctx, args) => {
    // Process task
  },
})

// v2: Add optional field
export const processTask = internalMutation({
  args: {
    taskId: v.id('tasks'),
    priority: v.optional(v.string()), // Handle missing for old scheduled calls
  },
  handler: async (ctx, args) => {
    const priority = args.priority ?? 'medium' // Default for old calls
    // Process task
  },
})
```

## Cost Optimization

### Monitor Usage

**Dashboard → Settings → Usage:**

- Function calls
- Database storage
- Document reads/writes
- Bandwidth

### Optimize Costs

1. **Add Indexes:** Reduce scanned docs (cheaper queries)
2. **Use Pagination:** Don't load all documents at once
3. **Cache Client-Side:** Reduce redundant queries
4. **Delete Old Data:** Archive to external storage
5. **Batch Operations:** Combine multiple updates into one mutation

## Troubleshooting

### Common Error Codes

| Code                  | Meaning                         | Action               |
| --------------------- | ------------------------------- | -------------------- |
| `OCC`                 | Optimistic concurrency conflict | Retry mutation       |
| `VALIDATION_ERROR`    | Input validation failed         | Check client data    |
| `NOT_FOUND`           | Document doesn't exist          | Add existence check  |
| `UNAUTHENTICATED`     | User not logged in              | Check auth flow      |
| `UNAUTHORIZED`        | Permission denied               | Check access control |
| `RATE_LIMIT_EXCEEDED` | Too many requests               | Implement backoff    |

### Debug Checklist

- [ ] Check correlation ID in logs
- [ ] Verify environment variables set
- [ ] Test locally with `npx convex dev`
- [ ] Check schema matches data
- [ ] Review recent deployments
- [ ] Check Sentry for related errors
- [ ] Monitor database storage limits
- [ ] Verify indexes exist for queries

## Support Channels

- **Convex Docs:** [docs.convex.dev](https://docs.convex.dev)
- **Convex Discord:** [discord.gg/convex](https://discord.gg/convex)
- **Dashboard Logs:** Real-time error tracking
- **Sentry:** Exception monitoring and alerting

## Production Checklist

Before launching:

- [ ] Set all required environment variables
- [ ] Configure log streaming (Axiom/Datadog/Logtail)
- [ ] Set up Sentry error monitoring
- [ ] Add indexes for common queries
- [ ] Test schema migrations locally
- [ ] Configure CI/CD deployment
- [ ] Set up monitoring alerts
- [ ] Document rollback procedure
- [ ] Load test critical functions
- [ ] Review security configuration
- [ ] Test error handling paths
- [ ] Verify CORS configuration
