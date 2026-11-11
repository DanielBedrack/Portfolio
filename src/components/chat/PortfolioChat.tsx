import { useEffect, useRef, useState } from 'react'
import { detectChatLanguage } from '../../chatbot/language'
import { replyCopy } from '../../chatbot/replies'
import {
  ChatSessionLimitError,
  appendChatMessage,
  loadChatSession,
  saveChatSession,
  type ChatMessage,
  type ChatSession,
} from '../../chatbot/session'
import { answerStaticChat, validateChatInput } from '../../chatbot/staticEngine'
import type { ChatLanguage } from '../../chatbot/types'
import { profile } from '../../content/profile'
import styles from '../../styles/chatbot.module.css'

const CONTACT_HREF = `mailto:${profile.email}?subject=Portfolio%20inquiry`

const uiCopy = {
  en: {
    source: 'Portfolio information',
    overLimit: 'Please shorten your message to 2,000 characters.',
    sessionLimit: 'This chat is limited to 20 visitor messages in this tab.',
  },
  he: {
    source: 'מידע מהפורטפוליו',
    overLimit: 'נא לקצר את ההודעה ל־2,000 תווים.',
    sessionLimit: 'השיחה מוגבלת ל־20 הודעות מהמבקר בלשונית זו.',
  },
} as const

function createMessage(
  role: ChatMessage['role'],
  text: string,
  language: ChatLanguage,
  source: ChatMessage['source'],
): ChatMessage {
  return {
    id: globalThis.crypto.randomUUID(),
    role,
    text,
    language,
    source,
    createdAt: new Date().toISOString(),
  }
}

function displayText(message: ChatMessage): string {
  return message.text.replace(` ${CONTACT_HREF}`, '')
}

export function PortfolioChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [session, setSession] = useState<ChatSession>(() => loadChatSession())
  const launcherRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const latestAssistant = [...session.messages]
    .reverse()
    .find((message) => message.role === 'assistant')
  const displayLanguage = latestAssistant?.language ?? 'en'

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      launcherRef.current?.focus()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  function openChat() {
    setIsOpen(true)
  }

  function closeChat() {
    setIsOpen(false)
    launcherRef.current?.focus()
  }

  function submitMessage(text: string) {
    const language = detectChatLanguage(text)
    const validation = validateChatInput(text, 'chat')
    if (!validation.ok) {
      setError(
        validation.reason === 'too_long'
          ? uiCopy[language].overLimit
          : replyCopy[language].invalid,
      )
      return
    }

    try {
      const visitor = createMessage('visitor', validation.value, language, 'visitor')
      const withVisitor = appendChatMessage(session, visitor)
      const answer = answerStaticChat({ message: validation.value, language })
      const assistant = createMessage('assistant', answer.answer, answer.language, 'static')
      const completed = appendChatMessage(withVisitor, assistant)
      setSession(completed)
      saveChatSession(completed)
      setInput('')
      setError('')
    } catch (caught) {
      if (caught instanceof ChatSessionLimitError) {
        setError(uiCopy[language].sessionLimit)
        return
      }
      throw caught
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitMessage(input)
  }

  return (
    <div className={styles.root}>
      <button
        ref={launcherRef}
        className={styles.launcher}
        type="button"
        aria-label="Open portfolio assistant"
        aria-expanded={isOpen}
        onClick={openChat}
      >
        <span aria-hidden="true">✦</span>
        <span>Ask Daniel's portfolio</span>
      </button>

      {isOpen ? (
        <section
          className={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="portfolio-chat-title"
        >
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Portfolio assistant</p>
              <h2 id="portfolio-chat-title" className={styles.title}>
                Daniel's portfolio assistant
              </h2>
            </div>
            <button
              className={styles.iconButton}
              type="button"
              aria-label="Close portfolio assistant"
              onClick={closeChat}
            >
              ×
            </button>
          </header>

          <div className={styles.status} lang={displayLanguage} dir={displayLanguage === 'he' ? 'rtl' : 'ltr'}>
            <span className={styles.statusDot} aria-hidden="true" />
            {uiCopy[displayLanguage].source}
          </div>

          <div className={styles.suggestions} aria-label="Suggested questions">
            {replyCopy[displayLanguage].suggestedQuestions.map((question) => (
              <button
                className={styles.suggestion}
                type="button"
                key={question}
                dir={displayLanguage === 'he' ? 'rtl' : 'ltr'}
                onClick={() => submitMessage(question)}
              >
                {question}
              </button>
            ))}
          </div>

          <div className={styles.messages} role="log" aria-label="Chat messages" aria-live="polite">
            {session.messages.length === 0 ? (
              <p className={styles.empty}>
                Ask about Daniel's experience, skills, projects, or fit for a role.
              </p>
            ) : null}
            {session.messages.map((message) => (
              <div
                className={`${styles.message} ${
                  message.role === 'visitor' ? styles.visitorMessage : styles.assistantMessage
                }`}
                key={message.id}
                dir={message.language === 'he' ? 'rtl' : 'ltr'}
                lang={message.language}
              >
                <p dir={message.language === 'he' ? 'rtl' : 'ltr'}>{displayText(message)}</p>
                {message.role === 'assistant' && message.text.includes(CONTACT_HREF) ? (
                  <a className={styles.emailLink} href={CONTACT_HREF}>
                    Email Daniel
                  </a>
                ) : null}
              </div>
            ))}
          </div>

          <form className={styles.composer} onSubmit={handleSubmit}>
            <label className={styles.srOnly} htmlFor="portfolio-chat-input">
              Ask about Daniel
            </label>
            <textarea
              ref={inputRef}
              id="portfolio-chat-input"
              className={styles.input}
              value={input}
              rows={2}
              maxLength={6_001}
              placeholder="Ask about experience, skills, or projects"
              onChange={(event) => setInput(event.target.value)}
            />
            <button className={styles.sendButton} type="submit" disabled={!input.trim()}>
              Send message
            </button>
          </form>
          {error ? (
            <p className={styles.error} role="alert" dir={detectChatLanguage(input) === 'he' ? 'rtl' : 'ltr'}>
              {error}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
