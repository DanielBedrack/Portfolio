import type { Profile, Project } from './types'

export function validatePortfolioContent(
  projects: readonly Project[],
  profile: Profile,
): string[] {
  const errors: string[] = []
  const slugs = new Set<string>()

  for (const [index, project] of projects.entries()) {
    const label = project.slug || `project ${index + 1}`

    if (!project.title.trim()) errors.push(`${label}: title is required`)
    if (!project.slug.trim()) errors.push(`project ${index + 1}: slug is required`)
    if (!project.summary.trim()) errors.push(`${label}: summary is required`)
    if (!project.outcome.trim()) errors.push(`${label}: outcome is required`)

    if (slugs.has(project.slug)) errors.push(`${label}: duplicate slug`)
    slugs.add(project.slug)
  }

  if (!profile.name.trim()) errors.push('profile: name is required')
  if (!profile.title.trim()) errors.push('profile: title is required')
  if (!profile.email.trim()) errors.push('profile: email is required')

  return errors
}
