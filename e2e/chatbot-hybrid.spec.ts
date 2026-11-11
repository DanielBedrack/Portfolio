import { expect, test, type Page, type Route } from '@playwright/test'

const gatewayOrigin = 'https://gateway.test'
const siteOrigin = 'http://127.0.0.1:4173'

function corsHeaders() {
  return {
    'access-control-allow-origin': siteOrigin,
    'access-control-allow-headers': 'content-type, ngrok-skip-browser-warning',
    'access-control-allow-methods': 'POST, OPTIONS',
    'content-type': 'application/json',
  }
}

async function answerPreflight(route: Route): Promise<boolean> {
  if (route.request().method() !== 'OPTIONS') return false
  await route.fulfill({ status: 204, headers: corsHeaders() })
  return true
}

async function openAndAsk(page: Page, question: string): Promise<void> {
  await page.goto('./')
  await page.getByRole('button', { name: 'Open portfolio assistant' }).click()
  await page.getByLabel('Ask about Daniel').fill(question)
  await page.getByRole('button', { name: 'Send message' }).click()
}

test('shows a local AI answer from a healthy fake gateway', async ({ page }) => {
  await page.route(`${gatewayOrigin}/**`, async (route) => {
    if (await answerPreflight(route)) return
    const url = new URL(route.request().url())
    if (url.pathname === '/health') {
      await route.fulfill({ status: 200, headers: corsHeaders(), json: { status: 'ok' } })
      return
    }
    expect(route.request().headers()['ngrok-skip-browser-warning']).toBe('1')
    expect(route.request().postDataJSON()).toMatchObject({
      message: 'Who is Daniel?', language: 'en', requestType: 'chat',
    })
    await route.fulfill({
      status: 200,
      headers: corsHeaders(),
      json: { answer: 'Answer from local Ollama', language: 'en', source: 'ollama' },
    })
  })

  await openAndAsk(page, 'Who is Daniel?')
  await expect(page.getByText('Answer from local Ollama')).toBeVisible()
  await expect(page.getByText('Local AI')).toBeVisible()
})

for (const scenario of [
  { name: '429', status: 429 },
  { name: '502', status: 502 },
  { name: '503', status: 503 },
  { name: 'invalid JSON', status: 200, body: '{invalid' },
] as const) {
  test(`returns exactly one static answer after ${scenario.name}`, async ({ page }) => {
    await page.route(`${gatewayOrigin}/**`, async (route) => {
      if (await answerPreflight(route)) return
      const url = new URL(route.request().url())
      if (url.pathname === '/health') {
        await route.fulfill({ status: 200, headers: corsHeaders(), json: { status: 'ok' } })
        return
      }
      await route.fulfill({
        status: scenario.status,
        headers: corsHeaders(),
        body: scenario.body ?? JSON.stringify({ error: 'safe_failure' }),
      })
    })

    await openAndAsk(page, 'Who is Daniel?')
    const transcript = page.getByRole('log', { name: 'Chat messages' })
    await expect(transcript).toContainText('AI & Automation Developer')
    await expect(transcript.locator('div').filter({ hasText: 'AI & Automation Developer' })).toHaveCount(1)
    await expect(page.getByText('Portfolio information')).toBeVisible()
    await expect(page.getByText(/safe_failure|gateway|502|503|429/iu)).toHaveCount(0)
  })
}

test('falls back when health or chat exceeds its deadline', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeSetTimeout = window.setTimeout.bind(window)
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
      nativeSetTimeout(handler, timeout === 1_500 || timeout === 25_000 ? 20 : timeout, ...args)
    ) as typeof window.setTimeout
  })
  let phase: 'health' | 'chat' = 'health'
  await page.route(`${gatewayOrigin}/**`, async (route) => {
    if (await answerPreflight(route)) return
    const url = new URL(route.request().url())
    if (url.pathname === '/health') {
      if (phase === 'health') await new Promise((resolve) => setTimeout(resolve, 100))
      await route.fulfill({ status: 200, headers: corsHeaders(), json: { status: 'ok' } }).catch(() => undefined)
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
    await route.fulfill({
      status: 200,
      headers: corsHeaders(),
      json: { answer: 'Too late', language: 'en', source: 'ollama' },
    }).catch(() => undefined)
  })

  await openAndAsk(page, 'Who is Daniel?')
  await expect(page.getByRole('log', { name: 'Chat messages' })).toContainText('AI & Automation Developer')
  phase = 'chat'
  await page.reload()
  await page.getByRole('button', { name: 'Open portfolio assistant' }).click()
  await page.getByLabel('Ask about Daniel').fill('What is Daniel’s role?')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByRole('log', { name: 'Chat messages' })).toContainText('AI & Automation Developer')
  await expect(page.getByText('Too late')).toHaveCount(0)
})

test('reprobes after 60 seconds and recovers without losing the static transcript', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeNow = Date.now.bind(Date)
    let offset = 0
    Object.defineProperty(window, '__advancePortfolioTime', {
      value: (milliseconds: number) => { offset += milliseconds },
    })
    Date.now = () => nativeNow() + offset
  })
  let healthy = false
  await page.route(`${gatewayOrigin}/**`, async (route) => {
    if (await answerPreflight(route)) return
    const url = new URL(route.request().url())
    if (url.pathname === '/health') {
      await route.fulfill({
        status: healthy ? 200 : 503,
        headers: corsHeaders(),
        json: healthy ? { status: 'ok' } : { error: 'offline' },
      })
      return
    }
    await route.fulfill({
      status: 200,
      headers: corsHeaders(),
      json: { answer: 'Recovered local answer', language: 'en', source: 'ollama' },
    })
  })

  await openAndAsk(page, 'Who is Daniel?')
  await expect(page.getByRole('log', { name: 'Chat messages' })).toContainText('AI & Automation Developer')
  healthy = true
  await page.evaluate(() => {
    (window as unknown as { __advancePortfolioTime(milliseconds: number): void })
      .__advancePortfolioTime(60_001)
  })
  const input = page.getByLabel('Ask about Daniel')
  await input.fill('Who is Daniel now?')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('Recovered local answer')).toBeVisible()
  await expect(page.getByRole('log', { name: 'Chat messages' })).toContainText('AI & Automation Developer')
  await expect(page.getByText('Local AI')).toBeVisible()
})
