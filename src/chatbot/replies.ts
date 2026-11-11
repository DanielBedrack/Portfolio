import type { ChatLanguage } from './types'

interface ReplyCopy {
  readonly identityPrefix: string
  readonly experienceIntro: string
  readonly skillsIntro: string
  readonly projectsIntro: string
  readonly projectRole: string
  readonly projectTechnologies: string
  readonly projectOutcome: string
  readonly unknown: string
  readonly contact: string
  readonly jobEvidence: string
  readonly jobGaps: string
  readonly noEvidence: string
  readonly noGaps: string
  readonly invalid: string
  readonly suggestedQuestions: readonly string[]
  readonly followUpQuestions: readonly string[]
}

export const replyCopy: Readonly<Record<ChatLanguage, ReplyCopy>> = {
  en: {
    identityPrefix: "Daniel's approved professional title is",
    experienceIntro: "Daniel's approved experience includes:",
    skillsIntro: 'The approved portfolio lists these skills and technologies:',
    projectsIntro: 'The portfolio includes these projects:',
    projectRole: 'Role',
    projectTechnologies: 'Technologies',
    projectOutcome: 'Outcome',
    unknown:
      "I don't know that from the approved portfolio information. I can help with Daniel's experience, skills, projects, or job fit.",
    contact: 'You can contact Daniel directly by email.',
    jobEvidence: 'Evidence in the portfolio',
    jobGaps: 'Not evidenced in the approved portfolio',
    noEvidence: 'No direct match was found in the approved portfolio information.',
    noGaps: 'No recognized requirement was found that is absent from the approved portfolio.',
    invalid: 'Please enter a meaningful question.',
    suggestedQuestions: [
      "What is Daniel's professional experience?",
      'Which technologies does Daniel use?',
      'Tell me about a portfolio project.',
    ],
    followUpQuestions: [
      'Which requirements are essential rather than optional?',
      'What outcomes would define success in this role?',
    ],
  },
  he: {
    identityPrefix: 'התפקיד המקצועי המאושר של דניאל הוא',
    experienceIntro: 'הניסיון המקצועי המאושר של דניאל כולל:',
    skillsIntro: 'הכישורים והטכנולוגיות המופיעים בתיק העבודות:',
    projectsIntro: 'הפרויקטים המופיעים בתיק העבודות:',
    projectRole: 'תפקיד',
    projectTechnologies: 'טכנולוגיות',
    projectOutcome: 'תוצאה',
    unknown:
      'המידע הזה אינו מופיע בתיק העבודות המאושר. אפשר לשאול אותי על הניסיון, הכישורים, הפרויקטים או ההתאמה של דניאל למשרה.',
    contact: 'אפשר ליצור קשר עם דניאל ישירות באימייל.',
    jobEvidence: 'ראיות מתיק העבודות',
    jobGaps: 'לא נמצא בתיק העבודות המאושר',
    noEvidence: 'לא נמצאה התאמה ישירה במידע המאושר של תיק העבודות.',
    noGaps: 'לא זוהתה דרישה מוכרת שאינה מופיעה בתיק העבודות המאושר.',
    invalid: 'נא להזין שאלה בעלת תוכן.',
    suggestedQuestions: [
      'מה הניסיון המקצועי של דניאל?',
      'באילו טכנולוגיות דניאל משתמש?',
      'ספר לי על פרויקט מתיק העבודות.',
    ],
    followUpQuestions: [
      'אילו דרישות הן חובה ואילו רק יתרון?',
      'אילו תוצאות ייחשבו הצלחה בתפקיד?',
    ],
  },
}
