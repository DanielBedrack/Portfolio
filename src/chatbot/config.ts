export const CHAT_MESSAGE_LIMIT = 2_000
export const JOB_DESCRIPTION_LIMIT = 6_000

export function isPortfolioChatEnabled(envValue?: string): boolean {
  return envValue === 'true'
}
