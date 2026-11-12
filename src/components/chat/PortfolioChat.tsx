import { useEffect, useRef, useState } from 'react'
import { createChatRouter, type ChatRouter } from '../../chatbot/chatRouter'
import { getPortfolioGatewayUrl } from '../../chatbot/config'
import { createGatewayClient } from '../../chatbot/gatewayClient'
import { detectChatLanguage } from '../../chatbot/language'
import { getQuickReplies } from '../../chatbot/quickReplies'
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
import { answerStaticChat, detectIntent, validateChatInput } from '../../chatbot/staticEngine'
import type { ChatLanguage } from '../../chatbot/types'
import type { ChatIntent } from '../../chatbot/types'
import { profile } from '../../content/profile'
import { projects } from '../../content/projects'
import styles from '../../styles/chatbot.module.css'

const CONTACT_HREF = `mailto:${profile.email}?subject=Portfolio%20inquiry`

const uiCopy = {
  en: {
    sourceStatic: 'Portfolio information',
    sourceOllama: 'Local AI',
    thinking: 'AI is thinking',
    overLimit: 'Please shorten your message to 2,000 characters.',
    sessionLimit: 'This chat is limited to 20 visitor messages in this tab.',
    quickReplyPrompt: 'What would you like to know about Daniel?',
    quickReplyLabel: 'Suggested next questions',
  },
  he: {
    sourceStatic: 'מידע מהפורטפוליו',
    sourceOllama: 'AI מקומי',
    thinking: 'AI חושב',
    overLimit: 'נא לקצר את ההודעה ל־2,000 תווים.',
    sessionLimit: 'השיחה מוגבלת ל־20 הודעות מהמבקר בלשונית זו.',
    quickReplyPrompt: 'מה תרצה לדעת על דניאל?',
    quickReplyLabel: 'אפשרויות המשך',
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
  intent?: ChatIntent,
): ChatMessage {
  return {
    id: createSessionId(),
    role,
    text,
    language,
    source,
    ...(projectSlug ? { projectSlug } : {}),
    ...(intent ? { intent } : {}),
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
  const messagesRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)
  const pendingRef = useRef(false)

  const latestAssistant = [...session.messages]
    .reverse()
    .find((message) => message.role === 'assistant')
  const latestVisitor = [...session.messages]
    .reverse()
    .find((message) => message.role === 'visitor')
  const displayLanguage = latestAssistant?.language ?? 'en'
  const contextualIntent = latestAssistant?.intent && latestAssistant.intent !== 'unknown'
    ? latestAssistant.intent
    : latestVisitor
      ? detectIntent(latestVisitor.text)
      : undefined
  const interfaceLanguage = isPending ? pendingLanguage : displayLanguage
  const quickReplies = getQuickReplies(latestVisitor?.text, interfaceLanguage, contextualIntent)
  const statusLanguage = interfaceLanguage
  const statusText = latestAssistant?.source === 'ollama'
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
    const messages = messagesRef.current
    if (!isOpen || !messages) return
    messages.scrollTop = messages.scrollHeight
  }, [isOpen, isPending, session.messages.length])

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
      const context = latestAssistant
        ? { previousIntent: contextualIntent, previousProjectSlug: latestAssistant.projectSlug }
        : undefined
      try {
        answer = await activeRouter.answer({
          message: validation.value,
          language,
          requestType,
          sessionId: session.sessionId,
          ...(context ? { context } : {}),
        })
      } catch {
        answer = {
          ...answerStaticChat({ message: validation.value, language, requestType, context }),
          source: 'static' as const,
        }
      }
      if (!mountedRef.current) return
      const assistant = createMessage(
        'assistant',
        answer.answer,
        answer.language,
        answer.source,
        answer.projectSlug,
        answer.intent,
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

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (isPending || !input.trim()) return
    event.currentTarget.form?.requestSubmit()
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

          <div className={styles.suggestionPanel} dir={interfaceLanguage === 'he' ? 'rtl' : 'ltr'}>
            <p className={styles.suggestionPrompt} dir={interfaceLanguage === 'he' ? 'rtl' : 'ltr'}>
              {uiCopy[interfaceLanguage].quickReplyPrompt}
            </p>
            <div className={styles.suggestions} aria-label={uiCopy[interfaceLanguage].quickReplyLabel}>
              {quickReplies.map(({ label, question }) => (
                <button
                  className={styles.suggestion}
                  type="button"
                  key={label}
                  disabled={isPending}
                  dir={interfaceLanguage === 'he' ? 'rtl' : 'ltr'}
                  onClick={() => void submitMessage(question)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={messagesRef}
            className={styles.messages}
            role="log"
            aria-label="Chat messages"
            aria-live="polite"
          >
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
            {isPending ? (
              <div
                className={`${styles.message} ${styles.assistantMessage} ${styles.thinkingMessage}`}
                role="status"
                aria-label={uiCopy[pendingLanguage].thinking}
                dir={pendingLanguage === 'he' ? 'rtl' : 'ltr'}
                lang={pendingLanguage}
              >
                <span className={styles.thinkingMark} aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M12 3.5c.55 4.94 3.56 7.95 8.5 8.5-4.94.55-7.95 3.56-8.5 8.5-.55-4.94-3.56-7.95-8.5-8.5 4.94-.55 7.95-3.56 8.5-8.5Z" />
                  </svg>
                </span>
                <span className={styles.thinkingText}>{uiCopy[pendingLanguage].thinking}</span>
                <span className={styles.thinkingDots} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            ) : null}
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
              onKeyDown={handleInputKeyDown}
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
