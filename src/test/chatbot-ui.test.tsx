import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
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
})
