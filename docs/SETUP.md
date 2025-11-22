# Setup Guide

Complete installation and configuration instructions.

## Prerequisites

- [ ] Bun installed
- [ ] Convex account: https://convex.dev
- [ ] Autumn account: https://useautumn.com

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

## Next Steps

- [Configure optional integrations](INTEGRATIONS.md)
- [Understand environment variables](ENVIRONMENT.md)
- [Review security settings](SECURITY.md)
