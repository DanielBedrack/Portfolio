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

    await user.click(screen.getByRole('button', { name: "What is Daniel's professional experience?" }))

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
    await user.type(screen.getByLabelText('Ask about Daniel'), 'Who is Daniel?')
    await user.click(screen.getByRole('button', { name: 'Send message' }))

    expect(screen.getByLabelText('Ask about Daniel')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
    fireEvent.keyDown(screen.getByLabelText('Ask about Daniel'), { key: 'Enter' })
    expect(answer).toHaveBeenCalledTimes(1)

    await act(async () => resolveAnswer({
      answer: 'Local AI answer', language: 'en', intent: 'unknown', suggestedQuestions: [], source: 'ollama',
    }))
    expect(await screen.findByText('Local AI answer')).toBeInTheDocument()
    expect(screen.getByText('Local AI')).toBeInTheDocument()
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
