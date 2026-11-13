import { describe, expect, it } from 'vitest'
import { detectChatLanguage } from '../chatbot/language'

describe('detectChatLanguage', () => {
  it('detects Hebrew from Hebrew letters', () => {
    expect(detectChatLanguage('מה התפקיד של דניאל?')).toBe('he')
  })

  it('detects English from Latin letters', () => {
    expect(detectChatLanguage("What is Daniel's role?")).toBe('en')
  })

  it('uses the latest meaningful script in mixed input', () => {
    expect(detectChatLanguage('What is Daniel’s role? עברית')).toBe('he')
    expect(detectChatLanguage('עברית What is Daniel’s role?')).toBe('en')
  })

  it('defaults empty or neutral input to English', () => {
    expect(detectChatLanguage('')).toBe('en')
    expect(detectChatLanguage(' 123?! ')).toBe('en')
  })
})
