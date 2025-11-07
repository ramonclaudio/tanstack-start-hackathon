/**
 * TanStack Start Production Server with Bun
 *
 * A high-performance production server for TanStack Start applications that
 * implements intelligent static asset loading with configurable memory management.
 *
 * Features:
 * - Hybrid loading strategy (preload small files, serve large files on-demand)
 * - Configurable file filtering with include/exclude patterns
 * - Memory-efficient response generation
 * - Production-ready caching headers
 *
 * Environment Variables:
 *
 * PORT (number)
 *   - Server port number
 *   - Default: 3000
 *
 * SENTRY_DSN (string)
 *   - Sentry DSN for server-side error tracking
 *   - Required for production error monitoring
 *
 * ASSET_PRELOAD_MAX_SIZE (number)
 *   - Maximum file size in bytes to preload into memory
 *   - Files larger than this will be served on-demand from disk
 *   - Default: 5242880 (5MB)
 *   - Example: ASSET_PRELOAD_MAX_SIZE=5242880 (5MB)
 *
 * ASSET_PRELOAD_INCLUDE_PATTERNS (string)
 *   - Comma-separated list of glob patterns for files to include
 *   - If specified, only matching files are eligible for preloading
 *   - Patterns are matched against filenames only, not full paths
 *   - Example: ASSET_PRELOAD_INCLUDE_PATTERNS="*.js,*.css,*.woff2"
 *
 * ASSET_PRELOAD_EXCLUDE_PATTERNS (string)
 *   - Comma-separated list of glob patterns for files to exclude
 *   - Applied after include patterns
 *   - Patterns are matched against filenames only, not full paths
 *   - Example: ASSET_PRELOAD_EXCLUDE_PATTERNS="*.map,*.txt"
 *
 * ASSET_PRELOAD_VERBOSE_LOGGING (boolean)
 *   - Enable detailed logging of loaded and skipped files
 *   - Default: false
 *   - Set to "true" to enable verbose output
 *
 * ASSET_PRELOAD_ENABLE_ETAG (boolean)
 *   - Enable ETag generation for preloaded assets
 *   - Default: true
 *   - Set to "false" to disable ETag support
 *
 * ASSET_PRELOAD_ENABLE_GZIP (boolean)
 *   - Enable Gzip compression for eligible assets
 *   - Default: true
 *   - Set to "false" to disable Gzip compression
 *
 * ASSET_PRELOAD_GZIP_MIN_SIZE (number)
 *   - Minimum file size in bytes required for Gzip compression
 *   - Files smaller than this will not be compressed
 *   - Default: 1024 (1KB)
 *
 * ASSET_PRELOAD_GZIP_MIME_TYPES (string)
 *   - Comma-separated list of MIME types eligible for Gzip compression
 *   - Supports partial matching for types ending with "/"
 *   - Default: text/,application/javascript,application/json,application/xml,image/svg+xml
 *
 * Usage:
 *   bun run server.ts
 */

import path from 'node:path'
import * as Sentry from '@sentry/bun'
import { validateServerEnv } from './src/lib/env'
import {
  applySecurityHeaders,
  getCorsHeaders,
} from './src/lib/security-headers'
import { addRateLimitHeaders, applyRateLimit } from './src/lib/rate-limit'
import {
  addRequestIdToResponse,
  getOrGenerateRequestId,
  getRequestContext,
  trackRequestDuration,
} from './src/lib/request-id'
import { createLogger } from './src/lib/logger'

const serverLogger = createLogger('Server')

// Validate environment variables on startup
const env = validateServerEnv()
serverLogger.info('Server environment validated', {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
})

// Initialize Sentry for server-side error tracking
// Must be initialized before importing any other modules
if (env.SENTRY_DSN) {
  serverLogger.info('Initializing Sentry for server-side error tracking', {
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  })
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Disable PII for privacy compliance
    sendDefaultPii: false,
  })
}

// Configuration
const SERVER_PORT = Number(env.PORT)
const CLIENT_DIRECTORY = './dist/client'
const SERVER_ENTRY_POINT = './dist/server/server.js'

// Preloading configuration from environment variables
const MAX_PRELOAD_BYTES = env.ASSET_PRELOAD_MAX_SIZE
  ? Number(env.ASSET_PRELOAD_MAX_SIZE)
  : 5 * 1024 * 1024 // 5MB default only if not specified

// Parse comma-separated include patterns
const INCLUDE_PATTERNS = env.ASSET_PRELOAD_INCLUDE_PATTERNS
  ? env.ASSET_PRELOAD_INCLUDE_PATTERNS.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((pattern: string) => convertGlobToRegExp(pattern))
  : []

// Parse comma-separated exclude patterns
const EXCLUDE_PATTERNS = env.ASSET_PRELOAD_EXCLUDE_PATTERNS
  ? env.ASSET_PRELOAD_EXCLUDE_PATTERNS.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((pattern: string) => convertGlobToRegExp(pattern))
  : []

// Feature flags - explicit true/false
const VERBOSE = env.ASSET_PRELOAD_VERBOSE_LOGGING === 'true'
const ENABLE_ETAG = env.ASSET_PRELOAD_ENABLE_ETAG !== 'false' // Default true
const ENABLE_GZIP = env.ASSET_PRELOAD_ENABLE_GZIP !== 'false' // Default true
const GZIP_MIN_BYTES = env.ASSET_PRELOAD_GZIP_MIN_SIZE
  ? Number(env.ASSET_PRELOAD_GZIP_MIN_SIZE)
  : 1024 // 1KB
const GZIP_TYPES = (
  env.ASSET_PRELOAD_GZIP_MIME_TYPES ||
  'text/,application/javascript,application/json,application/xml,image/svg+xml'
)
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean)

/**
 * Convert a simple glob pattern to a regular expression
 * Supports * wildcard for matching any characters
 */
function convertGlobToRegExp(globPattern: string): RegExp {
  // Escape regex special chars except *, then replace * with .*
  const escapedPattern = globPattern
    .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
    .replace(/\*/g, '.*')
  return new RegExp(`^${escapedPattern}$`, 'i')
}

/**
 * Compute ETag for a given data buffer
 */
function computeEtag(data: Uint8Array): string {
  const hash = Bun.hash(data)
  return `W/"${hash.toString(16)}-${data.byteLength.toString()}"`
}

/**
 * Metadata for preloaded static assets
 */
interface AssetMetadata {
  route: string
  size: number
  type: string
}

/**
 * In-memory asset with ETag and Gzip support
 */
interface InMemoryAsset {
  raw: Uint8Array
  gz?: Uint8Array
  etag?: string
  type: string
  immutable: boolean
  size: number
}

/**
 * Result of static asset preloading process
 */
interface PreloadResult {
  routes: Record<string, (req: Request) => Response | Promise<Response>>
  loaded: Array<AssetMetadata>
  skipped: Array<AssetMetadata>
}

/**
 * Check if a file is eligible for preloading based on configured patterns
 */
function isFileEligibleForPreloading(relativePath: string): boolean {
  const fileName = relativePath.split(/[/\\]/).pop() || relativePath

  // If include patterns are specified, file must match at least one
  if (INCLUDE_PATTERNS.length > 0) {
    if (!INCLUDE_PATTERNS.some((pattern) => pattern.test(fileName))) {
      return false
    }
  }

  // If exclude patterns are specified, file must not match any
  if (EXCLUDE_PATTERNS.some((pattern) => pattern.test(fileName))) {
    return false
  }

  return true
}

/**
 * Check if a MIME type is compressible
 */
function isMimeTypeCompressible(mimeType: string): boolean {
  return GZIP_TYPES.some((type) =>
    type.endsWith('/') ? mimeType.startsWith(type) : mimeType === type,
  )
}

/**
 * Conditionally compress data based on size and MIME type
 */
function compressDataIfAppropriate(
  data: Uint8Array,
  mimeType: string,
): Uint8Array | undefined {
  if (!ENABLE_GZIP) return undefined
  if (data.byteLength < GZIP_MIN_BYTES) return undefined
  if (!isMimeTypeCompressible(mimeType)) return undefined
  try {
    return Bun.gzipSync(data.buffer as ArrayBuffer)
  } catch {
    return undefined
  }
}

/**
 * Create response handler function with ETag and Gzip support
 */
function createResponseHandler(
  asset: InMemoryAsset,
): (req: Request) => Response {
  return (req: Request) => {
    const headers: Record<string, string> = {
      'Content-Type': asset.type,
      'Cache-Control': asset.immutable
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=3600',
      // Add basic security headers for static assets
      'X-Content-Type-Options': 'nosniff',
    }

    if (ENABLE_ETAG && asset.etag) {
      const ifNone = req.headers.get('if-none-match')
      if (ifNone && ifNone === asset.etag) {
        return new Response(null, {
          status: 304,
          headers: { ETag: asset.etag },
        })
      }
      headers.ETag = asset.etag
    }

    if (
      ENABLE_GZIP &&
      asset.gz &&
      req.headers.get('accept-encoding')?.includes('gzip')
    ) {
      headers['Content-Encoding'] = 'gzip'
      headers['Content-Length'] = String(asset.gz.byteLength)
      const gzCopy = new Uint8Array(asset.gz)
      return new Response(gzCopy, { status: 200, headers })
    }

    headers['Content-Length'] = String(asset.raw.byteLength)
    const rawCopy = new Uint8Array(asset.raw)
    return new Response(rawCopy, { status: 200, headers })
  }
}

/**
 * Create composite glob pattern from include patterns
 */
function createCompositeGlobPattern(): Bun.Glob {
  const raw = (env.ASSET_PRELOAD_INCLUDE_PATTERNS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (raw.length === 0) return new Bun.Glob('**/*')
  if (raw.length === 1) return new Bun.Glob(raw[0])
  return new Bun.Glob(`{${raw.join(',')}}`)
}

/**
 * Initialize static routes with intelligent preloading strategy
 * Small files are loaded into memory, large files are served on-demand
 */
async function initializeStaticRoutes(
  clientDirectory: string,
): Promise<PreloadResult> {
  const routes: Record<string, (req: Request) => Response | Promise<Response>> =
    {}
  const loaded: Array<AssetMetadata> = []
  const skipped: Array<AssetMetadata> = []

  serverLogger.info(`Loading static assets from ${clientDirectory}...`)
  if (VERBOSE) {
    console.log(
      `Max preload size: ${(MAX_PRELOAD_BYTES / 1024 / 1024).toFixed(2)} MB`,
    )
    if (INCLUDE_PATTERNS.length > 0) {
      console.log(
        `Include patterns: ${env.ASSET_PRELOAD_INCLUDE_PATTERNS || ''}`,
      )
    }
    if (EXCLUDE_PATTERNS.length > 0) {
      console.log(
        `Exclude patterns: ${env.ASSET_PRELOAD_EXCLUDE_PATTERNS || ''}`,
      )
    }
  }

  let totalPreloadedBytes = 0

  try {
    const glob = createCompositeGlobPattern()
    for await (const relativePath of glob.scan({ cwd: clientDirectory })) {
      const filepath = path.join(clientDirectory, relativePath)
      const route = `/${relativePath.split(path.sep).join(path.posix.sep)}`

      try {
        // Get file metadata
        const file = Bun.file(filepath)

        // Skip if file doesn't exist or is empty
        if (!(await file.exists()) || file.size === 0) {
          continue
        }

        const metadata: AssetMetadata = {
          route,
          size: file.size,
          type: file.type || 'application/octet-stream',
        }

        // Determine if file should be preloaded
        const matchesPattern = isFileEligibleForPreloading(relativePath)
        const withinSizeLimit = file.size <= MAX_PRELOAD_BYTES

        if (matchesPattern && withinSizeLimit) {
          // Preload small files into memory with ETag and Gzip support
          const bytes = new Uint8Array(await file.arrayBuffer())
          const gz = compressDataIfAppropriate(bytes, metadata.type)
          const etag = ENABLE_ETAG ? computeEtag(bytes) : undefined
          const asset: InMemoryAsset = {
            raw: bytes,
            gz,
            etag,
            type: metadata.type,
            immutable: true,
            size: bytes.byteLength,
          }
          routes[route] = createResponseHandler(asset)

          loaded.push({ ...metadata, size: bytes.byteLength })
          totalPreloadedBytes += bytes.byteLength
        } else {
          // Serve large or filtered files on-demand
          routes[route] = () => {
            const fileOnDemand = Bun.file(filepath)
            return new Response(fileOnDemand, {
              headers: {
                'Content-Type': metadata.type,
                'Cache-Control': 'public, max-age=3600',
              },
            })
          }

          skipped.push(metadata)
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'EISDIR') {
          serverLogger.error(`Failed to load ${filepath}: ${error.message}`)
        }
      }
    }

    // Show detailed file overview only when verbose mode is enabled
    if (VERBOSE && (loaded.length > 0 || skipped.length > 0)) {
      const allFiles = [...loaded, ...skipped].sort((a, b) =>
        a.route.localeCompare(b.route),
      )

      // Calculate max path length for alignment
      const maxPathLength = Math.min(
        Math.max(...allFiles.map((f) => f.route.length)),
        60,
      )

      // Format file size with KB and actual gzip size
      const formatFileSize = (bytes: number, gzBytes?: number) => {
        const kb = bytes / 1024
        const sizeStr = kb < 100 ? kb.toFixed(2) : kb.toFixed(1)

        if (gzBytes !== undefined) {
          const gzKb = gzBytes / 1024
          const gzStr = gzKb < 100 ? gzKb.toFixed(2) : gzKb.toFixed(1)
          return {
            size: sizeStr,
            gzip: gzStr,
          }
        }

        // Rough gzip estimation (typically 30-70% compression) if no actual gzip data
        const gzipKb = kb * 0.35
        return {
          size: sizeStr,
          gzip: gzipKb < 100 ? gzipKb.toFixed(2) : gzipKb.toFixed(1),
        }
      }

      if (loaded.length > 0) {
        console.log('\n📁 Preloaded into memory:')
        console.log(
          'Path                                          │    Size │ Gzip Size',
        )
        loaded
          .sort((a, b) => a.route.localeCompare(b.route))
          .forEach((file) => {
            const { size, gzip } = formatFileSize(file.size)
            const paddedPath = file.route.padEnd(maxPathLength)
            const sizeStr = `${size.padStart(7)} kB`
            const gzipStr = `${gzip.padStart(7)} kB`
            console.log(`${paddedPath} │ ${sizeStr} │  ${gzipStr}`)
          })
      }

      if (skipped.length > 0) {
        console.log('\n💾 Served on-demand:')
        console.log(
          'Path                                          │    Size │ Gzip Size',
        )
        skipped
          .sort((a, b) => a.route.localeCompare(b.route))
          .forEach((file) => {
            const { size, gzip } = formatFileSize(file.size)
            const paddedPath = file.route.padEnd(maxPathLength)
            const sizeStr = `${size.padStart(7)} kB`
            const gzipStr = `${gzip.padStart(7)} kB`
            console.log(`${paddedPath} │ ${sizeStr} │  ${gzipStr}`)
          })
      }
    }

    // Show detailed verbose info if enabled
    if (VERBOSE) {
      if (loaded.length > 0 || skipped.length > 0) {
        const allFiles = [...loaded, ...skipped].sort((a, b) =>
          a.route.localeCompare(b.route),
        )
        console.log('\n📊 Detailed file information:')
        console.log(
          'Status       │ Path                            │ MIME Type                    │ Reason',
        )
        allFiles.forEach((file) => {
          const isPreloaded = loaded.includes(file)
          const status = isPreloaded ? 'MEMORY' : 'ON-DEMAND'
          const reason =
            !isPreloaded && file.size > MAX_PRELOAD_BYTES
              ? 'too large'
              : !isPreloaded
                ? 'filtered'
                : 'preloaded'
          const route =
            file.route.length > 30
              ? file.route.substring(0, 27) + '...'
              : file.route
          console.log(
            `${status.padEnd(12)} │ ${route.padEnd(30)} │ ${file.type.padEnd(28)} │ ${reason.padEnd(10)}`,
          )
        })
      } else {
        console.log('\n📊 No files found to display')
      }
    }

    // Log summary after the file list
    console.log() // Empty line for separation
    if (loaded.length > 0) {
      serverLogger.info(
        `Preloaded ${String(loaded.length)} files (${(totalPreloadedBytes / 1024 / 1024).toFixed(2)} MB) into memory`,
        { type: 'success' },
      )
    } else {
      serverLogger.info('No files preloaded into memory')
    }

    if (skipped.length > 0) {
      const tooLarge = skipped.filter((f) => f.size > MAX_PRELOAD_BYTES).length
      const filtered = skipped.length - tooLarge
      serverLogger.info(
        `${String(skipped.length)} files will be served on-demand (${String(tooLarge)} too large, ${String(filtered)} filtered)`,
      )
    }
  } catch (error) {
    serverLogger.error(
      `Failed to load static files from ${clientDirectory}: ${String(error)}`,
    )
  }

  return { routes, loaded, skipped }
}

/**
 * Initialize the server
 */
async function initializeServer() {
  serverLogger.info('Starting Production Server', { type: 'header' })

  // Load TanStack Start server handler
  let handler: { fetch: (request: Request) => Response | Promise<Response> }
  try {
    const serverModule = (await import(SERVER_ENTRY_POINT)) as {
      default: { fetch: (request: Request) => Response | Promise<Response> }
    }
    handler = serverModule.default
    serverLogger.info('TanStack Start application handler initialized', {
      type: 'success',
    })
  } catch (error) {
    serverLogger.error(`Failed to load server handler: ${String(error)}`)
    process.exit(1)
  }

  // Build static routes with intelligent preloading
  const { routes } = await initializeStaticRoutes(CLIENT_DIRECTORY)

  // Create Bun server
  const server = Bun.serve({
    port: SERVER_PORT,

    routes: {
      // Serve static assets (preloaded or on-demand)
      ...routes,

      // Fallback to TanStack Start handler for all other routes
      '/*': async (req: Request) => {
        // Generate or extract request ID
        const requestId = getOrGenerateRequestId(req.headers)
        const context = getRequestContext(req, requestId)

        // Log incoming request
        serverLogger.info(`${req.method} ${context.url}`, {
          requestId,
          method: req.method,
          path: context.url,
          userAgent: context.userAgent,
          ip: context.ip,
        })

        const trackDuration = trackRequestDuration(context)

        try {
          const url = new URL(req.url)
          const origin = req.headers.get('origin')

          // Handle CORS preflight requests
          if (req.method === 'OPTIONS') {
            const corsHeaders = getCorsHeaders(
              origin,
              env.NODE_ENV === 'development',
            )
            const response = new Response(null, {
              status: 204,
              headers: corsHeaders,
            })
            return addRequestIdToResponse(response, requestId)
          }

          // Determine rate limit type based on path
          let limiterType: 'auth' | 'api' | 'general' = 'general'

          if (url.pathname.startsWith('/api/auth')) {
            limiterType = 'auth'
          } else if (url.pathname.startsWith('/api')) {
            limiterType = 'api'
          }

          // Apply rate limiting
          const rateLimitResponse = applyRateLimit(req, limiterType)
          if (rateLimitResponse) {
            trackDuration()
            return addRequestIdToResponse(
              applySecurityHeaders(
                rateLimitResponse,
                env.NODE_ENV === 'development',
              ),
              requestId,
            )
          }

          // Process request
          let response = await handler.fetch(req)

          // Add rate limit headers to successful responses
          response = addRateLimitHeaders(response, req, limiterType)

          // Add CORS headers for API routes
          if (url.pathname.startsWith('/api')) {
            const corsHeaders = getCorsHeaders(
              origin,
              env.NODE_ENV === 'development',
            )
            const newHeaders = new Headers(response.headers)
            Object.entries(corsHeaders).forEach(([key, value]) => {
              newHeaders.set(key, value)
            })
            response = new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers: newHeaders,
            })
          }

          // Track successful request
          const duration = trackDuration()

          // Log response
          serverLogger.perf(
            `${req.method} ${context.url} - ${response.status}`,
            duration,
            {
              requestId,
              status: response.status,
              method: req.method,
              path: context.url,
            },
          )

          // Add request ID and apply security headers
          response = addRequestIdToResponse(response, requestId)
          return applySecurityHeaders(response, env.NODE_ENV === 'development')
        } catch (error) {
          serverLogger.error(
            `[${requestId}] Server handler error: ${String(error)}`,
          )
          trackDuration()

          // Report to Sentry with request context
          Sentry.withScope((scope) => {
            scope.setContext('request', {
              requestId: context.requestId,
              method: context.method,
              url: context.url,
              timestamp: context.timestamp,
              userAgent: context.userAgent,
              ip: context.ip,
            })
            scope.setTag('request.id', requestId)
            Sentry.captureException(error)
          })

          const errorResponse = new Response('Internal Server Error', {
            status: 500,
          })
          return addRequestIdToResponse(
            applySecurityHeaders(errorResponse, env.NODE_ENV === 'development'),
            requestId,
          )
        }
      },
    },

    // Global error handler
    error(error) {
      serverLogger.error(
        `Uncaught server error: ${error instanceof Error ? error.message : String(error)}`,
      )
      // Report error to Sentry
      Sentry.captureException(error)
      return new Response('Internal Server Error', { status: 500 })
    },
  })

  serverLogger.info(
    `Server listening on http://localhost:${String(server.port)}`,
    { type: 'success' },
  )
}

// Initialize the server
initializeServer().catch((error: unknown) => {
  serverLogger.error(`Failed to start server: ${String(error)}`)
  process.exit(1)
})
