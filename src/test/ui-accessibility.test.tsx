import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ButtonLink } from '../components/ui/ButtonLink'
import { ProjectCard } from '../components/ui/ProjectCard'
import { SectionHeading } from '../components/ui/SectionHeading'
import { projects } from '../content/projects'

describe('UI primitives', () => {
  it('renders ButtonLink as a named anchor', () => {
    render(<ButtonLink href="#work">View my work</ButtonLink>)

    expect(screen.getByRole('link', { name: 'View my work' })).toHaveAttribute(
      'href',
      '#work',
    )
  })

  it('renders a text-first ProjectCard with a named link', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={projects[0]} featured />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: projects[0].title })).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: `Read case study: ${projects[0].title}` }),
    ).toHaveAttribute('href', '/projects/megureit')
  })

  it('retains the requested heading level', () => {
    render(<SectionHeading level={3}>Selected work</SectionHeading>)

    expect(screen.getByRole('heading', { level: 3, name: 'Selected work' })).toBeInTheDocument()
  })
})
