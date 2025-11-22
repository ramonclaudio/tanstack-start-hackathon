# Monitoring

Error tracking, logging, and performance monitoring configuration.

---

## Sentry

### Configuration

**Client-side** (`app/client.tsx`):
```typescript
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,  // 10% of transactions
  sendDefaultPii: false,   // No user data
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ]
})
```

**Server-side** (`convex/sentry.ts`):
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.CONVEX_DEPLOYMENT,
  tracesSampleRate: 0.1,
  sendDefaultPii: false
})
```

### Features

| Feature | Status | Description |
|---------|--------|-------------|
| Error capture | ✅ | Client + server exceptions |
| Breadcrumbs | ✅ | Correlation IDs, router navigation |
| Source maps | ✅ | Auto-uploaded if `SENTRY_AUTH_TOKEN` set |
| Trace sampling | ✅ | 10% of requests tracked |
| PII filtering | ✅ | `sendDefaultPii: false` |
| Custom ingestion | ✅ | Works on free plan |

### Correlation IDs

Every request gets a correlation ID for tracing across client/server:

```typescript
const correlationId = crypto.randomUUID()

// Client
Sentry.addBreadcrumb({
  category: 'correlation',
  message: correlationId
})

// Server
Sentry.setContext('request', { correlationId })
```

Search Sentry by correlation ID to see full request flow.

### Source Maps

Auto-uploaded on production builds if `SENTRY_AUTH_TOKEN` set:

```bash
bunx convex deploy  # Uploads source maps to Sentry
```

Enables readable stack traces for minified code.

---

## Logging

### Development

Pretty-printed console logs:
```typescript
console.log('User authenticated:', { userId, email })
```

### Production

Structured JSON logs (Convex automatically captures):
```typescript
console.log(JSON.stringify({
  level: 'info',
  message: 'User authenticated',
  userId,
  email,
  correlationId
}))
```

View in Convex Dashboard → Logs.

### Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| `debug` | Development only | Verbose state dumps |
| `info` | Normal operations | User login, API calls |
| `warn` | Recoverable errors | Rate limit hit, retry |
| `error` | Failures | Auth failed, DB error |

### Performance Warnings

Operations exceeding 1s log automatically:
```typescript
const start = Date.now()
// ... operation
if (Date.now() - start > 1000) {
  console.warn(`Slow operation: ${Date.now() - start}ms`)
}
```

---

## Performance Monitoring

### Convex Limits

All queries/mutations have limits. Warnings at 60% threshold:

| Limit | Value | Warning At |
|-------|------:|----------:|
| Docs scanned per query | 16,384 | 9,830 |
| Database calls per query | 4,096 | 2,458 |
| Data per query | 8 MiB | 4.8 MiB |
| Execution time | 1s | 600ms |

Exceeding limits causes query failure.

### Optimization Strategies

**Indexing:**
```typescript
// convex/schema.ts
users: defineTable({
  email: v.string()
}).index('by_email', ['email'])  // Faster lookups
```

**Batching:**
```typescript
// Bad: N+1 queries
for (const userId of userIds) {
  await ctx.db.get(userId)
}

// Good: Single query
const users = await ctx.db
  .query('users')
  .filter(q => userIds.includes(q.id))
  .collect()
```

**Pagination:**
```typescript
// Bad: Load all records
const allUsers = await ctx.db.query('users').collect()

// Good: Paginate
const users = await ctx.db
  .query('users')
  .order('desc')
  .take(50)
```

### Monitoring Tools

**Convex Dashboard:**
- Real-time query performance
- Function execution time
- Database call counts
- Error rates

**Sentry Performance:**
- Transaction traces (10% sampled)
- Slow route detection
- Database query timing
- External API latency

---

## Alerts

### Sentry Alerts

Configure at https://sentry.io/alerts

Recommended rules:
- **Error spike**: >10 errors/minute
- **New issue**: First occurrence of error
- **Regression**: Previously resolved issue returns
- **Performance degradation**: P95 latency >2s

### Convex Monitoring

No built-in alerting. Options:
1. **Scheduled function** checks error rates in logs table
2. **Webhook** to external monitoring (PagerDuty, Slack)
3. **Sentry integration** for server-side errors

Example scheduled monitor:
```typescript
// convex/crons.ts
export const healthCheck = internalMutation({
  handler: async (ctx) => {
    const errors = await ctx.db
      .query('logs')
      .filter(q => q.eq(q.field('level'), 'error'))
      .filter(q => q.gte(q.field('timestamp'), Date.now() - 5 * 60 * 1000))
      .collect()

    if (errors.length > 10) {
      // Alert via webhook
      await fetch('https://hooks.slack.com/...', {
        method: 'POST',
        body: JSON.stringify({ text: `${errors.length} errors in 5min` })
      })
    }
  }
})
```

---

## Metrics

### Key Metrics

Track these in Sentry/Convex:

**Availability:**
- Uptime percentage
- Error rate (errors/total requests)
- Failed authentication attempts

**Performance:**
- P50/P95/P99 latency
- Database query time
- External API response time

**Business:**
- New user signups
- Subscription conversions
- Active sessions

### Custom Metrics

Sentry supports custom metrics:
```typescript
Sentry.metrics.increment('checkout.started', 1, {
  tags: { plan: 'pro' }
})

Sentry.metrics.distribution('report.generation_time', duration, {
  unit: 'millisecond'
})
```

---

## Related Documentation

- [Security](SECURITY.md) - PII filtering, correlation IDs
- [Integrations](INTEGRATIONS.md) - Sentry setup
- [Environment Variables](ENVIRONMENT.md) - `SENTRY_*` configuration
