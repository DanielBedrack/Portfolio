import { expect, test } from '@playwright/test'

const projects = [
  ['megureit', 'Integrated CRM Ecosystem for Megureit'],
  ['financial-document-automation', 'Cross-Department Operations System for a Solar Energy Company'],
  ['remindme', 'RemindMe — Location-Aware Shopping Assistant'],
] as const

test('uses the case-correct GitHub Pages project path', async ({ page }) => {
  const response = await page.goto('http://127.0.0.1:4173/Portfolio/')

  expect(response?.status()).toBe(200)
  expect(new URL(page.url()).pathname).toBe('/Portfolio/')

  const assetPaths = await page.locator('script[src], link[rel="stylesheet"]').evaluateAll(
    (elements) => elements.map((element) => element.getAttribute('src') ?? element.getAttribute('href')),
  )
  expect(assetPaths).not.toHaveLength(0)
  expect(assetPaths.every((path) => path?.startsWith('/Portfolio/'))).toBeTruthy()
})

test('homepage navigation and responsive layout', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AI & Automation Developer')

  await page.getByRole('link', { name: 'Work', exact: true }).click()
  await expect(page).toHaveURL(/#work$/)
  await expect(page.getByRole('region', { name: 'Featured work' })).toBeVisible()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

for (const [slug, title] of projects) {
  test(`opens the ${slug} case study and returns to work`, async ({ page }) => {
    await page.goto(`./projects/${slug}`)
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await page.getByRole('link', { name: 'Back to all projects' }).click()
    await expect(page).toHaveURL(/\/Portfolio\/?#work$/)
  })
}

test('direct GitHub Pages route restores RemindMe', async ({ page }) => {
  await page.goto('./projects/remindme')
  await expect(
    page.getByRole('heading', { level: 1, name: 'RemindMe — Location-Aware Shopping Assistant' }),
  ).toBeVisible()
  await expect(page.getByText('Work in Progress')).toBeVisible()
})

test('unknown routes render the custom 404', async ({ page }) => {
  await page.goto('./not-a-real-route')
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
})

test('contact links and resume asset are valid', async ({ page, request }) => {
  await page.goto('./')

  await expect(page.getByRole('link', { name: 'Email Daniel' })).toHaveAttribute(
    'href',
    'mailto:danielbedrack@gmail.com?subject=Portfolio%20inquiry',
  )
  await expect(page.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
    'href',
    'https://www.linkedin.com/in/danielbedrack',
  )
  await expect(page.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/DanielBedrack',
  )

  const resumeHref = await page.getByRole('link', { name: 'Download Resume' }).getAttribute('href')
  expect(resumeHref).toBe('/Portfolio/Daniel-Bedrack-CV-2026.pdf')
  const response = await request.get(resumeHref ?? '')
  expect(response.ok()).toBeTruthy()
  expect(response.headers()['content-type']).toBe('application/pdf')
  expect((await response.body()).subarray(0, 5).toString('ascii')).toBe('%PDF-')
})

test('keyboard focus is visible', async ({ page }) => {
  await page.goto('./')
  await page.keyboard.press('Tab')

  const focused = page.locator(':focus')
  await expect(focused).toHaveAttribute('aria-label', 'Daniel Bedrack, home')
  const outline = await focused.evaluate((element) => getComputedStyle(element).outlineStyle)
  expect(outline).not.toBe('none')
})

test('reduced motion disables entrances and smooth scrolling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')

  const animationName = await page.locator('.motion-enter').first().evaluate(
    (element) => getComputedStyle(element).animationName,
  )
  const scrollBehavior = await page.locator('html').evaluate(
    (element) => getComputedStyle(element).scrollBehavior,
  )
  expect(animationName).toBe('none')
  expect(scrollBehavior).toBe('auto')
})
