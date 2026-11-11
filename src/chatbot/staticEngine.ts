import { profile } from '../content/profile'
import { projects } from '../content/projects'
import { detectChatLanguage } from './language'
import { replyCopy } from './replies'
import type {
  ChatIntent,
  ChatLanguage,
  ChatRequest,
  ChatRequestType,
  JobMatchResult,
  StaticChatAnswer,
} from './types'

const INPUT_LIMITS: Readonly<Record<ChatRequestType, number>> = {
  chat: 2_000,
  job_match: 6_000,
}

const INTENT_TERMS: Readonly<Record<Exclude<ChatIntent, 'project_detail' | 'unknown'>, readonly string[]>> = {
  identity: ['who are', 'who is daniel', 'professional title', 'role', 'מי אתה', 'מי זה דניאל', 'תפקיד'],
  experience: [
    'experience',
    'worked',
    'where did daniel work',
    'work history',
    'employment',
    'career',
    'ניסיון',
    'עבד',
    'קריירה',
  ],
  skills: ['skill', 'technolog', 'stack', 'tool', 'כישור', 'טכנולוג', 'כלים'],
  projects: ['projects', 'portfolio', 'case stud', 'פרויקטים', 'תיק העבודות', 'מקרי בוחן'],
  job_match: ['job fit', 'job description', 'match this role', 'התאמה למשרה', 'תיאור משרה'],
  contact: ['contact', 'email', 'reach daniel', 'יצירת קשר', 'אימייל', 'מייל'],
}

const GAP_CATALOG: Readonly<Record<string, readonly string[]>> = {
  AWS: ['aws', 'amazon web services'],
  Azure: ['azure'],
  Kubernetes: ['kubernetes', 'k8s'],
  Docker: ['docker'],
  Java: ['java'],
  'C#': ['c#', 'c sharp'],
  Go: ['golang'],
  Angular: ['angular'],
  Vue: ['vue', 'vue.js'],
}

function normalize(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}#+.]+/gu, ' ').trim()
}

function containsTerm(haystack: string, term: string): boolean {
  const normalizedTerm = normalize(term)
  return ` ${haystack} `.includes(` ${normalizedTerm} `)
}

function findProject(message: string) {
  const normalizedMessage = normalize(message)
  return projects.find((project) => {
    const identifiers = [project.slug, project.title, project.shortTitle]
    if (project.slug === 'financial-document-automation') identifiers.push('solar', 'financial document')
    return identifiers.some((identifier) => normalizedMessage.includes(normalize(identifier)))
  })
}

function detectIntent(message: string): ChatIntent {
  if (findProject(message)) return 'project_detail'
  const normalizedMessage = normalize(message)
  for (const intent of ['contact', 'job_match', 'experience', 'skills', 'projects', 'identity'] as const) {
    if (INTENT_TERMS[intent].some((term) => normalizedMessage.includes(normalize(term)))) return intent
  }
  return 'unknown'
}

function formatList(items: readonly string[]): string {
  return items.map((item) => `• ${item}`).join('\n')
}

export function validateChatInput(
  message: string,
  requestType: ChatRequestType,
): { ok: true; value: string } | { ok: false; reason: 'empty' | 'too_long' } {
  const value = message.replace(/\p{C}/gu, '').trim()
  if (!value) return { ok: false, reason: 'empty' }
  if (Array.from(value).length > INPUT_LIMITS[requestType]) return { ok: false, reason: 'too_long' }
  return { ok: true, value }
}

export function analyzeStaticJobMatch(
  description: string,
  language: ChatLanguage,
): JobMatchResult {
  const normalizedDescription = normalize(description)
  const approvedTechnologies = new Map<string, string>()

  for (const item of [
    ...profile.skills,
    ...projects.flatMap((project) => project.technologies),
  ]) {
    const key = normalize(item)
    if (!approvedTechnologies.has(key)) approvedTechnologies.set(key, item)
  }

  const approvedRoles = profile.title
    .split('|')
    .map((role) => role.trim())
    .filter(Boolean)

  const evidence = [
    ...Array.from(approvedTechnologies.entries())
    .filter(([key]) => containsTerm(normalizedDescription, key))
      .map(([, label]) => label),
    ...approvedRoles.filter((role) => containsTerm(normalizedDescription, role)),
  ]

  const gaps = Object.entries(GAP_CATALOG)
    .filter(([, aliases]) => aliases.some((alias) => containsTerm(normalizedDescription, alias)))
    .filter(([label]) => !approvedTechnologies.has(normalize(label)))
    .map(([label]) => label)

  return {
    language,
    evidence,
    gaps,
    followUpQuestions: replyCopy[language].followUpQuestions,
  }
}

export function answerStaticChat(request: ChatRequest): StaticChatAnswer {
  const language = request.language ?? detectChatLanguage(request.message)
  const copy = replyCopy[language]
  const requestType = request.requestType ?? 'chat'
  const validation = validateChatInput(request.message, requestType)

  if (!validation.ok) {
    return {
      answer: copy.invalid,
      language,
      intent: 'unknown',
      suggestedQuestions: copy.suggestedQuestions,
    }
  }

  const intent = requestType === 'job_match' ? 'job_match' : detectIntent(validation.value)
  let answer: string
  let projectSlug: string | undefined

  switch (intent) {
    case 'identity':
      answer = `${copy.identityPrefix} ${profile.title}. ${profile.valueProposition}`
      break
    case 'experience':
      answer = `${copy.experienceIntro}\n${formatList(
        profile.experience.map(
          (item) => `${item.company} — ${item.role}, ${item.start}–${item.end}. ${item.summary}`,
        ),
      )}`
      break
    case 'skills':
      answer = `${copy.skillsIntro}\n${formatList(profile.skills)}`
      break
    case 'projects':
      answer = `${copy.projectsIntro}\n${formatList(
        projects.map((project) => `${project.title} — ${project.summary}`),
      )}`
      break
    case 'project_detail': {
      const project = findProject(validation.value)
      if (!project) {
        answer = copy.unknown
        break
      }
      projectSlug = project.slug
      answer = `${project.title}\n${project.summary}\n${copy.projectRole}: ${project.role}\n${copy.projectTechnologies}: ${project.technologies.join(', ')}\n${copy.projectOutcome}: ${project.outcome}`
      break
    }
    case 'job_match': {
      const result = analyzeStaticJobMatch(validation.value, language)
      answer = `${copy.jobEvidence}:\n${
        result.evidence.length ? formatList(result.evidence) : copy.noEvidence
      }\n${copy.jobGaps}:\n${
        result.gaps.length ? formatList(result.gaps) : copy.noGaps
      }\n${formatList(result.followUpQuestions)}`
      break
    }
    case 'contact':
      answer = `${copy.contact} mailto:${profile.email}?subject=Portfolio%20inquiry`
      break
    default:
      answer = copy.unknown
  }

  return {
    answer,
    language,
    intent,
    suggestedQuestions: copy.suggestedQuestions,
    ...(projectSlug ? { projectSlug } : {}),
  }
}
