import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PortfolioRoutes } from '../app/App'
import { restoreGitHubPagesPath } from '../app/restoreGitHubPagesPath'
import { projects } from '../content/projects'
import { ProjectPage } from '../pages/ProjectPage'

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PortfolioRoutes />
    </MemoryRouter>,
  )
}

describe('portfolio routes', () => {
  it('renders the homepage', () => {
    renderRoute('/')

    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'AI & Automation Developer',
    )
  })

  it.each(projects)('renders the $slug case study', (project) => {
    renderRoute(`/projects/${project.slug}`)

    expect(screen.getByRole('heading', { level: 1, name: project.title })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to all projects' })).toHaveAttribute(
      'href',
      '/#work',
    )
    expect(screen.getByRole('link', { name: 'Contact Me' })).toHaveAttribute(
      'href',
      '/portfolio/#contact',
    )
  })

  it('shows status and verification limits for RemindMe', () => {
    renderRoute('/projects/remindme')

    expect(screen.getByText('Work in Progress')).toBeInTheDocument()
    expect(screen.getByText(/background notifications on a real Android or iPhone/i)).toBeInTheDocument()
    expect(screen.getByText(/native identifiers and mobile authentication/i)).toBeInTheDocument()
  })

  it.each(['/projects/not-a-project', '/not-a-route'])('renders the custom 404 for %s', (path) => {
    renderRoute(path)

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return home' })).toHaveAttribute('href', '/')
  })
})

describe('text-first case studies', () => {
  it('keeps every approved section when optional media is absent', () => {
    render(
      <MemoryRouter>
        <ProjectPage project={projects[0]} />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    for (const heading of [
      'Context and business problem',
      'My role',
      'Constraints',
      'System flow',
      'Key challenge',
      'How the challenge was addressed',
      'Technologies',
      'Outcome',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
  })
})

describe('GitHub Pages path restoration', () => {
  it('restores a captured project path', () => {
    const replaceState = vi.fn()
    const location = {
      pathname: '/portfolio/',
      search: '?p=%2Fprojects%2Fremindme',
      hash: '',
    } as Location
    const history = { replaceState } as unknown as History

    restoreGitHubPagesPath(location, history)

    expect(replaceState).toHaveBeenCalledWith(null, '', '/portfolio/projects/remindme')
  })

  it('leaves a normal homepage URL unchanged', () => {
    const replaceState = vi.fn()
    const location = { pathname: '/portfolio/', search: '', hash: '' } as Location
    const history = { replaceState } as unknown as History

    restoreGitHubPagesPath(location, history)

    expect(replaceState).not.toHaveBeenCalled()
  })
})
