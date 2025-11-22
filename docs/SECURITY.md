# Security

Implementation details for authentication, authorization, and data protection.

---

## Implemented Security Measures

### CORS

**Location:** `convex/http.ts`

Allowlist restricts API access to:
- `https://localhost:3000` (development)
- `https://*.netlify.app` (preview deploys)
- Production domain (environment-specific)

```typescript
const allowedOrigins = [
  process.env.VITE_DEV_SITE_URL,
  process.env.VITE_SITE_URL,
  /https:\/\/.*\.netlify\.app$/
]
```

Requests from other origins receive 403.

### Rate Limiting

**Location:** Better Auth middleware

- **Endpoint:** `/api/auth/*`
- **Limit:** 5 requests per 10 seconds per IP
- **Scope:** Authentication endpoints only
- **Storage:** In-memory (resets on server restart)

Exceeding limit returns 429 Too Many Requests.

### Environment Variable Validation

**Location:** `convex/lib/env.ts`

All environment variables validated with Zod schemas at runtime:
- Type checking (string, number, URL)
- Required vs optional
- Format validation (URLs, secrets)

Invalid configuration throws on startup, preventing silent failures.

### HTTP/2 Header Filtering

**Location:** Better Auth API routes

Strips HTTP/2 pseudo-headers before passing to Better Auth:
- `:method`, `:path`, `:scheme`, `:authority`

Prevents header-related errors in authentication flow.

### Cookie Security

**Location:** Better Auth config

Session cookies use secure defaults:
- `httpOnly: true` (no JavaScript access)
- `sameSite: 'lax'` (CSRF protection)
- `secure: true` (HTTPS only in production)
- `path: '/'` (global scope)

### HTTPS in Development

**Requirement:** Better Auth OAuth flows

Local certificates via mkcert:
- Self-signed CA installed in system trust store
- Prevents browser warnings
- Enables `secure` cookie attribute

See [SETUP.md](SETUP.md) for certificate generation.

### PII Filtering

**Location:** Sentry config

```typescript
Sentry.init({
  sendDefaultPii: false  // Don't auto-capture user data
})
```

Correlation IDs used instead of user identifiers in breadcrumbs.

---

## Considerations (Not Implemented)

### Two-Factor Authentication (2FA)

**Status:** Schema supports it, no UI

Better Auth includes 2FA in database schema:
- TOTP (Time-based One-Time Password)
- SMS verification codes

To implement:
1. Add 2FA enrollment UI
2. Store recovery codes
3. Enforce on sensitive operations

### Email Verification

**Status:** Optional, not enforced

Better Auth supports email verification:
- Token-based verification
- Configurable expiration
- Resend capability

To enforce:
1. Enable in Better Auth config
2. Block unverified users from protected routes
3. Add verification reminder UI

### Audit Logging

**Status:** Not implemented

For compliance/forensics, add audit trail:
- User actions (login, data changes, permission changes)
- Admin operations
- Failed authentication attempts
- Data exports

Store in separate Convex table with retention policy.

---

## Security Checklist

### Development

- [ ] HTTPS certificates installed
- [ ] `.env.local` not committed (`.gitignore` includes it)
- [ ] Secrets use strong random values (`openssl rand -base64 32`)
- [ ] CORS allowlist includes only dev URLs

### Production

- [ ] All environment variables set in Convex + Netlify
- [ ] OAuth callback URLs match production domain
- [ ] Sentry PII filtering enabled
- [ ] HTTPS enforced (Netlify automatic)
- [ ] Rate limiting verified (test with curl)
- [ ] Cookies sent with `secure` flag
- [ ] No secrets in client-side code

### Ongoing

- [ ] Rotate `BETTER_AUTH_SECRET` if compromised
- [ ] Monitor Sentry for suspicious patterns
- [ ] Review Convex function permissions
- [ ] Update dependencies for security patches
- [ ] Audit third-party integrations

---

## Threat Model

### In Scope

- **Credential stuffing**: Mitigated by rate limiting
- **Session hijacking**: Mitigated by httpOnly cookies + HTTPS
- **CSRF**: Mitigated by sameSite cookies
- **XSS**: Mitigated by React's auto-escaping + CSP headers (Netlify)
- **SQL injection**: N/A (Convex uses schema-validated queries)

### Out of Scope

- **DDoS**: Rely on Netlify/Convex infrastructure
- **Zero-day exploits**: Keep dependencies updated
- **Social engineering**: User education required
- **Physical access**: Client-side encryption not implemented

---

## Reporting Vulnerabilities

Open a private security advisory at: https://github.com/your-repo/security/advisories

Do not open public issues for security vulnerabilities.
