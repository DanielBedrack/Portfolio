import assert from 'node:assert/strict'
import test from 'node:test'
import { createRateLimiter, normalizeClientAddress } from '../src/rateLimit.js'

test('allows five requests per minute and rejects the sixth', () => {
  let now = 1_000
  const limiter = createRateLimiter({ now: () => now })
  for (let request = 1; request <= 5; request += 1) {
    assert.deepEqual(limiter.check('198.51.100.1', 'chat'), { allowed: true })
  }

  const denied = limiter.check('198.51.100.1', 'chat')
  assert.equal(denied.allowed, false)
  assert.equal(denied.reason, 'minute')
  assert.equal(denied.retryAfterSeconds, 60)

  now += 60_000
  assert.deepEqual(limiter.check('198.51.100.1', 'chat'), { allowed: true })
})

test('allows fifty requests per day and rejects the fifty-first', () => {
  let now = 0
  const limiter = createRateLimiter({ now: () => now })
  for (let request = 1; request <= 50; request += 1) {
    assert.equal(limiter.check('198.51.100.2', 'chat').allowed, true)
    if (request % 5 === 0) now += 60_000
  }

  const denied = limiter.check('198.51.100.2', 'chat')
  assert.equal(denied.allowed, false)
  assert.equal(denied.reason, 'day')

  now = 86_400_001
  assert.deepEqual(limiter.check('198.51.100.2', 'chat'), { allowed: true })
})

test('limits job matching separately without blocking normal chat', () => {
  let now = 0
  const limiter = createRateLimiter({ now: () => now })
  for (let request = 1; request <= 5; request += 1) {
    assert.equal(limiter.check('198.51.100.3', 'job_match').allowed, true)
    now += 60_000
  }

  const denied = limiter.check('198.51.100.3', 'job_match')
  assert.equal(denied.allowed, false)
  assert.equal(denied.reason, 'job_day')
  assert.deepEqual(limiter.check('198.51.100.3', 'chat'), { allowed: true })
})

test('normalizes socket and trusted proxy addresses safely', () => {
  assert.equal(normalizeClientAddress('::ffff:192.0.2.10', undefined, false), '192.0.2.10')
  assert.equal(normalizeClientAddress('2001:db8::1', undefined, false), '2001:db8::1')
  assert.equal(normalizeClientAddress(undefined, undefined, false), 'unknown')
  assert.equal(
    normalizeClientAddress('192.0.2.20', '203.0.113.9, 198.51.100.8', false),
    '192.0.2.20',
  )
  assert.equal(
    normalizeClientAddress('192.0.2.20', 'garbage, 203.0.113.9, 198.51.100.8', true),
    '203.0.113.9',
  )
})
