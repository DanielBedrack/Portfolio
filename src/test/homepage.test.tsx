import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('renders the three projects in order and gives the real-estate case study priority', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    const work = screen.getByRole('region', { name: 'Featured work' })
    const cards = within(work).getAllByRole('article')

    expect(cards).toHaveLength(3)
    expect(within(cards[0]).getByRole('heading')).toHaveTextContent('Real-Estate Company')
    expect(cards[0]).toHaveAttribute('data-featured', 'true')
    expect(within(cards[1]).getByRole('heading')).toHaveTextContent('Solar Energy Company')
    expect(within(cards[2]).getByRole('heading')).toHaveTextContent('RemindMe')
  })

  it('runs and resets a fictional RemindMe proximity simulation', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    const demo = screen.getByRole('region', { name: 'Try RemindMe' })
    const itemInput = within(demo).getByRole('textbox', { name: 'Item to remember' })
    const simulate = within(demo).getByRole('button', { name: 'Simulate nearby store' })

    expect(within(demo).getByText('No reminder added yet')).toBeInTheDocument()
    expect(
      within(demo).getByRole('img', { name: 'Map showing your location away from the selected store' }),
    ).toBeInTheDocument()
    expect(simulate).toBeDisabled()

    await user.type(itemInput, 'Milk')
    await user.selectOptions(within(demo).getByRole('combobox', { name: 'Store category' }), 'supermarket')
    await user.click(within(demo).getByRole('button', { name: 'Add reminder' }))

    expect(within(demo).getByText('Milk')).toBeInTheDocument()
    expect(simulate).toBeEnabled()
    await user.click(simulate)
    expect(
      within(demo).getByRole('img', { name: 'Map showing your location near a supermarket' }),
    ).toBeInTheDocument()
    expect(within(demo).getByRole('status')).toHaveTextContent(
      "You're near a supermarket — don't forget Milk.",
    )

    await user.click(within(demo).getByRole('button', { name: 'Reset demo' }))
    expect(itemInput).toHaveValue('')
    expect(within(demo).getByText('No reminder added yet')).toBeInTheDocument()
    expect(within(demo).queryByRole('status')).not.toBeInTheDocument()
    expect(simulate).toBeDisabled()
  })

  it('keeps the solar operations demo behind a human approval step', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    const demo = screen.getByRole('region', { name: 'Try the solar operations flow' })

    expect(within(demo).getByText('Sales intake')).toHaveAttribute('aria-current', 'step')
    await user.click(within(demo).getByRole('button', { name: 'Move to Operations' }))
    expect(within(demo).getByText('Operations handoff complete.')).toBeInTheDocument()

    await user.click(within(demo).getByRole('button', { name: 'Move to Finance' }))
    await user.click(within(demo).getByRole('button', { name: 'Process sample invoice' }))
    expect(within(demo).getByText('AI prepared a structured record for human review.')).toBeInTheDocument()
    expect(within(demo).getByText('Awaiting human approval')).toBeInTheDocument()

    await user.click(within(demo).getByRole('button', { name: 'Approve record' }))
    expect(
      within(demo).getByText('Human approval recorded. Ready for Rivhit synchronization.'),
    ).toBeInTheDocument()
  })

  it('runs the simulated automation scenario without bypassing human approval', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    const demo = screen.getByRole('region', { name: 'Try the solar operations flow' })
    await user.click(within(demo).getByRole('tab', { name: 'Automation scenario' }))

    const scenario = within(demo).getByRole('tabpanel', { name: 'Automation scenario' })
    expect(within(scenario).getByText('Gmail')).toBeInTheDocument()
    expect(within(scenario).getByText('OCR')).toBeInTheDocument()
    expect(within(scenario).getByText('OpenAI')).toBeInTheDocument()
    expect(within(scenario).getByText('monday.com')).toBeInTheDocument()

    await user.click(within(scenario).getByRole('button', { name: 'Run scenario' }))
    expect(within(scenario).getByText('Scenario paused for human approval.')).toBeInTheDocument()
    expect(within(scenario).getByText('Rivhit integration locked')).toBeInTheDocument()

    await user.click(within(scenario).getByRole('button', { name: 'Approve and continue' }))
    expect(within(scenario).getByText('Approved. Downstream Rivhit integration is ready.')).toBeInTheDocument()
  })

  it('switches CRM role views and prevents a duplicate sync', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    const demo = screen.getByRole('region', { name: 'Try the CRM ecosystem' })

    expect(document.querySelectorAll('main')).toHaveLength(1)
    expect(within(demo).getByRole('tab', { name: 'Customer Service' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(within(demo).getByText('Apartment interest')).toBeInTheDocument()

    await user.click(within(demo).getByRole('tab', { name: 'Contracts' }))
    expect(within(demo).getByText('Contract stage')).toBeInTheDocument()
    expect(within(demo).getByText('Customer contact history')).toHaveAttribute(
      'data-access',
      'restricted',
    )

    await user.click(within(demo).getByRole('button', { name: 'Simulate sync' }))
    expect(within(demo).getByRole('status')).toHaveTextContent(
      'Fireberry CRM updated from Priority.',
    )

    await user.click(within(demo).getByRole('button', { name: 'Run same sync again' }))
    expect(within(demo).getByRole('status')).toHaveTextContent(
      'Duplicate prevented. Existing record matched by unique ID.',
    )
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

  it('shows the approved AI and messaging tools in the skills section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    const skills = screen.getByRole('region', { name: 'Toolbox Skills' })

    expect(within(skills).getByText('Claude')).toBeInTheDocument()
    expect(within(skills).getByText('Codex')).toBeInTheDocument()
    expect(within(skills).getByText('ManyChat')).toBeInTheDocument()
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
