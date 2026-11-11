import type { ChatLanguage } from './types'

const STORAGE_KEY = 'portfolio-chat.session.v1'
const STORAGE_VERSION = 1
const MAX_VISITOR_MESSAGES = 20

export interface ChatMessage {
  readonly id: string
  readonly role: 'visitor' | 'assistant'
  readonly text: string
  readonly language: ChatLanguage
  readonly source: 'visitor' | 'static' | 'ollama'
  readonly projectSlug?: string
  readonly createdAt: string
}

export interface ChatSession {
  readonly sessionId: string
  readonly messages: readonly ChatMessage[]
  readonly visitorMessageCount: number
}

export class ChatSessionLimitError extends Error {
  constructor() {
    super(`A chat session accepts at most ${MAX_VISITOR_MESSAGES} visitor messages.`)
    this.name = 'ChatSessionLimitError'
  }
}

function defaultStorage(): Storage | undefined {
  try {
    return globalThis.sessionStorage
  } catch {
    return undefined
  }
}

export function createSessionId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()

  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function emptySession(): ChatSession {
  return {
    sessionId: createSessionId(),
    messages: [],
    visitorMessageCount: 0,
  }
}

function isMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false
  const message = value as Record<string, unknown>
  const roleIsValid = message.role === 'visitor' || message.role === 'assistant'
  const sourceIsValid =
    message.source === 'visitor' || message.source === 'static' || message.source === 'ollama'
  const roleMatchesSource =
    (message.role === 'visitor' && message.source === 'visitor') ||
    (message.role === 'assistant' && (message.source === 'static' || message.source === 'ollama'))

  return (
    typeof message.id === 'string' &&
    message.id.length > 0 &&
    roleIsValid &&
    typeof message.text === 'string' &&
    (message.language === 'he' || message.language === 'en') &&
    sourceIsValid &&
    roleMatchesSource &&
    typeof message.createdAt === 'string' &&
    message.createdAt.length > 0 &&
    (message.projectSlug === undefined ||
      (typeof message.projectSlug === 'string' && message.projectSlug.length > 0))
  )
}

function parseStoredSession(value: string): ChatSession | undefined {
  try {
    const envelope = JSON.parse(value) as unknown
    if (!envelope || typeof envelope !== 'object') return undefined
    const record = envelope as Record<string, unknown>
    if (record.version !== STORAGE_VERSION || !record.session || typeof record.session !== 'object') {
      return undefined
    }

    const session = record.session as Record<string, unknown>
    if (typeof session.sessionId !== 'string' || !session.sessionId || !Array.isArray(session.messages)) {
      return undefined
    }
    if (!session.messages.every(isMessage)) return undefined

    const visitorMessageCount = session.messages.filter(({ role }) => role === 'visitor').length
    if (visitorMessageCount > MAX_VISITOR_MESSAGES) return undefined

    return {
      sessionId: session.sessionId,
      messages: session.messages,
      visitorMessageCount,
    }
  } catch {
    return undefined
  }
}

export function loadChatSession(storage: Storage | undefined = defaultStorage()): ChatSession {
  try {
    const stored = storage?.getItem(STORAGE_KEY)
    return stored ? (parseStoredSession(stored) ?? emptySession()) : emptySession()
  } catch {
    return emptySession()
  }
}

export function saveChatSession(
  session: ChatSession,
  storage: Storage | undefined = defaultStorage(),
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, session }))
  } catch {
    // Browsers may deny storage access. The caller retains the in-memory session.
  }
}

export function appendChatMessage(session: ChatSession, message: ChatMessage): ChatSession {
  if (message.role === 'visitor' && session.visitorMessageCount >= MAX_VISITOR_MESSAGES) {
    throw new ChatSessionLimitError()
  }

  return {
    ...session,
    messages: [...session.messages, message],
    visitorMessageCount:
      session.visitorMessageCount + (message.role === 'visitor' ? 1 : 0),
  }
}

export function clearChatSession(storage: Storage | undefined = defaultStorage()): ChatSession {
  try {
    storage?.removeItem(STORAGE_KEY)
  } catch {
    // Clearing an in-memory session must still work when storage is unavailable.
  }
  return emptySession()
}
