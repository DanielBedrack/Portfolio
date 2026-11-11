import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ChatSessionLimitError,
  appendChatMessage,
  clearChatSession,
  loadChatSession,
  saveChatSession,
  type ChatMessage,
} from '../chatbot/session'

const STORAGE_KEY = 'portfolio-chat.session.v1'

function visitorMessage(index: number): ChatMessage {
  return {
    id: `visitor-${index}`,
    role: 'visitor',
    text: `Question ${index}`,
    language: 'en',
    source: 'visitor',
    createdAt: '2026-11-11T12:00:00.000Z',
  }
}

describe('chat session persistence', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('keeps the same session ID and transcript in one tab', () => {
    const localSet = vi.spyOn(Storage.prototype, 'setItem')
    const initial = loadChatSession(sessionStorage)
    const updated = appendChatMessage(initial, visitorMessage(1))

    saveChatSession(updated, sessionStorage)
    const loaded = loadChatSession(sessionStorage)

    expect(loaded).toEqual(updated)
    expect(loaded.sessionId).toBe(initial.sessionId)
    expect(sessionStorage).toHaveLength(1)
    expect(sessionStorage.getItem(STORAGE_KEY)).toContain('Question 1')
    expect(localStorage).toHaveLength(0)
    expect(localSet.mock.calls.some(([key]) => key !== STORAGE_KEY)).toBe(false)
    localSet.mockRestore()
  })

  it('rejects the 21st visitor message without mutating the session', () => {
    let session = loadChatSession(sessionStorage)
    for (let index = 1; index <= 20; index += 1) {
      session = appendChatMessage(session, visitorMessage(index))
    }
    const snapshot = structuredClone(session)

    expect(() => appendChatMessage(session, visitorMessage(21))).toThrow(ChatSessionLimitError)
    expect(session).toEqual(snapshot)
    expect(session.visitorMessageCount).toBe(20)
  })

  it('does not count assistant messages toward the visitor limit', () => {
    let session = loadChatSession(sessionStorage)
    for (let index = 1; index <= 20; index += 1) {
      session = appendChatMessage(session, visitorMessage(index))
    }

    const withAssistant = appendChatMessage(session, {
      id: 'assistant-1',
      role: 'assistant',
      text: 'Approved answer',
      language: 'en',
      source: 'static',
      createdAt: '2026-11-11T12:01:00.000Z',
    })

    expect(withAssistant.visitorMessageCount).toBe(20)
    expect(withAssistant.messages).toHaveLength(21)
  })

  it('recovers from malformed or wrong-version storage', () => {
    sessionStorage.setItem(STORAGE_KEY, '{not-json')
    const malformed = loadChatSession(sessionStorage)
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, session: { sessionId: 'old', messages: [] } }),
    )
    const wrongVersion = loadChatSession(sessionStorage)

    expect(malformed.messages).toEqual([])
    expect(malformed.visitorMessageCount).toBe(0)
    expect(wrongVersion.messages).toEqual([])
    expect(wrongVersion.visitorMessageCount).toBe(0)
    expect(wrongVersion.sessionId).not.toBe('old')
  })

  it('keeps working when storage access is denied', () => {
    const deniedStorage = {
      get length(): number {
        throw new DOMException('denied')
      },
      clear() {
        throw new DOMException('denied')
      },
      getItem() {
        throw new DOMException('denied')
      },
      key() {
        throw new DOMException('denied')
      },
      removeItem() {
        throw new DOMException('denied')
      },
      setItem() {
        throw new DOMException('denied')
      },
    } satisfies Storage

    const session = loadChatSession(deniedStorage)
    const updated = appendChatMessage(session, visitorMessage(1))

    expect(() => saveChatSession(updated, deniedStorage)).not.toThrow()
    expect(() => clearChatSession(deniedStorage)).not.toThrow()
    expect(updated.messages).toHaveLength(1)
  })
})
