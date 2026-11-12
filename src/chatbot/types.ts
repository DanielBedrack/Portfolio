export type ChatLanguage = 'he' | 'en'

export type ChatIntent =
  | 'greeting'
  | 'identity'
  | 'experience'
  | 'skills'
  | 'projects'
  | 'project_detail'
  | 'job_match'
  | 'contact'
  | 'unknown'

export type ChatRequestType = 'chat' | 'job_match'

export interface ChatContext {
  readonly previousIntent?: ChatIntent
  readonly previousProjectSlug?: string
}

export interface ChatRequest {
  readonly message: string
  readonly language?: ChatLanguage
  readonly requestType?: ChatRequestType
  readonly context?: ChatContext
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
