import type { ChatLanguage } from './types'

const HEBREW_LETTER = /[\u0590-\u05ff]/u
const LATIN_LETTER = /[a-z]/iu

export function detectChatLanguage(input: string): ChatLanguage {
  for (const character of Array.from(input).reverse()) {
    if (HEBREW_LETTER.test(character)) return 'he'
    if (LATIN_LETTER.test(character)) return 'en'
  }

  return 'en'
}
