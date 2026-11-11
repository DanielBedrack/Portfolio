import { useEffect, useRef, useState } from 'react'
import { createChatRouter, type ChatRouter } from '../../chatbot/chatRouter'
import { getPortfolioGatewayUrl } from '../../chatbot/config'
import { createGatewayClient } from '../../chatbot/gatewayClient'
import { detectChatLanguage } from '../../chatbot/language'
import { replyCopy } from '../../chatbot/replies'
import {
  ChatSessionLimitError,
  appendChatMessage,
  createSessionId,
  loadChatSession,
  saveChatSession,
  type ChatMessage,
  type ChatSession,
} from '../../chatbot/session'
import { answerStaticChat, validateChatInput } from '../../chatbot/staticEngine'
import type { ChatLanguage } from '../../chatbot/types'
import { profile } from '../../content/profile'
import { projects } from '../../content/projects'
import styles from '../../styles/chatbot.module.css'

const CONTACT_HREF = `mailto:${profile.email}?subject=Portfolio%20inquiry`

const uiCopy = {
  en: {
    sourceStatic: 'Portfolio information',
    sourceOllama: 'Local AI',
    pending: 'Preparing an answer…',
    overLimit: 'Please shorten your message to 2,000 characters.',
    sessionLimit: 'This chat is limited to 20 visitor messages in this tab.',
  },
  he: {
    sourceStatic: 'מידע מהפורטפוליו',
    sourceOllama: 'AI מקומי',
    pending: 'מכין תשובה…',
    overLimit: 'נא לקצר את ההודעה ל־2,000 תווים.',
    sessionLimit: 'השיחה מוגבלת ל־20 הודעות מהמבקר בלשונית זו.',
  },
} as const

function createDefaultRouter(): ChatRouter {
  const gatewayUrl = getPortfolioGatewayUrl(import.meta.env.VITE_PORTFOLIO_CHAT_GATEWAY_URL)
  return gatewayUrl
    ? createChatRouter({ gateway: createGatewayClient({ baseUrl: gatewayUrl }) })
    : createChatRouter({})
}

function createMessage(
  role: ChatMessage['role'],
  text: string,
  language: ChatLanguage,
  source: ChatMessage['source'],
  projectSlug?: string,
): ChatMessage {
  return {
    id: createSessionId(),
    role,
    text,
    language,
    source,
    ...(projectSlug ? { projectSlug } : {}),
    createdAt: new Date().toISOString(),
  }
}

function displayText(message: ChatMessage): string {
  return message.text.replace(` ${CONTACT_HREF}`, '')
}

export function PortfolioChat({ router }: { readonly router?: ChatRouter } = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [pendingLanguage, setPendingLanguage] = useState<ChatLanguage>('en')
  const [session, setSession] = useState<ChatSession>(() => loadChatSession())
  const [activeRouter] = useState(() => router ?? createDefaultRouter())
  const launcherRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mountedRef = useRef(true)
  const pendingRef = useRef(false)

  const latestAssistant = [...session.messages]
    .reverse()
    .find((message) => message.role === 'assistant')
  const displayLanguage = latestAssistant?.language ?? 'en'
  const statusLanguage = isPending ? pendingLanguage : displayLanguage
  const statusText = isPending
    ? uiCopy[statusLanguage].pending
    : latestAssistant?.source === 'ollama'
      ? uiCopy[statusLanguage].sourceOllama
      : uiCopy[statusLanguage].sourceStatic

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

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

  async function submitMessage(text: string) {
    if (pendingRef.current) return
    const language = detectChatLanguage(text)
    const requestType = /job description|תיאור משרה/iu.test(text) ? 'job_match' : 'chat'
    const validation = validateChatInput(text, requestType)
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
      setSession(withVisitor)
      saveChatSession(withVisitor)
      setInput('')
      setError('')
      setPendingLanguage(language)
      pendingRef.current = true
      setIsPending(true)

      let answer
      try {
        answer = await activeRouter.answer({
          message: validation.value,
          language,
          requestType,
          sessionId: session.sessionId,
        })
      } catch {
        answer = { ...answerStaticChat({ message: validation.value, language, requestType }), source: 'static' as const }
      }
      if (!mountedRef.current) return
      const assistant = createMessage(
        'assistant',
        answer.answer,
        answer.language,
        answer.source,
        answer.projectSlug,
      )
      const completed = appendChatMessage(withVisitor, assistant)
      setSession(completed)
      saveChatSession(completed)
    } catch (caught) {
      if (caught instanceof ChatSessionLimitError) {
        setError(uiCopy[language].sessionLimit)
        return
      }
      throw caught
    } finally {
      pendingRef.current = false
      if (mountedRef.current) setIsPending(false)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitMessage(input)
  }

  function trapDialogFocus(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), a[href]',
      ) ?? [],
    )
    const first = focusable[0]
    const last = focusable.at(-1)
    if (!first || !last) return

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
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
          ref={dialogRef}
          className={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="portfolio-chat-title"
          onKeyDown={trapDialogFocus}
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

          <div className={styles.status} lang={statusLanguage} dir={statusLanguage === 'he' ? 'rtl' : 'ltr'}>
            <span className={styles.statusDot} aria-hidden="true" />
            {statusText}
          </div>

          <div className={styles.suggestions} aria-label="Suggested questions">
            {replyCopy[displayLanguage].suggestedQuestions.map((question) => (
              <button
                className={styles.suggestion}
                type="button"
                key={question}
                disabled={isPending}
                dir={displayLanguage === 'he' ? 'rtl' : 'ltr'}
                onClick={() => void submitMessage(question)}
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
                {message.role === 'assistant' && message.projectSlug ? (
                  <a
                    className={styles.emailLink}
                    href={`/Portfolio/projects/${message.projectSlug}`}
                  >
                    Open project:{' '}
                    {projects.find(({ slug }) => slug === message.projectSlug)?.shortTitle ??
                      message.projectSlug}
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
              disabled={isPending}
              onChange={(event) => setInput(event.target.value)}
            />
            <button className={styles.sendButton} type="submit" disabled={isPending || !input.trim()}>
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
