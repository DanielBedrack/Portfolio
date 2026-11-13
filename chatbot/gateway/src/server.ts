import { createHash } from 'node:crypto'
import http, { type IncomingMessage, type ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import {
  GatewayValidationError,
  parseGatewayRequest,
  type GatewayChatResponse,
} from './contracts.js'
import {
  createN8nClient,
  type N8nClient,
  UpstreamInvalidResponseError,
  UpstreamUnavailableError,
} from './n8nClient.js'
import { createRateLimiter, normalizeClientAddress } from './rateLimit.js'

const MAX_BODY_BYTES = 32 * 1_024

export interface GatewayLogEntry {
  readonly event: 'request_complete'
  readonly status: number
  readonly duration: '<100ms' | '<1s' | '<10s' | '>=10s'
  readonly client: string
}

export interface GatewayServerOptions {
  readonly allowedOrigins: readonly string[]
  readonly trustProxy: boolean
  readonly n8nClient: N8nClient
  readonly logger?: (entry: GatewayLogEntry) => void
  readonly rateLimiter?: ReturnType<typeof createRateLimiter>
}

export interface GatewayConfig {
  readonly port: number
  readonly allowedOrigins: readonly string[]
  readonly trustProxy: boolean
  readonly chatUrl: URL
  readonly n8nHealthUrl: URL
  readonly ollamaHealthUrl: URL
  readonly requiredOllamaModel: string
  readonly timeoutMs: number
}

function setSecurityHeaders(response: ServerResponse): void {
  response.setHeader('x-content-type-options', 'nosniff')
  response.setHeader('x-frame-options', 'DENY')
  response.setHeader('referrer-policy', 'no-referrer')
  response.setHeader('cache-control', 'no-store')
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

function durationBucket(durationMs: number): GatewayLogEntry['duration'] {
  if (durationMs < 100) return '<100ms'
  if (durationMs < 1_000) return '<1s'
  if (durationMs < 10_000) return '<10s'
  return '>=10s'
}

function clientHash(clientKey: string): string {
  return createHash('sha256').update(clientKey).digest('hex').slice(0, 12)
}

function readBody(request: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let exceeded = false
    request.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        exceeded = true
        chunks.length = 0
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      if (exceeded) reject(new GatewayValidationError('message_too_long'))
      else resolve(Buffer.concat(chunks))
    })
    request.on('error', reject)
    request.on('aborted', () => reject(new UpstreamUnavailableError()))
  })
}

function parseJsonBody(bytes: Buffer): unknown {
  try {
    return JSON.parse(bytes.toString('utf8')) as unknown
  } catch {
    throw new GatewayValidationError('invalid_request')
  }
}

function statusForError(error: unknown): { status: number; code: string } {
  if (error instanceof GatewayValidationError) {
    return error.code === 'message_too_long'
      ? { status: 413, code: 'message_too_long' }
      : { status: 400, code: 'invalid_request' }
  }
  if (error instanceof UpstreamInvalidResponseError) {
    return { status: 502, code: 'upstream_invalid_response' }
  }
  return { status: 503, code: 'service_unavailable' }
}

export function createGatewayServer(options: GatewayServerOptions): http.Server {
  const origins = new Set(options.allowedOrigins)
  const limiter = options.rateLimiter ?? createRateLimiter()
  const logger = options.logger ?? ((entry: GatewayLogEntry) => console.info(JSON.stringify(entry)))

  return http.createServer(async (request, response) => {
    const startedAt = Date.now()
    setSecurityHeaders(response)
    const forwarded = Array.isArray(request.headers['x-forwarded-for'])
      ? request.headers['x-forwarded-for'][0]
      : request.headers['x-forwarded-for']
    const clientKey = normalizeClientAddress(request.socket.remoteAddress, forwarded, options.trustProxy)
    const finish = (status: number) => logger({
      event: 'request_complete',
      status,
      duration: durationBucket(Date.now() - startedAt),
      client: clientHash(clientKey),
    })

    const url = new URL(request.url ?? '/', 'http://gateway.invalid')
    const origin = request.headers.origin
    const isChatRoute = url.pathname === '/chat'
    if (origin && origins.has(origin)) {
      response.setHeader('access-control-allow-origin', origin)
      response.setHeader('vary', 'Origin')
    }

    if (url.pathname === '/health') {
      if (request.method === 'OPTIONS') {
        if (!origin || !origins.has(origin)) {
          json(response, 403, { error: 'origin_not_allowed' })
          finish(403)
          return
        }
        response.setHeader('access-control-allow-methods', 'GET, OPTIONS')
        response.setHeader('access-control-allow-headers', 'ngrok-skip-browser-warning')
        response.writeHead(204).end()
        finish(204)
        return
      }
      if (request.method !== 'GET') {
        json(response, 405, { error: 'method_not_allowed' })
        finish(405)
        return
      }
      const controller = new AbortController()
      request.once('aborted', () => controller.abort())
      response.once('close', () => {
        if (!response.writableEnded) controller.abort()
      })
      const healthy = await options.n8nClient.health(controller.signal)
      if (response.destroyed) return
      const status = healthy ? 200 : 503
      json(response, status, healthy ? { status: 'ok' } : { error: 'service_unavailable' })
      finish(status)
      return
    }

    if (!isChatRoute) {
      json(response, 404, { error: 'not_found' })
      finish(404)
      return
    }

    if (request.method !== 'POST' && request.method !== 'OPTIONS') {
      json(response, 405, { error: 'method_not_allowed' })
      finish(405)
      return
    }
    if (!origin || !origins.has(origin)) {
      json(response, 403, { error: 'origin_not_allowed' })
      finish(403)
      return
    }

    if (request.method === 'OPTIONS') {
      response.setHeader('access-control-allow-methods', 'POST, OPTIONS')
      response.setHeader('access-control-allow-headers', 'content-type, ngrok-skip-browser-warning')
      response.writeHead(204).end()
      finish(204)
      return
    }
    const mediaType = request.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase()
    if (mediaType !== 'application/json') {
      json(response, 415, { error: 'unsupported_media_type' })
      finish(415)
      return
    }

    try {
      const chatRequest = parseGatewayRequest(parseJsonBody(await readBody(request)))
      const decision = limiter.check(clientKey, chatRequest.requestType)
      if (!decision.allowed) {
        response.setHeader('retry-after', String(decision.retryAfterSeconds ?? 1))
        json(response, 429, { error: 'rate_limited' })
        finish(429)
        return
      }
      const controller = new AbortController()
      request.on('aborted', () => controller.abort())
      response.once('close', () => {
        if (!response.writableEnded) controller.abort()
      })
      const answer: GatewayChatResponse = await options.n8nClient.send(chatRequest, controller.signal)
      if (!response.writableEnded && !response.destroyed) {
        json(response, 200, answer)
        finish(200)
      }
    } catch (error) {
      if (response.writableEnded || response.destroyed) return
      const mapped = statusForError(error)
      json(response, mapped.status, { error: mapped.code })
      finish(mapped.status)
    }
  })
}

function requiredUrl(env: NodeJS.ProcessEnv, name: string): URL {
  const value = env[name]
  if (!value) throw new Error(`Missing ${name}.`)
  return new URL(value)
}

export function loadGatewayConfig(env: NodeJS.ProcessEnv): GatewayConfig {
  const port = Number(env.PORT ?? '8080')
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('Invalid PORT.')
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  if (allowedOrigins.length === 0) throw new Error('Missing ALLOWED_ORIGINS.')
  const requiredOllamaModel = env.OLLAMA_MODEL?.trim()
  if (!requiredOllamaModel) throw new Error('Missing OLLAMA_MODEL.')
  return {
    port,
    allowedOrigins,
    trustProxy: env.TRUST_PROXY === 'true',
    chatUrl: requiredUrl(env, 'N8N_CHAT_URL'),
    n8nHealthUrl: requiredUrl(env, 'N8N_HEALTH_URL'),
    ollamaHealthUrl: requiredUrl(env, 'OLLAMA_HEALTH_URL'),
    requiredOllamaModel,
    timeoutMs: 25_000,
  }
}

export async function startGateway(): Promise<http.Server> {
  const config = loadGatewayConfig(process.env)
  const n8nClient = createN8nClient(config)
  const server = createGatewayServer({
    allowedOrigins: config.allowedOrigins,
    trustProxy: config.trustProxy,
    n8nClient,
  })
  server.listen(config.port, '0.0.0.0')
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  return server
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void startGateway().catch(() => {
    process.exitCode = 1
  })
}
