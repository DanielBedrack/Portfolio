import type { Project } from './types'

export const projects: readonly Project[] = [
  {
    slug: 'megureit',
    title: 'Integrated CRM Ecosystem for Megureit',
    shortTitle: 'Megureit CRM Ecosystem',
    clientDisplayName: 'Megureit',
    status: 'completed',
    summary:
      'A connected operational system for apartment interest, customers, apartments and contracts across multiple departments.',
    role:
      'Led discovery, process characterization, CRM design and configuration, integrations, testing, training, implementation and ongoing support.',
    collaboration:
      'One additional developer assisted with Fireberry-Priority synchronization and iframe screens.',
    context: {
      heading: 'Context and business problem',
      paragraphs: [
        'Customer service, contracts, property managers and the VP of Operations needed a shared way to manage apartment interest, customers, apartments and contracts.',
      ],
    },
    constraints: {
      heading: 'Constraints',
      paragraphs: [
        'The solution had to connect live operational systems without exposing private customer data or disrupting work already in progress.',
      ],
    },
    flow: ['Priority', 'Fireberry CRM', 'VoiceCenter', 'ManyChat', 'iframe workflows'],
    challenge:
      'Maintaining reliable Fireberry-Priority synchronization as live data continued to grow and change.',
    solution: {
      heading: 'How the challenge was addressed',
      paragraphs: [
        'The integration used unique identifiers, duplicate prevention, bidirectional updates, logging, error handling and retry mechanisms.',
        'Purpose-built iframe screens improved usability for the people operating the system.',
      ],
    },
    technologies: ['Fireberry CRM', 'Priority', 'VoiceCenter', 'ManyChat', 'Make.com', 'iframe'],
    outcome:
      'Centralized information across systems and departments, reduced duplicate entry and operational errors, and created a shared view of leads, customers, apartments and contracts.',
  },
  {
    slug: 'financial-document-automation',
    title: 'AI-Powered Financial Document Processing for a Solar Energy Company',
    shortTitle: 'AI Financial Document Processing',
    clientDisplayName: 'Solar energy company',
    status: 'completed',
    summary:
      'An AI-assisted workflow that turns financial emails and attachments into structured monday.com records for human review.',
    role:
      'Owned business analysis, solution design, development, testing, delivery and deployment.',
    context: {
      heading: 'Context and business problem',
      paragraphs: [
        'An employee manually found, reviewed and organized financial emails and attachments in Gmail before consequential supplier actions could move forward.',
      ],
    },
    constraints: {
      heading: 'Constraints',
      paragraphs: [
        'The client identity remains confidential, exact time savings were not measured and consequential actions still require human approval.',
      ],
    },
    flow: ['Gmail', 'Make.com', 'OCR', 'OpenAI', 'monday.com', 'Human approval'],
    challenge: 'Inaccurate extraction from varied financial documents.',
    solution: {
      heading: 'How the challenge was addressed',
      paragraphs: [
        'Prompts were refined around the expected document structure and required fields were validated before a record could move to review.',
      ],
    },
    technologies: ['Make.com', 'Gmail', 'monday.com', 'OpenAI', 'OCR'],
    outcome:
      "The employee's work shifted from manually organizing the inbox to reviewing structured records and approving consequential actions.",
  },
  {
    slug: 'remindme',
    title: 'RemindMe — Location-Aware Shopping Assistant',
    shortTitle: 'RemindMe',
    status: 'work-in-progress',
    summary:
      'A multilingual shopping assistant designed to remind people about easy-to-forget purchases near relevant stores.',
    role:
      'Designed and developed independently using an AI-assisted development workflow with OpenAI Codex.',
    context: {
      heading: 'Context and product problem',
      paragraphs: [
        'Small purchases are often remembered only after arriving home. RemindMe connects a shopping list with store categories, location and movement toward home.',
      ],
    },
    constraints: {
      heading: 'Constraints',
      paragraphs: [
        'The project uses free speech-recognition options whose accuracy varies, and mobile background behavior still requires on-device validation.',
      ],
    },
    flow: ['Voice or text entry', 'Adaptive parsing', 'Shopping list', 'Nearby-store discovery', 'Location-aware reminder'],
    challenge:
      'Free speech-recognition services could mishear Hebrew product names or combine multiple products into one result.',
    solution: {
      heading: 'How the challenge was addressed',
      paragraphs: [
        'An adaptive processing layer separates product names, quantities and units, applies a personal correction dictionary and can fall back to local Whisper Tiny when browser recognition returns no text.',
        'The complete flow was tested with Daniel’s own Hebrew speech, including multiple products in one sentence. No speech-recognition model was trained.',
      ],
    },
    technologies: ['Expo', 'React Native', 'TypeScript', 'Firebase Authentication', 'Firestore', 'OpenStreetMap', 'Whisper Tiny'],
    outcome:
      'The repository supports list, map, history and profile flows; multilingual and RTL behavior; configurable radius; and adaptive multi-item voice entry.',
    verificationLimits: [
      'Reliable background notifications on a real Android or iPhone device were not verified as completed functionality.',
      'Final native identifiers and mobile authentication configuration were not verified as completed functionality.',
    ],
    links: [{ label: 'View repository', href: 'https://github.com/DanielBedrack/remind-me' }],
  },
]

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug)
}
