import { expect, test } from '@playwright/test'

const launcherName = 'Open portfolio assistant'

test('supports keyboard chat, bilingual answers, fallback, and direct email', async ({ page }) => {
  const requestedOrigins = new Set<string>()
  page.on('request', (request) => requestedOrigins.add(new URL(request.url()).origin))
  await page.goto('./')

  await page.getByRole('button', { name: launcherName }).click()
  await expect(page.getByRole('dialog', { name: "Daniel's portfolio assistant" })).toBeVisible()

  const input = page.getByLabel('Ask about Daniel')
  await input.focus()
  await page.keyboard.type("What is Daniel's role?")
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('log', { name: 'Chat messages' })).toContainText(
    'AI & Automation Developer',
  )

  await input.fill('אילו כישורים יש לדניאל?')
  await page.getByRole('button', { name: 'Send message' }).click()
  const hebrewAnswer = page.getByText(/הכישורים והטכנולוגיות/)
  await expect(hebrewAnswer).toHaveAttribute('dir', 'rtl')

  await input.fill("What is Daniel's favorite food?")
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText(/I don't know that from the approved portfolio information/)).toBeVisible()

  await input.fill('How can I contact Daniel?')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(
    page.getByRole('log', { name: 'Chat messages' }).getByRole('link', { name: 'Email Daniel' }),
  ).toHaveAttribute(
    'href',
    'mailto:danielbedrack@gmail.com?subject=Portfolio%20inquiry',
  )

  expect([...requestedOrigins]).toEqual(['http://127.0.0.1:4173'])
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('button', { name: launcherName })).toBeFocused()
})

test('keeps the transcript across refresh only in the same browser context', async ({ page, browser }) => {
  await page.goto('./')
  await page.getByRole('button', { name: launcherName }).click()
  await page.getByLabel('Ask about Daniel').fill('Tell me about RemindMe')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByRole('log', { name: 'Chat messages' })).toContainText('RemindMe')

  await page.reload()
  await page.getByRole('button', { name: launcherName }).click()
  await expect(page.getByRole('log', { name: 'Chat messages' })).toContainText('RemindMe')

  const freshContext = await browser.newContext()
  const freshPage = await freshContext.newPage()
  await freshPage.goto('http://127.0.0.1:4173/Portfolio/')
  await freshPage.getByRole('button', { name: launcherName }).click()
  await expect(freshPage.getByRole('log', { name: 'Chat messages' })).not.toContainText('RemindMe')
  await freshContext.close()
})

test('fits the mobile viewport without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'mobile-only layout assertion')
  await page.goto('./')
  await page.getByRole('button', { name: launcherName }).click()

  const dialog = page.getByRole('dialog', { name: "Daniel's portfolio assistant" })
  await expect(dialog).toBeVisible()
  const bounds = await dialog.boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds?.x).toBeGreaterThanOrEqual(0)
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390)

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})
