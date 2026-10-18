import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getRouteMeta } from '../app/routeMeta'
import { ContactSection } from '../components/sections/ContactSection'
import { ExternalLink } from '../components/ui/ExternalLink'
import { profile } from '../content/profile'
import { projects } from '../content/projects'
import { Seo } from '../seo/Seo'

describe('route metadata', () => {
  it('returns unique metadata and canonical paths for every public route', () => {
    const routes = ['/', ...projects.map((project) => `/projects/${project.slug}`)]
    const metadata = routes.map(getRouteMeta)

    expect(new Set(metadata.map(({ title }) => title))).toHaveLength(routes.length)
    expect(new Set(metadata.map(({ description }) => description))).toHaveLength(routes.length)
    expect(metadata.map(({ canonicalPath }) => canonicalPath)).toEqual([
      '/portfolio/',
      '/portfolio/projects/megureit',
      '/portfolio/projects/financial-document-automation',
      '/portfolio/projects/remindme',
    ])
  })

  it('returns safe default metadata for unknown paths', () => {
    const meta = getRouteMeta('/missing')

    expect(meta.title).toMatch(/Page not found/)
    expect(meta.canonicalPath).toBe('/portfolio/missing')
  })

  it('writes description, canonical, Open Graph and Person JSON-LD', async () => {
    const meta = getRouteMeta('/projects/megureit')
    render(<Seo meta={meta} />)

    await waitFor(() => expect(document.title).toBe(meta.title))
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      meta.description,
    )
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${window.location.origin}${meta.canonicalPath}`,
    )
    expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute(
      'content',
      meta.title,
    )
    expect(document.querySelector('script[type="application/ld+json"]')?.textContent).toContain(
      profile.name,
    )
  })
})

describe('contact actions', () => {
  it('publishes the approved email and social profiles without a form', () => {
    render(<ContactSection />)

    expect(screen.getByRole('link', { name: 'Email Daniel' })).toHaveAttribute(
      'href',
      'mailto:danielbedrack@gmail.com?subject=Portfolio%20inquiry',
    )
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      profile.linkedIn,
    )
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      profile.github,
    )
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('secures links that open a new tab', () => {
    render(<ExternalLink href="https://example.com">External resource</ExternalLink>)

    expect(screen.getByRole('link', { name: 'External resource' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    )
  })
})
