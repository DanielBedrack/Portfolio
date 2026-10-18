export type ProjectStatus = 'completed' | 'work-in-progress'

export interface ProjectSection {
  readonly heading: string
  readonly paragraphs: readonly string[]
}

export interface ProjectLink {
  readonly label: string
  readonly href: string
}

export interface ProjectImage {
  readonly src: string
  readonly alt: string
}

export interface Project {
  readonly slug: string
  readonly title: string
  readonly shortTitle: string
  readonly clientDisplayName?: string
  readonly status: ProjectStatus
  readonly summary: string
  readonly role: string
  readonly collaboration?: string
  readonly context: ProjectSection
  readonly constraints: ProjectSection
  readonly flow: readonly string[]
  readonly challenge: string
  readonly solution: ProjectSection
  readonly technologies: readonly string[]
  readonly outcome: string
  readonly verificationLimits?: readonly string[]
  readonly links?: readonly ProjectLink[]
  readonly image?: ProjectImage
}

export interface ExperienceItem {
  readonly company: string
  readonly role: string
  readonly start: string
  readonly end: string
  readonly summary: string
}

export interface EducationItem {
  readonly program: string
  readonly institution: string
  readonly start: string
  readonly end: string
}

export interface Profile {
  readonly name: string
  readonly title: string
  readonly valueProposition: string
  readonly availability: string
  readonly email: string
  readonly linkedIn: string
  readonly github: string
  readonly process: readonly string[]
  readonly howIWork: readonly ProjectSection[]
  readonly experience: readonly ExperienceItem[]
  readonly education: readonly EducationItem[]
  readonly skills: readonly string[]
}
