export const CHAT_MESSAGE_LIMIT = 2_000
export const JOB_DESCRIPTION_LIMIT = 6_000
export const HEALTH_TIMEOUT_MS = 5_000
export const CHAT_TIMEOUT_MS = 25_000
export const HEALTH_TTL_MS = 60_000

export function isPortfolioChatEnabled(envValue?: string): boolean {
  return envValue === 'true'
}

export function getPortfolioGatewayUrl(envValue?: string): URL | undefined {
  if (!envValue?.trim()) return undefined
  let url: URL
  try {
    url = new URL(envValue)
  } catch {
    return undefined
  }
  const isLocalHttp =
    url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  if (url.protocol !== 'https:' && !isLocalHttp) return undefined
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return undefined
  return url
}
