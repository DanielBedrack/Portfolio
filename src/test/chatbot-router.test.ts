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
const request = { message: 'Hello', language: 'en' as const, requestType: 'chat' as const, sessionId: 's1' }

function gateway(healthy = true): GatewayClient & { health: ReturnType<typeof vi.fn>; chat: ReturnType<typeof vi.fn> } {
  return {
    health: vi.fn().mockResolvedValue(healthy),
    chat: vi.fn().mockResolvedValue({ answer: 'AI answer', language: 'en', source: 'ollama' }),
  }
}

describe('hybrid chat router', () => {
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

  it('uses static mode without sending chat when health is unavailable', async () => {
    const ai = gateway(false)
    const staticAnswer = vi.fn().mockReturnValue(staticResult)
    const router = createChatRouter({ gateway: ai, staticAnswer })

    await expect(router.answer(request)).resolves.toEqual({ ...staticResult, source: 'static' })
    expect(ai.chat).not.toHaveBeenCalled()
    expect(staticAnswer).toHaveBeenCalledTimes(1)
  })

  it.each([429, 502, 503])('falls back once after status %s and holds AI unhealthy until TTL', async (status) => {
    let now = 10_000
    const ai = gateway()
    ai.chat.mockRejectedValueOnce(Object.assign(new Error('safe'), { status }))
    const staticAnswer = vi.fn().mockReturnValue(staticResult)
    const router = createChatRouter({ gateway: ai, staticAnswer, now: () => now, healthTtlMs: 60_000 })

    await expect(router.answer(request)).resolves.toEqual({ ...staticResult, source: 'static' })
    await router.answer({ ...request, message: 'Second' })
    expect(ai.health).toHaveBeenCalledTimes(1)
    expect(ai.chat).toHaveBeenCalledTimes(1)
    expect(staticAnswer).toHaveBeenCalledTimes(2)

    now += 60_001
    await expect(router.answer({ ...request, message: 'Third' })).resolves.toMatchObject({ source: 'ollama' })
    expect(ai.health).toHaveBeenCalledTimes(2)
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
