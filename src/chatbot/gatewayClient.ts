import { CHAT_TIMEOUT_MS, HEALTH_TIMEOUT_MS } from './config'
import { detectChatLanguage } from './language'
import type { ChatLanguage, ChatRequest, ChatRequestType } from './types'

export interface GatewayChatResponse {
  readonly answer: string
  readonly language: ChatLanguage
  readonly source: 'ollama'
}

export interface GatewayClient {
  health(): Promise<boolean>
  chat(request: ChatRequest & { sessionId: string }): Promise<GatewayChatResponse>
}

export class GatewayClientError extends Error {
  readonly status: number | undefined

  constructor(status?: number) {
    super('Gateway request failed.')
    this.name = 'GatewayClientError'
    this.status = status
  }
}

export interface GatewayClientOptions {
  readonly baseUrl: URL
  readonly fetchImpl?: typeof fetch
  readonly healthTimeoutMs?: number
  readonly chatTimeoutMs?: number
}

async function withTimeout<T>(timeoutMs: number, operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await operation(controller.signal)
  } finally {
    window.clearTimeout(timer)
  }
}

function isGatewayResponse(value: unknown): value is GatewayChatResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return Object.keys(record).length === 3 &&
    typeof record.answer === 'string' && Boolean(record.answer.trim()) &&
    (record.language === 'he' || record.language === 'en') &&
    record.source === 'ollama'
}

function requestType(request: ChatRequest): ChatRequestType {
  return request.requestType ?? 'chat'
}

export function createGatewayClient(options: GatewayClientOptions): GatewayClient {
  const fetchImpl = options.fetchImpl ?? fetch
  const healthUrl = new URL('/health', options.baseUrl)
  const chatUrl = new URL('/chat', options.baseUrl)

  return {
    async health() {
      try {
        return await withTimeout(options.healthTimeoutMs ?? HEALTH_TIMEOUT_MS, async (signal) => {
          const response = await fetchImpl(healthUrl, { method: 'GET', signal })
          if (!response.ok) return false
          const value = await response.json() as unknown
          return Boolean(value) && typeof value === 'object' &&
            (value as Record<string, unknown>).status === 'ok'
        })
      } catch {
        return false
      }
    },

    async chat(request) {
      try {
        return await withTimeout(options.chatTimeoutMs ?? CHAT_TIMEOUT_MS, async (signal) => {
          const response = await fetchImpl(chatUrl, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'ngrok-skip-browser-warning': '1',
            },
            body: JSON.stringify({
              message: request.message,
              sessionId: request.sessionId,
              language: request.language ?? detectChatLanguage(request.message),
              requestType: requestType(request),
            }),
            signal,
          })
          if (!response.ok) throw new GatewayClientError(response.status)
          let value: unknown
          try {
            value = await response.json()
          } catch {
            throw new GatewayClientError(response.status)
          }
          if (!isGatewayResponse(value)) throw new GatewayClientError(response.status)
          return value
        })
      } catch (error) {
        if (error instanceof GatewayClientError) throw error
        throw new GatewayClientError()
      }
    },
  }
}
