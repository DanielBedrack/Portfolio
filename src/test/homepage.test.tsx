import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { HomePage } from '../pages/HomePage'

describe('work-first homepage', () => {
  it('presents the approved positioning and calls to action', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'AI & Automation Developer | Technical Project Manager',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /I turn complex business processes into reliable automation systems/i,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Based in Israel · Open to full-time opportunities')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View My Work' })).toHaveAttribute('href', '#work')
  })

  it('renders the three projects in order and gives Megureit priority', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    const work = screen.getByRole('region', { name: 'Featured work' })
    const cards = within(work).getAllByRole('article')

    expect(cards).toHaveLength(3)
    expect(within(cards[0]).getByRole('heading')).toHaveTextContent('Megureit')
    expect(cards[0]).toHaveAttribute('data-featured', 'true')
    expect(within(cards[1]).getByRole('heading')).toHaveTextContent('Solar Energy Company')
    expect(within(cards[2]).getByRole('heading')).toHaveTextContent('RemindMe')
  })

  it('shows the delivery sequence and corrected Optimate dates', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    const process = screen.getByRole('region', { name: 'How I work' })
    expect(within(process).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Discover',
      'Design',
      'Build',
      'Test',
      'Deploy',
    ])
    expect(screen.getByText(/March 2025 — September 2026/)).toBeInTheDocument()
    expect(screen.queryByText(/Optimate.*Present/i)).not.toBeInTheDocument()
  })

  it('links navigation to the approved section anchors', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Work' })).toHaveAttribute('href', '#work')
    expect(screen.getByRole('link', { name: 'Experience' })).toHaveAttribute(
      'href',
      '#experience',
    )
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      '#contact',
    )
  })
})
