export type ChatLanguage = 'he' | 'en'

export type ChatIntent =
  | 'identity'
  | 'experience'
  | 'skills'
  | 'projects'
  | 'project_detail'
  | 'job_match'
  | 'contact'
  | 'unknown'

export type ChatRequestType = 'chat' | 'job_match'

export interface ChatRequest {
  readonly message: string
  readonly language?: ChatLanguage
  readonly requestType?: ChatRequestType
}

export interface StaticChatAnswer {
  readonly answer: string
  readonly language: ChatLanguage
  readonly intent: ChatIntent
  readonly suggestedQuestions: readonly string[]
  readonly projectSlug?: string
}

export interface JobMatchResult {
  readonly language: ChatLanguage
  readonly evidence: readonly string[]
  readonly gaps: readonly string[]
  readonly followUpQuestions: readonly string[]
}
