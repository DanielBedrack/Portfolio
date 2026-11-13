import { detectIntent } from './staticEngine'
import type { ChatIntent, ChatLanguage } from './types'

export interface QuickReply {
  readonly label: string
  readonly question: string
}

type QuickReplyKey = 'experience' | 'skills' | 'projects' | 'jobMatch' | 'contact' | 'crm' | 'solar' | 'remindme'

const quickReplyCopy: Readonly<Record<ChatLanguage, Record<QuickReplyKey, QuickReply>>> = {
  en: {
    experience: { label: 'Professional experience', question: "What is Daniel's professional experience?" },
    skills: { label: 'Skills and technologies', question: 'Which technologies does Daniel use?' },
    projects: { label: 'Selected projects', question: 'Tell me about a portfolio project.' },
    jobMatch: { label: 'Fit for a role', question: 'How can I check whether Daniel fits a role?' },
    contact: { label: 'Contact Daniel', question: 'How can I contact Daniel?' },
    crm: { label: 'CRM ecosystem', question: 'Tell me about the CRM ecosystem project.' },
    solar: { label: 'Solar operations', question: 'Tell me about the solar operations project.' },
    remindme: { label: 'RemindMe', question: 'Tell me about RemindMe.' },
  },
  he: {
    experience: { label: 'ניסיון מקצועי', question: 'מה הניסיון המקצועי של דניאל?' },
    skills: { label: 'כישורים וטכנולוגיות', question: 'באילו טכנולוגיות דניאל משתמש?' },
    projects: { label: 'פרויקטים נבחרים', question: 'ספר לי על פרויקט מתיק העבודות.' },
    jobMatch: { label: 'התאמה למשרה', question: 'איך אפשר לבדוק את ההתאמה של דניאל למשרה?' },
    contact: { label: 'יצירת קשר', question: 'איך אפשר ליצור קשר עם דניאל?' },
    crm: { label: 'מערכת CRM', question: 'ספר לי על מערכת CRM של דניאל.' },
    solar: { label: 'מערכת סולארית', question: 'ספר לי על מערכת התפעול לחברת האנרגיה הסולארית.' },
    remindme: { label: 'RemindMe', question: 'ספר לי על RemindMe של דניאל.' },
  },
}

const repliesByIntent: Readonly<Record<ChatIntent, readonly QuickReplyKey[]>> = {
  greeting: ['experience', 'skills', 'projects'],
  identity: ['experience', 'skills', 'projects'],
  experience: ['projects', 'skills', 'jobMatch'],
  skills: ['projects', 'experience', 'jobMatch'],
  projects: ['crm', 'solar', 'remindme'],
  project_detail: ['projects', 'experience', 'jobMatch'],
  job_match: ['experience', 'projects', 'contact'],
  contact: ['experience', 'skills', 'projects'],
  unknown: ['experience', 'skills', 'projects'],
}

export function getQuickReplies(
  message: string | undefined,
  language: ChatLanguage,
  intentOverride?: ChatIntent,
): readonly QuickReply[] {
  const intent = intentOverride ?? (message ? detectIntent(message) : 'unknown')
  return repliesByIntent[intent].map((key) => quickReplyCopy[language][key])
}
