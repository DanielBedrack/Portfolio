import { describe, expect, it, vi } from 'vitest'
import { createChatRouter } from '../chatbot/chatRouter'
import type { GatewayClient } from '../chatbot/gatewayClient'
import type { StaticChatAnswer } from '../chatbot/types'

const staticResult: StaticChatAnswer = {
  answer: 'Static answer',
  language: 'en',
  intent: 'unknown',
  suggestedQuestions: ['Question'],
}
const request = { message: 'Tell me about Daniel\'s experience', language: 'en' as const, requestType: 'chat' as const, sessionId: 's1' }

function gateway(healthy = true): GatewayClient & { health: ReturnType<typeof vi.fn>; chat: ReturnType<typeof vi.fn> } {
  return {
    health: vi.fn().mockResolvedValue(healthy),
    chat: vi.fn().mockResolvedValue({ answer: 'AI answer', language: 'en', source: 'ollama' }),
  }
}

describe('hybrid chat router', () => {
  it.each([
    ['Hello!', 'en'],
    ['היי', 'he'],
    ['הייי', 'he'],
    ['היוש', 'he'],
    ['Hello there!', 'en'],
    ['שלום.', 'he'],
  ] as const)('answers a simple greeting %s statically without probing the gateway', async (message, language) => {
    const ai = gateway()
    const staticAnswer = vi.fn().mockReturnValue({ ...staticResult, language, intent: 'greeting' })
    const router = createChatRouter({ gateway: ai, staticAnswer })

    await expect(router.answer({ ...request, message, language })).resolves.toMatchObject({
      language,
      intent: 'greeting',
      source: 'static',
    })
    expect(staticAnswer).toHaveBeenCalledTimes(1)
    expect(ai.health).not.toHaveBeenCalled()
    expect(ai.chat).not.toHaveBeenCalled()
  })

  it('keeps a substantive message that starts with a greeting on the AI route', async () => {
    const ai = gateway()
    const router = createChatRouter({ gateway: ai })

    await expect(router.answer({ ...request, message: 'Hi, tell me about Daniel\'s experience' }))
      .resolves.toMatchObject({ answer: 'AI answer', source: 'ollama' })
    expect(ai.health).toHaveBeenCalledTimes(1)
    expect(ai.chat).toHaveBeenCalledTimes(1)
  })

  it('clarifies an ambiguous follow-up after a greeting before calling AI', async () => {
    const router = createChatRouter({ gateway: gateway() })

    await expect(router.answer({
      ...request,
      message: 'ספר לי',
      language: 'he',
      context: { previousIntent: 'greeting' },
    })).resolves.toMatchObject({
      answer: 'בשמחה — על מה תרצה שאספר: הניסיון, הכישורים או הפרויקטים?',
      intent: 'greeting',
      source: 'static',
    })
  })

  it('preserves the detected visitor intent on a successful AI answer', async () => {
    const router = createChatRouter({ gateway: gateway() })

    await expect(router.answer({ ...request, message: 'Tell me about Daniel projects' }))
      .resolves.toMatchObject({ answer: 'AI answer', intent: 'projects', source: 'ollama' })
  })

  it('reuses one healthy probe for 60 seconds and returns local AI', async () => {
    let now = 1_000
    const ai = gateway()
    const router = createChatRouter({ gateway: ai, now: () => now, healthTtlMs: 60_000 })

    await expect(router.answer(request)).resolves.toMatchObject({ answer: 'AI answer', source: 'ollama' })
    now += 59_999
    await router.answer({ ...request, message: 'Again' })
    expect(ai.health).toHaveBeenCalledTimes(1)
    expect(ai.chat).toHaveBeenCalledTimes(2)
  })

  it('retries health on the next message after a transient unavailable result', async () => {
    const ai = gateway()
    ai.health.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const staticAnswer = vi.fn().mockReturnValue(staticResult)
    const router = createChatRouter({ gateway: ai, staticAnswer })

    await expect(router.answer(request)).resolves.toEqual({ ...staticResult, source: 'static' })
    await expect(router.answer({ ...request, message: 'Second question' }))
      .resolves.toMatchObject({ answer: 'AI answer', source: 'ollama' })
    expect(ai.health).toHaveBeenCalledTimes(2)
    expect(ai.chat).toHaveBeenCalledTimes(1)
  })

  it.each([429, 502, 503])('retries after a transient chat status %s instead of locking static mode', async (status) => {
    const ai = gateway()
    ai.chat.mockRejectedValueOnce(Object.assign(new Error('safe'), { status }))
    const staticAnswer = vi.fn().mockReturnValue(staticResult)
    const router = createChatRouter({ gateway: ai, staticAnswer, healthTtlMs: 60_000 })

    await expect(router.answer(request)).resolves.toEqual({ ...staticResult, source: 'static' })
    await expect(router.answer({ ...request, message: 'Second' })).resolves.toMatchObject({ source: 'ollama' })
    expect(ai.health).toHaveBeenCalledTimes(2)
    expect(ai.chat).toHaveBeenCalledTimes(2)
  })

  it('falls back on network, abort, and malformed-response errors and can be reset', async () => {
    const ai = gateway()
    ai.chat.mockRejectedValue(new DOMException('Aborted', 'AbortError'))
    const router = createChatRouter({ gateway: ai, staticAnswer: () => staticResult })
    await expect(router.answer(request)).resolves.toMatchObject({ source: 'static' })
    router.resetAvailability()
    ai.chat.mockResolvedValue({ answer: 'Recovered', language: 'en', source: 'ollama' })
    await expect(router.answer(request)).resolves.toMatchObject({ answer: 'Recovered', source: 'ollama' })
  })

  it('uses static mode immediately when no gateway is configured', async () => {
    const router = createChatRouter({ staticAnswer: () => staticResult })
    await expect(router.answer(request)).resolves.toEqual({ ...staticResult, source: 'static' })
  })
})
