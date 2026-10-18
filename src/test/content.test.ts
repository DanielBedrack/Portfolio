import { describe, expect, it } from 'vitest'
import { profile } from '../content/profile'
import { getProjectBySlug, projects } from '../content/projects'
import { validatePortfolioContent } from '../content/validateContent'

describe('portfolio content contract', () => {
  it('publishes exactly the three approved projects in priority order', () => {
    expect(projects.map(({ slug }) => slug)).toEqual([
      'megureit',
      'financial-document-automation',
      'remindme',
    ])
  })

  it('presents Megureit as a scalable, role-aware real-estate CRM ecosystem', () => {
    const project = getProjectBySlug('megureit')
    const publishedCopy = JSON.stringify(project)

    expect(project?.clientDisplayName).toBe('Real-estate company')
    expect(project?.collaboration).toContain('One additional developer')
    expect(project?.collaboration).toContain('Fireberry-Priority synchronization')
    expect(project?.collaboration).toContain('iframe')
    expect(publishedCopy).toMatch(/leadership.*dashboards/i)
    expect(publishedCopy).toMatch(/permissions/i)
    expect(publishedCopy).toMatch(/role-specific screens/i)
    expect(publishedCopy).toMatch(/Make\.com/i)
    expect(publishedCopy).toMatch(/custom iframe interfaces embedded inside the CRM platform/i)
    expect(publishedCopy).toMatch(/Vercel/i)
    expect(publishedCopy).toMatch(/scalable/i)
  })

  it('presents the solar project as a cross-department system with AI as one example', () => {
    const project = getProjectBySlug('financial-document-automation')
    const publishedCopy = JSON.stringify(project)

    expect(project?.clientDisplayName).toBe('Solar energy company')
    expect(project?.title).toBe('Cross-Department Operations System for a Solar Energy Company')
    expect(publishedCopy).toMatch(/sales/i)
    expect(publishedCopy).toMatch(/operations/i)
    expect(publishedCopy).toMatch(/finance/i)
    expect(publishedCopy).toMatch(/customer.*flow/i)
    expect(publishedCopy).toMatch(/Rivhit/i)
    expect(publishedCopy).toMatch(/example.*AI/i)
    expect(publishedCopy).not.toMatch(/Google Cloud Vision/i)
  })

  it('marks RemindMe as unfinished and publishes its verification limits', () => {
    const project = getProjectBySlug('remindme')

    expect(project?.status).toBe('work-in-progress')
    expect(project?.verificationLimits).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/background notifications/i),
        expect.stringMatching(/native identifiers/i),
      ]),
    )
  })

  it('shows Optimate as previous employment ending in September 2026', () => {
    const optimate = profile.experience.find(({ company }) => company === 'Optimate')

    expect(optimate?.end).toBe('September 2026')
    expect(JSON.stringify(optimate)).not.toMatch(/present/i)
  })
})

describe('content validation', () => {
  it('reports missing titles, duplicate slugs and missing outcomes', () => {
    const invalidProjects = [
      { ...projects[0], title: '', outcome: '' },
      { ...projects[1], slug: projects[0].slug },
      projects[2],
    ]

    expect(validatePortfolioContent(invalidProjects, profile)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/title/i),
        expect.stringMatching(/duplicate slug/i),
        expect.stringMatching(/outcome/i),
      ]),
    )
  })

  it('allows projects without optional images', () => {
    const withoutImages = projects.map((project) => {
      const withoutImage = { ...project }
      delete withoutImage.image
      return withoutImage
    })

    expect(validatePortfolioContent(withoutImages, profile)).toEqual([])
  })
})
