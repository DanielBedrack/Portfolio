import { isIP } from 'node:net'
import type { GatewayRequestType } from './contracts.js'

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

interface CounterWindow {
  startedAt: number
  count: number
}

interface ClientCounters {
  minute: CounterWindow
  day: CounterWindow
  jobDay: CounterWindow
}

export interface RateLimitDecision {
  readonly allowed: boolean
  readonly retryAfterSeconds?: number
  readonly reason?: 'minute' | 'day' | 'job_day'
}

function normalizeIp(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  const withoutPrefix = trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed
  return isIP(withoutPrefix) ? withoutPrefix.toLowerCase() : undefined
}

export function normalizeClientAddress(
  socketAddress: string | undefined,
  forwardedFor: string | undefined,
  trustProxy: boolean,
): string {
  if (trustProxy && forwardedFor) {
    for (const candidate of forwardedFor.split(',')) {
      const normalized = normalizeIp(candidate)
      if (normalized) return normalized
    }
  }
  return normalizeIp(socketAddress) ?? 'unknown'
}

function currentWindow(
  window: CounterWindow,
  duration: number,
  now: number,
): CounterWindow {
  return now - window.startedAt >= duration ? { startedAt: now, count: 0 } : window
}

function retryAfter(window: CounterWindow, duration: number, now: number): number {
  return Math.max(1, Math.ceil((window.startedAt + duration - now) / 1_000))
}

export function createRateLimiter(options: { now?: () => number } = {}) {
  const nowFn = options.now ?? Date.now
  const clients = new Map<string, ClientCounters>()

  return {
    check(clientKey: string, requestType: GatewayRequestType): RateLimitDecision {
      const now = nowFn()
      const existing = clients.get(clientKey) ?? {
        minute: { startedAt: now, count: 0 },
        day: { startedAt: now, count: 0 },
        jobDay: { startedAt: now, count: 0 },
      }
      const counters: ClientCounters = {
        minute: currentWindow(existing.minute, MINUTE_MS, now),
        day: currentWindow(existing.day, DAY_MS, now),
        jobDay: currentWindow(existing.jobDay, DAY_MS, now),
      }
      clients.set(clientKey, counters)

      if (counters.minute.count >= 5) {
        return {
          allowed: false,
          reason: 'minute',
          retryAfterSeconds: retryAfter(counters.minute, MINUTE_MS, now),
        }
      }
      if (counters.day.count >= 50) {
        return {
          allowed: false,
          reason: 'day',
          retryAfterSeconds: retryAfter(counters.day, DAY_MS, now),
        }
      }
      if (requestType === 'job_match' && counters.jobDay.count >= 5) {
        return {
          allowed: false,
          reason: 'job_day',
          retryAfterSeconds: retryAfter(counters.jobDay, DAY_MS, now),
        }
      }

      counters.minute.count += 1
      counters.day.count += 1
      if (requestType === 'job_match') counters.jobDay.count += 1
      return { allowed: true }
    },

    clear(): void {
      clients.clear()
    },
  }
}
