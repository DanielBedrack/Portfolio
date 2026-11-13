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
  greeting: ['hi', 'hello', 'hey', 'היי', 'הי', 'שלום'],
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

const SIMPLE_GREETINGS = new Set(INTENT_TERMS.greeting.map((term) => normalizeSimpleGreeting(term)))

const PROJECT_FOLLOW_UPS = new Set([
  'ספר לעומק',
  'ספר עוד',
  'אפשר עוד פרטים',
  'tell me more',
  'more details',
].map((term) => normalize(term)))

const AMBIGUOUS_FOLLOW_UPS = new Set([
  'ספר לי',
  'תספר לי',
  'תמשיך',
  'tell me',
  'go on',
  'continue',
].map((term) => normalize(term)))

const HEBREW_PROJECT_COPY: Readonly<Record<string, {
  readonly title: string
  readonly summary: string
  readonly role: string
  readonly outcome: string
}>> = {
  'real-estate-company': {
    title: 'מערכת CRM משולבת לחברת נדל״ן',
    summary: 'מערכת תפעולית משולבת לניהול מתעניינים בדירות, לקוחות, נכסים, חוזים ודוחות הנהלה.',
    role: 'הובלת אפיון, תכנון והגדרת ה־CRM, הרשאות, מסכים, אינטגרציות, בדיקות, הדרכה, הטמעה ותמיכה.',
    outcome: 'ריכוז מידע בין מערכות ומחלקות, צמצום הזנה כפולה ושגיאות ושיפור המעקב.',
  },
  'financial-document-automation': {
    title: 'מערכת תפעול לחברת אנרגיה סולארית',
    summary: 'מערכת monday.com חוצת מחלקות עם לוחות ואוטומציות מותאמים למכירות, תפעול וכספים.',
    role: 'אחריות על ניתוח עסקי, תכנון הפתרון, פיתוח, בדיקות, מסירה והטמעה.',
    outcome: 'יצירת תהליך תפעולי משותף והעברת עבודה פיננסית מארגון ידני לבדיקת רשומות מובנות.',
  },
  remindme: {
    title: 'RemindMe — עוזר קניות מבוסס מיקום',
    summary: 'עוזר קניות רב־לשוני שמזכיר רכישות שקל לשכוח בקרבת חנויות רלוונטיות.',
    role: 'תכנון ופיתוח עצמאי בעזרת תהליך פיתוח משולב AI עם OpenAI Codex.',
    outcome: 'המאגר תומך ברשימה, מפה, היסטוריה, פרופיל, RTL והזנת קול מרובת פריטים.',
  },
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

function normalizeSimpleGreeting(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

export function isSimpleGreeting(message: string): boolean {
  const normalized = normalizeSimpleGreeting(message)
  return SIMPLE_GREETINGS.has(normalized) ||
    /^(?:הי+|היוש+|שלום+)$/u.test(normalized) ||
    /^(?:hi+|hey+|hello+)(?: there)?$/u.test(normalized)
}

function containsTerm(haystack: string, term: string): boolean {
  const normalizedTerm = normalize(term)
  return ` ${haystack} `.includes(` ${normalizedTerm} `)
}

function findProject(message: string) {
  const normalizedMessage = normalize(message)
  return projects.find((project) => {
    const identifiers = [project.slug, project.title, project.shortTitle]
    if (project.slug === 'real-estate-company') identifiers.push('מערכת crm', 'crm ecosystem')
    if (project.slug === 'financial-document-automation') {
      identifiers.push('solar', 'financial document', 'מערכת סולארית', 'אנרגיה סולארית')
    }
    return identifiers.some((identifier) => normalizedMessage.includes(normalize(identifier)))
  })
}

export function detectIntent(message: string): ChatIntent {
  if (findProject(message)) return 'project_detail'
  const normalizedMessage = normalize(message)
  if (isSimpleGreeting(message)) return 'greeting'
  for (const intent of ['contact', 'job_match', 'experience', 'skills', 'projects', 'identity'] as const) {
    if (INTENT_TERMS[intent].some((term) => normalizedMessage.includes(normalize(term)))) return intent
  }
  return 'unknown'
}

export function shouldClarifyTopic(request: ChatRequest): boolean {
  return request.context?.previousIntent === 'greeting' &&
    detectIntent(request.message) === 'unknown' &&
    AMBIGUOUS_FOLLOW_UPS.has(normalize(request.message))
}

function projectCopy(project: (typeof projects)[number], language: ChatLanguage) {
  if (language === 'he') return HEBREW_PROJECT_COPY[project.slug]
  return {
    title: project.title,
    summary: project.summary,
    role: project.role,
    outcome: project.outcome,
  }
}

function formatProjectDetail(project: (typeof projects)[number], language: ChatLanguage): string {
  const copy = replyCopy[language]
  const localized = projectCopy(project, language)
  return `${localized.title}\n${localized.summary}\n${copy.projectRole}: ${localized.role}\n${copy.projectTechnologies}: ${project.technologies.join(', ')}\n${copy.projectOutcome}: ${localized.outcome}`
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

  let intent = requestType === 'job_match' ? 'job_match' : detectIntent(validation.value)
  let answer: string
  let projectSlug: string | undefined

  if (shouldClarifyTopic({ ...request, message: validation.value })) {
    return {
      answer: copy.clarifyTopic,
      language,
      intent: 'greeting',
      suggestedQuestions: copy.suggestedQuestions,
    }
  }

  if (intent === 'unknown' && PROJECT_FOLLOW_UPS.has(normalize(validation.value))) {
    const previousProject = request.context?.previousProjectSlug
      ? projects.find(({ slug }) => slug === request.context?.previousProjectSlug)
      : undefined
    if (previousProject && request.context?.previousIntent === 'project_detail') {
      intent = 'project_detail'
      projectSlug = previousProject.slug
      answer = formatProjectDetail(previousProject, language)
      return { answer, language, intent, suggestedQuestions: copy.suggestedQuestions, projectSlug }
    }
    if (request.context?.previousIntent === 'projects' || request.context?.previousIntent === 'project_detail') {
      intent = 'projects'
      answer = copy.chooseProject
      return { answer, language, intent, suggestedQuestions: copy.suggestedQuestions }
    }
  }

  switch (intent) {
    case 'greeting':
      answer = copy.greeting
      break
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
        projects.map((project) => {
          const localized = projectCopy(project, language)
          return `${localized.title} — ${localized.summary}`
        }),
      )}`
      break
    case 'project_detail': {
      const project = findProject(validation.value)
      if (!project) {
        answer = copy.unknown
        break
      }
      projectSlug = project.slug
      answer = formatProjectDetail(project, language)
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
