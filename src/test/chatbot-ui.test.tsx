import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import type { ChatRouter, RoutedChatAnswer } from '../chatbot/chatRouter'
import { isPortfolioChatEnabled } from '../chatbot/config'
import { PortfolioChat } from '../components/chat/PortfolioChat'

describe('portfolio chat feature flag', () => {
  beforeEach(() => sessionStorage.clear())

  it('enables the widget only for the exact true value', () => {
    expect(isPortfolioChatEnabled('true')).toBe(true)
    expect(isPortfolioChatEnabled('TRUE')).toBe(false)
    expect(isPortfolioChatEnabled('1')).toBe(false)
    expect(isPortfolioChatEnabled(undefined)).toBe(false)
  })

  it('keeps the launcher out of App when the build flag is disabled', () => {
    render(<App />)

    expect(screen.queryByRole('button', { name: 'Open portfolio assistant' })).not.toBeInTheDocument()
  })
})

describe('PortfolioChat', () => {
  beforeEach(() => sessionStorage.clear())

  it('opens an accessible dialog from the named launcher', async () => {
    const user = userEvent.setup()
    render(<PortfolioChat />)

    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))

    expect(screen.getByRole('dialog', { name: "Daniel's portfolio assistant" })).toBeInTheDocument()
    expect(screen.getByLabelText('Ask about Daniel')).toHaveFocus()
  })

  it('answers a suggested English question with portfolio information', async () => {
    const user = userEvent.setup()
    render(<PortfolioChat />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))

    await user.click(screen.getByRole('button', { name: 'Professional experience' }))

    const transcript = screen.getByRole('log', { name: 'Chat messages' })
    expect(within(transcript).getByText("What is Daniel's professional experience?")).toBeInTheDocument()
    expect(within(transcript).getByText(/Optimate/)).toHaveAttribute('dir', 'ltr')
    expect(screen.getByText('Portfolio information')).toBeInTheDocument()
  })

  it('answers Hebrew in a right-to-left message', async () => {
    const user = userEvent.setup()
    render(<PortfolioChat />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))

    const input = screen.getByLabelText('Ask about Daniel')
    await user.type(input, 'אילו כישורים יש לדניאל?')
    await user.click(screen.getByRole('button', { name: 'Send message' }))

    expect(screen.getByText(/הכישורים והטכנולוגיות/)).toHaveAttribute('dir', 'rtl')
    expect(screen.getByText('מידע מהפורטפוליו')).toBeInTheDocument()
  })

  it('turns a Hebrew greeting into contextual quick-reply buttons', async () => {
    const user = userEvent.setup()
    render(<PortfolioChat />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))

    await user.type(screen.getByLabelText('Ask about Daniel'), 'היי')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('מה תרצה לדעת על דניאל?')).toHaveAttribute('dir', 'rtl')
    expect(screen.getByRole('button', { name: 'ניסיון מקצועי' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'כישורים וטכנולוגיות' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'פרויקטים נבחרים' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ניסיון מקצועי' }))

    const transcript = screen.getByRole('log', { name: 'Chat messages' })
    expect(within(transcript).getByText('מה הניסיון המקצועי של דניאל?')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'התאמה למשרה' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ניסיון מקצועי' })).not.toBeInTheDocument()
  })

  it('clarifies a vague Hebrew follow-up instead of claiming the information is missing', async () => {
    const user = userEvent.setup()
    render(<PortfolioChat />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))
    const input = screen.getByLabelText('Ask about Daniel')

    await user.type(input, 'היי')
    await user.keyboard('{Enter}')
    await screen.findByText(/העוזר של תיק העבודות של דניאל/)
    await user.type(input, 'ספר לי')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('בשמחה — על מה תרצה שאספר: הניסיון, הכישורים או הפרויקטים?'))
      .toBeInTheDocument()
    expect(screen.queryByText(/המידע הזה אינו מופיע/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ניסיון מקצועי' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'פרויקטים נבחרים' })).toBeInTheDocument()
  })

  it('handles an expressive Hebrew greeting and offers project choices after a project list', async () => {
    const user = userEvent.setup()
    render(<PortfolioChat />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))
    const input = screen.getByLabelText('Ask about Daniel')

    await user.type(input, 'הייי')
    await user.keyboard('{Enter}')
    expect(await screen.findByText(/העוזר של תיק העבודות של דניאל/)).toBeInTheDocument()

    await user.type(input, 'ספר על פרויקטים')
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('button', { name: 'מערכת CRM' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'מערכת סולארית' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'RemindMe' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'מערכת CRM' }))
    expect(await screen.findByText(/הובלת אפיון, תכנון והגדרת ה־CRM/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open project/ })).toHaveAttribute(
      'href',
      '/Portfolio/projects/real-estate-company',
    )
  })

  it('uses the prior static answer when the visitor asks for more detail', async () => {
    const user = userEvent.setup()
    render(<PortfolioChat />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))
    const input = screen.getByLabelText('Ask about Daniel')

    await user.type(input, 'ספר על פרויקטים')
    await user.keyboard('{Enter}')
    await screen.findByText(/הפרויקטים המופיעים/)
    await user.type(input, 'ספר לעומק')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('על איזה פרויקט תרצה להעמיק?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'RemindMe' })).toBeInTheDocument()
  })

  it('keeps project choices and context when an AI project answer is followed by static fallback', async () => {
    const router: ChatRouter = {
      answer: vi.fn()
        .mockResolvedValueOnce({
          answer: 'אלה הפרויקטים של דניאל.',
          language: 'he',
          intent: 'unknown',
          suggestedQuestions: [],
          source: 'ollama',
        })
        .mockRejectedValueOnce(new Error('offline')),
      resetAvailability: vi.fn(),
    }
    const user = userEvent.setup()
    render(<PortfolioChat router={router} />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))
    const input = screen.getByLabelText('Ask about Daniel')

    await user.type(input, 'ספר על פרויקטים')
    await user.keyboard('{Enter}')
    expect(await screen.findByText('אלה הפרויקטים של דניאל.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'מערכת CRM' })).toBeInTheDocument()

    await user.type(input, 'ספר לעומק')
    await user.keyboard('{Enter}')
    expect(await screen.findByText('על איזה פרויקט תרצה להעמיק?')).toBeInTheDocument()
  })

  it('uses Enter to submit while preserving Shift+Enter as a newline', async () => {
    const user = userEvent.setup()
    render(<PortfolioChat />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))

    const input = screen.getByLabelText('Ask about Daniel')
    await user.type(input, 'Tell me about ')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    await user.type(input, 'Daniel')

    expect(input).toHaveValue('Tell me about \nDaniel')
    expect(screen.getByRole('log', { name: 'Chat messages' })).not.toHaveTextContent('Tell me about')

    await user.keyboard('{Enter}')

    expect(input).toHaveValue('')
    expect(within(screen.getByRole('log', { name: 'Chat messages' })).getByText('Tell me about Daniel')).toBeInTheDocument()
  })

  it('keeps empty input disabled and rejects an oversized message locally', async () => {
    const user = userEvent.setup()
    render(<PortfolioChat />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))

    const send = screen.getByRole('button', { name: 'Send message' })
    const input = screen.getByLabelText('Ask about Daniel')
    expect(send).toBeDisabled()

    fireEvent.change(input, { target: { value: 'a'.repeat(2_001) } })
    await user.click(send)

    expect(screen.getByRole('alert')).toHaveTextContent('Please shorten your message to 2,000 characters.')
    expect(
      within(screen.getByRole('log', { name: 'Chat messages' })).queryByText('a'.repeat(2_001)),
    ).not.toBeInTheDocument()
  })

  it('shows the localized limit after 20 visitor messages', async () => {
    render(<PortfolioChat />)
    fireEvent.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))
    const input = screen.getByLabelText('Ask about Daniel')
    const send = screen.getByRole('button', { name: 'Send message' })

    for (let index = 1; index <= 20; index += 1) {
      fireEvent.change(input, { target: { value: `Question ${index}` } })
      fireEvent.click(send)
      await waitFor(() => expect(input).not.toBeDisabled())
    }
    fireEvent.change(input, { target: { value: 'שאלה נוספת' } })
    fireEvent.click(send)

    expect(screen.getByRole('alert')).toHaveTextContent('השיחה מוגבלת ל־20 הודעות מהמבקר בלשונית זו.')
  })

  it('closes with Escape and restores focus to the launcher', async () => {
    const user = userEvent.setup()
    render(<PortfolioChat />)
    const launcher = screen.getByRole('button', { name: 'Open portfolio assistant' })
    await user.click(launcher)

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(launcher).toHaveFocus()
  })

  it('keeps Tab focus inside the modal dialog', async () => {
    const user = userEvent.setup()
    render(<PortfolioChat />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))
    const send = screen.getByRole('button', { name: 'Send message' })
    fireEvent.change(screen.getByLabelText('Ask about Daniel'), { target: { value: 'Question' } })
    send.focus()

    await user.tab()

    expect(screen.getByRole('button', { name: 'Close portfolio assistant' })).toHaveFocus()
  })

  it('accepts an explicit job description up to 6,000 characters', async () => {
    const user = userEvent.setup()
    render(<PortfolioChat />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))
    const description = `Job description: TypeScript ${'a'.repeat(2_500)}`
    fireEvent.change(screen.getByLabelText('Ask about Daniel'), { target: { value: description } })

    await user.click(screen.getByRole('button', { name: 'Send message' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText(/Evidence in the portfolio/)).toBeInTheDocument()
  })

  it('links project-detail answers to the portfolio route', async () => {
    const user = userEvent.setup()
    render(<PortfolioChat />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))
    await user.type(screen.getByLabelText('Ask about Daniel'), 'Tell me about RemindMe')
    await user.click(screen.getByRole('button', { name: 'Send message' }))

    expect(screen.getByRole('link', { name: 'Open project: RemindMe' })).toHaveAttribute(
      'href',
      '/Portfolio/projects/remindme',
    )
  })

  it('announces replies politely and offers direct email without collecting details', async () => {
    const user = userEvent.setup()
    render(<PortfolioChat />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))
    await user.type(screen.getByLabelText('Ask about Daniel'), 'How can I contact Daniel?')
    await user.click(screen.getByRole('button', { name: 'Send message' }))

    expect(screen.getByRole('log', { name: 'Chat messages' })).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('link', { name: 'Email Daniel' })).toHaveAttribute(
      'href',
      'mailto:danielbedrack@gmail.com?subject=Portfolio%20inquiry',
    )
    expect(screen.queryByText(/your name|כתובת האימייל|consent/i)).not.toBeInTheDocument()
  })

  it('disables duplicate submission while a local AI answer is pending', async () => {
    let resolveAnswer!: (answer: RoutedChatAnswer) => void
    const answer = vi.fn(() => new Promise<RoutedChatAnswer>((resolve) => { resolveAnswer = resolve }))
    const router: ChatRouter = { answer, resetAvailability: vi.fn() }
    const user = userEvent.setup()
    render(<PortfolioChat router={router} />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))
    const transcript = screen.getByRole('log', { name: 'Chat messages' })
    Object.defineProperty(transcript, 'scrollHeight', { configurable: true, value: 640 })
    await user.type(screen.getByLabelText('Ask about Daniel'), 'מי זה דניאל?')
    await user.click(screen.getByRole('button', { name: 'Send message' }))

    expect(screen.getByRole('status', { name: 'AI חושב' })).toBeInTheDocument()
    expect(screen.queryByText('Preparing an answer…')).not.toBeInTheDocument()
    expect(screen.getByText('מידע מהפורטפוליו')).toBeInTheDocument()
    expect(screen.getByText('מה תרצה לדעת על דניאל?')).toHaveAttribute('dir', 'rtl')
    expect(screen.getByRole('button', { name: 'ניסיון מקצועי' })).toBeDisabled()
    await waitFor(() => expect(transcript.scrollTop).toBe(640))
    expect(screen.getByLabelText('Ask about Daniel')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
    fireEvent.keyDown(screen.getByLabelText('Ask about Daniel'), { key: 'Enter' })
    expect(answer).toHaveBeenCalledTimes(1)

    await act(async () => resolveAnswer({
      answer: 'תשובת AI מקומי', language: 'he', intent: 'unknown', suggestedQuestions: [], source: 'ollama',
    }))
    expect(await screen.findByText('תשובת AI מקומי')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'AI חושב' })).not.toBeInTheDocument()
    expect(screen.getByText('AI מקומי')).toBeInTheDocument()
  })

  it('falls back visibly but without a technical error when an injected router rejects', async () => {
    const router: ChatRouter = {
      answer: vi.fn().mockRejectedValue(new Error('private gateway failure')),
      resetAvailability: vi.fn(),
    }
    const user = userEvent.setup()
    render(<PortfolioChat router={router} />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))
    await user.type(screen.getByLabelText('Ask about Daniel'), 'Who is Daniel?')
    await user.click(screen.getByRole('button', { name: 'Send message' }))

    expect(await screen.findByText(/AI & Automation Developer/)).toBeInTheDocument()
    expect(screen.getByText('Portfolio information')).toBeInTheDocument()
    expect(screen.queryByText(/gateway|failure/iu)).not.toBeInTheDocument()
  })

  it('preserves the transcript when the response source changes', async () => {
    const router: ChatRouter = {
      answer: vi.fn()
        .mockResolvedValueOnce({ answer: 'AI first', language: 'en', intent: 'unknown', suggestedQuestions: [], source: 'ollama' })
        .mockResolvedValueOnce({ answer: 'Static second', language: 'en', intent: 'unknown', suggestedQuestions: [], source: 'static' }),
      resetAvailability: vi.fn(),
    }
    const user = userEvent.setup()
    render(<PortfolioChat router={router} />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))
    const input = screen.getByLabelText('Ask about Daniel')
    await user.type(input, 'First')
    await user.click(screen.getByRole('button', { name: 'Send message' }))
    await screen.findByText('AI first')
    await user.type(input, 'Second')
    await user.click(screen.getByRole('button', { name: 'Send message' }))

    expect(await screen.findByText('Static second')).toBeInTheDocument()
    expect(screen.getByText('AI first')).toBeInTheDocument()
    expect(screen.getByText('Portfolio information')).toBeInTheDocument()
  })

  it('ignores a late answer after unmount', async () => {
    let resolveAnswer!: (answer: RoutedChatAnswer) => void
    const router: ChatRouter = {
      answer: () => new Promise((resolve) => { resolveAnswer = resolve }),
      resetAvailability: vi.fn(),
    }
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const user = userEvent.setup()
    const view = render(<PortfolioChat router={router} />)
    await user.click(screen.getByRole('button', { name: 'Open portfolio assistant' }))
    await user.type(screen.getByLabelText('Ask about Daniel'), 'Late')
    await user.click(screen.getByRole('button', { name: 'Send message' }))
    view.unmount()
    await act(async () => resolveAnswer({
      answer: 'Too late', language: 'en', intent: 'unknown', suggestedQuestions: [], source: 'ollama',
    }))
    await waitFor(() => expect(errorSpy).not.toHaveBeenCalled())
    errorSpy.mockRestore()
  })
})
