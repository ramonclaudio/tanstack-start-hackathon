import path from 'node:path'
import fs from 'node:fs'
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    // Add Sentry plugin for source map upload (production only, requires SENTRY_AUTH_TOKEN)
    ...(process.env.NODE_ENV === 'production' && process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            silent: !process.env.CI,
            sourcemaps: {
              assets: './dist/client/**',
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: true, // Enable source maps for Sentry
  },
  server: {
    https: {
      key: fs.readFileSync(
        path.resolve(__dirname, 'certificates/localhost-key.pem'),
      ),
      cert: fs.readFileSync(
        path.resolve(__dirname, 'certificates/localhost.pem'),
      ),
    },
  },
})

export default config
