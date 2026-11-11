import {
  GatewayValidationError,
  normalizeN8nResponse,
  type GatewayChatRequest,
  type GatewayChatResponse,
} from './contracts.js'

export class UpstreamUnavailableError extends Error {
  constructor() {
    super('Upstream service unavailable.')
    this.name = 'UpstreamUnavailableError'
  }
}

export class UpstreamInvalidResponseError extends Error {
  constructor() {
    super('Upstream response invalid.')
    this.name = 'UpstreamInvalidResponseError'
  }
}

export interface N8nClient {
  send(request: GatewayChatRequest, signal?: AbortSignal): Promise<GatewayChatResponse>
  health(signal?: AbortSignal): Promise<boolean>
}

export interface N8nClientOptions {
  readonly chatUrl: URL
  readonly n8nHealthUrl: URL
  readonly ollamaHealthUrl: URL
  readonly requiredOllamaModel: string
  readonly timeoutMs: number
  readonly fetchImpl?: typeof fetch
}

function boundedSignal(timeoutMs: number, callerSignal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs)
  return callerSignal ? AbortSignal.any([callerSignal, timeout]) : timeout
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new UpstreamInvalidResponseError()
  }
}

function hasRequiredModel(value: unknown, requiredModel: string): boolean {
  if (!value || typeof value !== 'object' || !('models' in value) || !Array.isArray(value.models)) {
    return false
  }
  return value.models.some((model) => {
    if (!model || typeof model !== 'object' || !('name' in model)) return false
    return model.name === requiredModel
  })
}

export function createN8nClient(options: N8nClientOptions): N8nClient {
  const fetchImpl = options.fetchImpl ?? fetch

  return {
    async send(request, signal) {
      let response: Response
      try {
        response = await fetchImpl(options.chatUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'sendMessage',
            sessionId: request.sessionId,
            chatInput: request.message,
          }),
          signal: boundedSignal(options.timeoutMs, signal),
        })
      } catch {
        throw new UpstreamUnavailableError()
      }
      if (!response.ok) throw new UpstreamUnavailableError()
      const value = await readJson(response)
      try {
        return normalizeN8nResponse(value, request.language)
      } catch (error) {
        if (error instanceof GatewayValidationError) throw new UpstreamInvalidResponseError()
        throw error
      }
    },

    async health(signal) {
      const probeSignal = boundedSignal(options.timeoutMs, signal)
      try {
        const [n8n, ollama] = await Promise.all([
          fetchImpl(options.n8nHealthUrl, { signal: probeSignal }),
          fetchImpl(options.ollamaHealthUrl, { signal: probeSignal }),
        ])
        if (!n8n.ok || !ollama.ok) return false
        return hasRequiredModel(await ollama.json(), options.requiredOllamaModel)
      } catch {
        return false
      }
    },
  }
}
