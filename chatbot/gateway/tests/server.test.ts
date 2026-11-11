import assert from 'node:assert/strict'
import { once } from 'node:events'
import http from 'node:http'
import test from 'node:test'
import type { AddressInfo } from 'node:net'
import { createN8nClient } from '../src/n8nClient.js'
import { createGatewayServer } from '../src/server.js'

async function listen(server: http.Server): Promise<URL> {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address() as AddressInfo
  return new URL(`http://127.0.0.1:${address.port}`)
}

async function close(server: http.Server): Promise<void> {
  server.closeAllConnections()
  server.close()
  await once(server, 'close')
}

function jsonResponse(response: http.ServerResponse, value: unknown, status = 200) {
  response.writeHead(status, { 'content-type': 'application/json' })
  response.end(JSON.stringify(value))
}

async function withStack(
  handler: http.RequestListener,
  run: (baseUrl: URL, captured: string[]) => Promise<void>,
  options: { timeoutMs?: number } = {},
) {
  const captured: string[] = []
  const upstream = http.createServer(handler)
  const upstreamUrl = await listen(upstream)
  const client = createN8nClient({
    chatUrl: new URL('/chat-trigger', upstreamUrl),
    n8nHealthUrl: new URL('/healthz', upstreamUrl),
    ollamaHealthUrl: new URL('/api/tags', upstreamUrl),
    requiredOllamaModel: 'qwen3:4b-instruct',
    timeoutMs: options.timeoutMs ?? 250,
  })
  const gateway = createGatewayServer({
    allowedOrigins: ['https://danielbedrack.github.io'],
    trustProxy: false,
    n8nClient: client,
    logger: (entry) => captured.push(JSON.stringify(entry)),
  })
  const baseUrl = await listen(gateway)
  try {
    await run(baseUrl, captured)
  } finally {
    await close(gateway)
    await close(upstream)
  }
}

const requestBody = {
  message: 'Tell me about Daniel',
  sessionId: 'session-secret-123',
  language: 'en',
  requestType: 'chat',
}

test('exposes only health and chat with exact CORS and safe methods', async () => {
  await withStack((request, response) => {
    if (request.url === '/healthz') return jsonResponse(response, { status: 'ok' })
    if (request.url === '/api/tags') return jsonResponse(response, { models: [{ name: 'qwen3:4b-instruct' }] })
    if (request.url === '/chat-trigger') return jsonResponse(response, { output: 'Portfolio answer' })
    response.writeHead(404).end()
  }, async (baseUrl) => {
    const health = await fetch(new URL('/health', baseUrl))
    assert.equal(health.status, 200)

    const preflight = await fetch(new URL('/chat', baseUrl), {
      method: 'OPTIONS',
      headers: { origin: 'https://danielbedrack.github.io' },
    })
    assert.equal(preflight.status, 204)
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://danielbedrack.github.io')
    assert.equal(preflight.headers.get('vary'), 'Origin')
    assert.equal(
      preflight.headers.get('access-control-allow-headers'),
      'content-type, ngrok-skip-browser-warning',
    )

    const valid = await fetch(new URL('/chat', baseUrl), {
      method: 'POST',
      headers: { origin: 'https://danielbedrack.github.io', 'content-type': 'application/json' },
      body: JSON.stringify(requestBody),
    })
    assert.equal(valid.status, 200)
    assert.deepEqual(await valid.json(), { answer: 'Portfolio answer', language: 'en', source: 'ollama' })

    for (const origin of [
      'http://danielbedrack.github.io',
      'https://danielbedrack.github.io/path',
      'https://danielbedrack.github.io.attacker.test',
      'https://sub.danielbedrack.github.io',
    ]) {
      const rejected = await fetch(new URL('/chat', baseUrl), {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      assert.equal(rejected.status, 403)
      assert.equal(rejected.headers.get('access-control-allow-origin'), null)
    }

    const wrongType = await fetch(new URL('/chat', baseUrl), {
      method: 'POST',
      headers: { origin: 'https://danielbedrack.github.io', 'content-type': 'text/plain' },
      body: JSON.stringify(requestBody),
    })
    assert.equal(wrongType.status, 415)

    for (const path of ['/', '/rest', '/signin', '/webhook', '/anything']) {
      assert.equal((await fetch(new URL(path, baseUrl))).status, 404)
    }
    assert.equal((await fetch(new URL('/health', baseUrl), { method: 'POST' })).status, 405)
    assert.equal((await fetch(new URL('/chat', baseUrl), { method: 'GET' })).status, 405)
  })
})

test('posts only the approved n8n body and accepts a 6000-character Unicode job description', async () => {
  let seenUrl = ''
  let seenBody = ''
  await withStack((request, response) => {
    if (request.url === '/chat-trigger') {
      seenUrl = request.url
      request.setEncoding('utf8')
      request.on('data', (chunk) => { seenBody += chunk })
      request.on('end', () => jsonResponse(response, [{ output: 'מתאים' }]))
      return
    }
    response.writeHead(404).end()
  }, async (baseUrl) => {
    const result = await fetch(new URL('/chat', baseUrl), {
      method: 'POST',
      headers: { origin: 'https://danielbedrack.github.io', 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ...requestBody, message: 'א'.repeat(6_000), language: 'he', requestType: 'job_match' }),
    })
    assert.equal(result.status, 200)
    assert.equal(seenUrl, '/chat-trigger')
    assert.deepEqual(JSON.parse(seenBody), {
      action: 'sendMessage',
      sessionId: 'session-secret-123',
      chatInput: 'א'.repeat(6_000),
    })
  })
})

test('maps invalid, oversized, quota, timeout, and malformed upstream failures safely', async () => {
  let mode: 'malformed' | 'slow' = 'malformed'
  await withStack((request, response) => {
    if (request.url === '/chat-trigger') {
      if (mode === 'slow') return setTimeout(() => jsonResponse(response, { output: 'late secret' }), 100)
      return jsonResponse(response, { internal: 'secret upstream value' })
    }
    response.writeHead(503).end()
  }, async (baseUrl, captured) => {
    const send = (body: unknown) => fetch(new URL('/chat', baseUrl), {
      method: 'POST',
      headers: { origin: 'https://danielbedrack.github.io', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    assert.equal((await send({ ...requestBody, extra: 'invalid' })).status, 400)
    assert.equal((await send({ ...requestBody, message: 'x'.repeat(33_000) })).status, 413)
    const malformed = await send(requestBody)
    assert.equal(malformed.status, 502)
    assert.deepEqual(await malformed.json(), { error: 'upstream_invalid_response' })

    mode = 'slow'
    const timedOut = await send({ ...requestBody, sessionId: 'another-secret' })
    assert.equal(timedOut.status, 503)
    assert.deepEqual(await timedOut.json(), { error: 'service_unavailable' })

    for (let index = 0; index < 5; index += 1) {
      await send({ ...requestBody, sessionId: `rate-${index}` })
    }
    const limited = await send({ ...requestBody, sessionId: 'rate-final' })
    assert.equal(limited.status, 429)
    assert.ok(Number(limited.headers.get('retry-after')) >= 1)

    const publicAndLogs = `${await limited.text()}\n${captured.join('\n')}`
    assert.doesNotMatch(publicAndLogs, /Tell me|session-secret|another-secret|late secret|chat-trigger|127\.0\.0\.1/iu)
  }, { timeoutMs: 25 })
})

test('health requires both n8n and the configured Ollama model', async () => {
  let model = 'other:model'
  await withStack((request, response) => {
    if (request.url === '/healthz') return jsonResponse(response, { status: 'ok' })
    if (request.url === '/api/tags') return jsonResponse(response, { models: [{ name: model }] })
    response.writeHead(404).end()
  }, async (baseUrl) => {
    assert.equal((await fetch(new URL('/health', baseUrl))).status, 503)
    model = 'qwen3:4b-instruct'
    assert.equal((await fetch(new URL('/health', baseUrl))).status, 200)
  })
})

test('survives an aborted browser request and a late upstream response', async () => {
  await withStack((request, response) => {
    if (request.url === '/chat-trigger') {
      setTimeout(() => {
        if (!response.destroyed) jsonResponse(response, { output: 'late answer' })
      }, 80)
      return
    }
    if (request.url === '/healthz') return jsonResponse(response, { status: 'ok' })
    if (request.url === '/api/tags') return jsonResponse(response, { models: [{ name: 'qwen3:4b-instruct' }] })
    response.writeHead(404).end()
  }, async (baseUrl) => {
    const controller = new AbortController()
    const pending = fetch(new URL('/chat', baseUrl), {
      method: 'POST',
      headers: { origin: 'https://danielbedrack.github.io', 'content-type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })
    setTimeout(() => controller.abort(), 10)
    await assert.rejects(pending, /abort/iu)
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.equal((await fetch(new URL('/health', baseUrl))).status, 200)
  })
})
