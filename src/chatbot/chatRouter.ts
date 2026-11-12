import { HEALTH_TTL_MS } from './config'
import type { GatewayClient } from './gatewayClient'
import { replyCopy } from './replies'
import { answerStaticChat, detectIntent, isSimpleGreeting, shouldClarifyTopic } from './staticEngine'
import type { ChatRequest, StaticChatAnswer } from './types'

export type RoutedChatAnswer = StaticChatAnswer & { readonly source: 'static' | 'ollama' }

export interface ChatRouter {
  answer(request: ChatRequest & { sessionId: string }): Promise<RoutedChatAnswer>
  resetAvailability(): void
}

export interface ChatRouterOptions {
  readonly gateway?: GatewayClient
  readonly now?: () => number
  readonly staticAnswer?: typeof answerStaticChat
  readonly healthTtlMs?: number
}

function withoutSession(request: ChatRequest & { sessionId: string }): ChatRequest {
  return {
    message: request.message,
    ...(request.language ? { language: request.language } : {}),
    ...(request.requestType ? { requestType: request.requestType } : {}),
    ...(request.context ? { context: request.context } : {}),
  }
}

export function createChatRouter(options: ChatRouterOptions): ChatRouter {
  const now = options.now ?? Date.now
  const staticAnswer = options.staticAnswer ?? answerStaticChat
  const healthTtlMs = options.healthTtlMs ?? HEALTH_TTL_MS
  let availability: { healthy: boolean; checkedAt: number } | undefined
  let healthInFlight: Promise<boolean> | undefined

  async function isHealthy(): Promise<boolean> {
    if (!options.gateway) return false
    const current = now()
    if (availability && current - availability.checkedAt < healthTtlMs) return availability.healthy
    healthInFlight ??= options.gateway.health()
      .then((healthy) => {
        availability = healthy ? { healthy: true, checkedAt: now() } : undefined
        return healthy
      })
      .catch(() => {
        availability = undefined
        return false
      })
      .finally(() => { healthInFlight = undefined })
    return healthInFlight
  }

  function staticResult(request: ChatRequest): RoutedChatAnswer {
    return { ...staticAnswer(request), source: 'static' }
  }

  return {
    async answer(request) {
      const staticRequest = withoutSession(request)
      if (
        (request.requestType ?? 'chat') === 'chat' &&
        (isSimpleGreeting(request.message) || shouldClarifyTopic(staticRequest))
      ) {
        return staticResult(staticRequest)
      }
      if (!await isHealthy()) return staticResult(staticRequest)
      try {
        const result = await options.gateway!.chat(request)
        return {
          answer: result.answer,
          language: result.language,
          intent: detectIntent(request.message),
          suggestedQuestions: replyCopy[result.language].suggestedQuestions,
          source: 'ollama',
        }
      } catch {
        availability = undefined
        return staticResult(staticRequest)
      }
    },

    resetAvailability() {
      availability = undefined
      healthInFlight = undefined
    },
  }
}
