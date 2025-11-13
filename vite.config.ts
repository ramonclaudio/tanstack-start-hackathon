import path from 'node:path'
import fs from 'node:fs'
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import netlify from '@netlify/vite-plugin-tanstack-start'

const getHttpsConfig = () => {
  const keyPath = path.resolve(__dirname, 'certificates/localhost-key.pem')
  const certPath = path.resolve(__dirname, 'certificates/localhost.pem')

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }
  }

  return undefined
}

const isProduction = () => {
  const deployment = process.env['CONVEX_DEPLOYMENT']
  return deployment?.startsWith('prod:') ?? false
}

const isNetlifyBuild = () => {
  return process.env['NETLIFY'] === 'true'
}

const config = defineConfig({
  envPrefix: [
    'VITE_',
    'CONVEX_URL',
    'CONVEX_SITE_URL',
    'SENTRY_DSN',
    'SENTRY_ORG',
    'SENTRY_PROJECT',
  ],
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    ...(isNetlifyBuild() ? [netlify()] : []),
    viteReact(),
    ...(isProduction() && process.env['SENTRY_AUTH_TOKEN']
      ? [
          sentryVitePlugin({
            org: process.env['SENTRY_ORG'],
            project: process.env['SENTRY_PROJECT'],
            authToken: process.env['SENTRY_AUTH_TOKEN'],
            silent: !process.env['CI'],
            sourcemaps: {
              assets: './dist/client/**',
            },
          }),
        ]
      : []),
  ],
  server: {
    https: getHttpsConfig(),
  },
})

export default config
