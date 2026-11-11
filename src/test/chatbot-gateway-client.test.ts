import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGatewayClient, GatewayClientError } from '../chatbot/gatewayClient'
import {
  CHAT_TIMEOUT_MS,
  getPortfolioGatewayUrl,
  HEALTH_TIMEOUT_MS,
  HEALTH_TTL_MS,
} from '../chatbot/config'

afterEach(() => vi.useRealTimers())

describe('portfolio gateway client', () => {
  it('uses fixed timeouts and accepts only HTTPS or explicit local development URLs', () => {
    expect([HEALTH_TIMEOUT_MS, CHAT_TIMEOUT_MS, HEALTH_TTL_MS]).toEqual([1_500, 25_000, 60_000])
    expect(getPortfolioGatewayUrl('https://free-domain.ngrok.app/')?.href).toBe('https://free-domain.ngrok.app/')
    expect(getPortfolioGatewayUrl('http://localhost:8080/')?.href).toBe('http://localhost:8080/')
    expect(getPortfolioGatewayUrl('http://127.0.0.1:8080/')?.href).toBe('http://127.0.0.1:8080/')
    for (const value of [
      undefined,
      'http://public.example/',
      'https://gateway.example/path',
      'https://user:password@gateway.example/',
      'not a url',
    ]) expect(getPortfolioGatewayUrl(value)).toBeUndefined()
  })

  it('uses fixed health and chat routes with the public contract', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        answer: 'Local answer', language: 'en', source: 'ollama',
      }), { status: 200, headers: { 'content-type': 'application/json' } }))
    const client = createGatewayClient({ baseUrl: new URL('https://gateway.example/'), fetchImpl })

    await expect(client.health()).resolves.toBe(true)
    await expect(client.chat({
      message: 'Hello', language: 'en', requestType: 'chat', sessionId: 'session-1',
    })).resolves.toEqual({ answer: 'Local answer', language: 'en', source: 'ollama' })

    expect(fetchImpl.mock.calls[0]?.[0].toString()).toBe('https://gateway.example/health')
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe('GET')
    expect(fetchImpl.mock.calls[1]?.[0].toString()).toBe('https://gateway.example/chat')
    expect(fetchImpl.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    })
    expect(JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body))).toEqual({
      message: 'Hello', language: 'en', requestType: 'chat', sessionId: 'session-1',
    })
  })

  it('rejects non-2xx and malformed public responses without leaking content', async () => {
    for (const response of [
      new Response('private upstream detail', { status: 503 }),
      new Response('{bad json', { status: 200 }),
      new Response(JSON.stringify({ answer: 'secret', language: 'en', source: 'static' }), { status: 200 }),
    ]) {
      const client = createGatewayClient({
        baseUrl: new URL('https://gateway.example/'),
        fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response),
      })
      await expect(client.chat({ message: 'private input', sessionId: 'private-session' }))
        .rejects.toSatisfy((error: unknown) => {
          expect(error).toBeInstanceOf(GatewayClientError)
          expect(String(error)).not.toMatch(/private|secret|upstream/iu)
          return true
        })
    }
  })

  it('aborts health and chat at their configured deadlines', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn<typeof fetch>((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const client = createGatewayClient({
      baseUrl: new URL('https://gateway.example/'), fetchImpl, healthTimeoutMs: 1_500, chatTimeoutMs: 25_000,
    })

    const health = client.health()
    await vi.advanceTimersByTimeAsync(1_500)
    await expect(health).resolves.toBe(false)

    const chat = expect(client.chat({ message: 'hello', sessionId: 'session-1' }))
      .rejects.toBeInstanceOf(GatewayClientError)
    await vi.advanceTimersByTimeAsync(25_000)
    await chat
  })
})
