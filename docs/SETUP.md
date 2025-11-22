# Setup Guide

Complete installation and configuration instructions.

## Prerequisites

- [ ] Bun installed
- [ ] Convex account: https://convex.dev
- [ ] Autumn account: https://useautumn.com
- [ ] Netlify account: https://netlify.com (for deployment)

---

## HTTPS Certificates

> [!IMPORTANT]
> Better Auth requires HTTPS in development.

### macOS

```bash
brew install mkcert
brew install nss  # Firefox only
mkcert -install
```

### Linux

<details>
<summary>Homebrew</summary>

```bash
brew install mkcert
mkcert -install
```

</details>

<details>
<summary>Ubuntu/Debian</summary>

```bash
sudo apt install libnss3-tools
wget -O mkcert https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
chmod +x mkcert
sudo mv mkcert /usr/local/bin/
mkcert -install
```

</details>

### Windows

<details>
<summary>Chocolatey</summary>

```bash
choco install mkcert
mkcert -install
```

</details>

<details>
<summary>Scoop</summary>

```bash
scoop bucket add extras
scoop install mkcert
mkcert -install
```

</details>

### Generate Certificates

```bash
mkdir certificates
mkcert -key-file certificates/localhost-key.pem -cert-file certificates/localhost.pem localhost 127.0.0.1 ::1
```

> [!TIP]
> Vite auto-loads from `certificates/` directory.

---

## Installation

```bash
# 1. Clone and install
git clone <repo>
cd tanvex
bun install

# 2. Environment setup
cp .env.example .env.local

# 3. Start Convex (auto-fills CONVEX_URL and CONVEX_DEPLOYMENT in .env.local)
bunx convex dev

# 4. Set required secrets in Convex Dashboard
# See https://dashboard.convex.dev → deployment → Settings → Environment Variables
```

---

## Required Convex Secrets

> [!IMPORTANT]
> Navigate to [Convex Dashboard](https://dashboard.convex.dev) → deployment → Settings → Environment Variables:

```bash
BETTER_AUTH_SECRET=<openssl rand -base64 32>
AUTUMN_SECRET_KEY=<from https://app.useautumn.com>
VITE_DEV_SITE_URL=https://localhost:3000
```

---

## Start Development Server

```bash
bun run dev  # https://localhost:3000
```

> [!NOTE]
> Dev server runs on `https://localhost:3000` (HTTPS required).

---

## Production Deployment (Netlify)

### 1. Connect Repository

```bash
# Option A: Netlify CLI
npm install -g netlify-cli
netlify login
netlify init

# Option B: Netlify Dashboard
# Go to https://app.netlify.com → Add new site → Import from Git
```

### 2. Configure Build Settings

**In Netlify Dashboard → Site settings → Build & deploy:**

| Setting | Value |
|---------|-------|
| Build command | `vite build` |
| Publish directory | `dist/client` |
| Node version | 20.x (set in Environment Variables) |

### 3. Set Environment Variables

**In Netlify Dashboard → Site settings → Environment variables:**

```bash
# Required (same as Convex prod deployment)
VITE_SITE_URL=https://your-site.netlify.app
CONVEX_DEPLOYMENT=prod:your-deployment-id
CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_SITE_URL=https://your-deployment.convex.site
CONVEX_NETLIFY_PROD_DEPLOY_KEY=<from Convex Dashboard>

# GitHub OAuth (production app)
GITHUB_CLIENT_ID=<prod client id>
GITHUB_CLIENT_SECRET=<prod client secret>

# Optional
SENTRY_DSN=<from https://sentry.io>
SENTRY_AUTH_TOKEN=<for source maps>
SENTRY_ORG=<org slug>
SENTRY_PROJECT=<project slug>
```

See [ENVIRONMENT.md](ENVIRONMENT.md) for detailed variable explanations.

### 4. Deploy

```bash
# Backend (Convex)
bunx convex deploy --prod

# Frontend (Netlify)
git push origin main  # Auto-deploys via Netlify's Git integration
```

### 5. Verify Deployment

- [ ] Site loads at Netlify URL
- [ ] GitHub OAuth works (check callback URL)
- [ ] Billing checkout redirects to Stripe
- [ ] Sentry receives error events (test by triggering an error)

---

## Next Steps

- [Configure optional integrations](INTEGRATIONS.md)
- [Understand environment variables](ENVIRONMENT.md)
- [Review security settings](SECURITY.md)
