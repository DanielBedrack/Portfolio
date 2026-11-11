export type GatewayLanguage = 'he' | 'en'
export type GatewayRequestType = 'chat' | 'job_match'

export interface GatewayChatRequest {
  readonly message: string
  readonly sessionId: string
  readonly language: GatewayLanguage
  readonly requestType: GatewayRequestType
}

export interface GatewayChatResponse {
  readonly answer: string
  readonly language: GatewayLanguage
  readonly source: 'ollama'
}

export type GatewayValidationCode = 'invalid_request' | 'message_too_long'

export class GatewayValidationError extends Error {
  readonly code: GatewayValidationCode

  constructor(code: GatewayValidationCode) {
    super('Request validation failed.')
    this.name = 'GatewayValidationError'
    this.code = code
  }
}

const FIELD_NAMES = ['message', 'sessionId', 'language', 'requestType'] as const

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function parseGatewayRequest(value: unknown): GatewayChatRequest {
  if (!isPlainRecord(value)) throw new GatewayValidationError('invalid_request')
  const keys = Object.keys(value)
  if (keys.length !== FIELD_NAMES.length || keys.some((key) => !FIELD_NAMES.includes(key as never))) {
    throw new GatewayValidationError('invalid_request')
  }

  const { message, sessionId, language, requestType } = value
  if (
    typeof message !== 'string' ||
    typeof sessionId !== 'string' ||
    !sessionId.trim() ||
    (language !== 'he' && language !== 'en') ||
    (requestType !== 'chat' && requestType !== 'job_match')
  ) {
    throw new GatewayValidationError('invalid_request')
  }

  const sanitizedMessage = message.replace(/\p{C}/gu, '').trim()
  if (!sanitizedMessage) throw new GatewayValidationError('invalid_request')
  const limit = requestType === 'job_match' ? 6_000 : 2_000
  if (Array.from(sanitizedMessage).length > limit) {
    throw new GatewayValidationError('message_too_long')
  }

  return {
    message: sanitizedMessage,
    sessionId: sessionId.trim(),
    language,
    requestType,
  }
}

function readSingleOutput(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? (value.length === 1 ? value[0] : undefined) : value
  if (!isPlainRecord(candidate) || typeof candidate.output !== 'string') return undefined
  const output = candidate.output.trim()
  return output || undefined
}

export function normalizeN8nResponse(
  value: unknown,
  language: GatewayLanguage,
): GatewayChatResponse {
  const answer = readSingleOutput(value)
  if (!answer) throw new GatewayValidationError('invalid_request')
  return { answer, language, source: 'ollama' }
}
