import type { Project } from './types'

export const projects: readonly Project[] = [
  {
    slug: 'megureit',
    title: 'Integrated CRM Ecosystem for Megureit',
    shortTitle: 'Megureit CRM Ecosystem',
    clientDisplayName: 'Real-estate company',
    status: 'completed',
    summary:
      'A scalable, role-aware CRM ecosystem for apartment interest, customers, properties, contracts and management reporting.',
    role:
      'Led discovery, process characterization, CRM design and configuration, permission planning, role-specific screens, integrations, testing, training, implementation and ongoing support. Built the integration and business-logic layer in Make.com.',
    collaboration:
      'One additional developer assisted with Fireberry-Priority synchronization and custom iframe interface development.',
    context: {
      heading: 'Context and business problem',
      paragraphs: [
        'Customer service, contracts, property managers and the VP of Operations needed a shared way to manage apartment interest, customers, properties and contracts.',
        'Leadership also used the system to monitor operational activity through dashboards.',
      ],
    },
    constraints: {
      heading: 'Constraints',
      paragraphs: [
        'The solution had to connect live operational systems, enforce appropriate permissions for each role and remain scalable as the volume of operational data continued to grow.',
      ],
    },
    flow: [
      'Priority',
      'Make.com integrations and logic',
      'Fireberry CRM',
      'VoiceCenter and ManyChat',
      'Custom iframe interfaces embedded inside the CRM platform',
    ],
    challenge:
      'Maintaining reliable synchronization, permissions and usable workflows in a system whose data continued to grow and change.',
    solution: {
      heading: 'How the challenge was addressed',
      paragraphs: [
        'Make.com handled the integrations and workflow logic, using unique identifiers, duplicate prevention, bidirectional updates, logging, error handling and retry mechanisms.',
        'A permission model and role-specific screens gave each team a focused working environment while preserving leadership visibility through dashboards.',
        'Custom iframe interfaces embedded inside the CRM platform improved usability and were hosted on Vercel.',
      ],
    },
    technologies: [
      'Fireberry CRM',
      'Priority',
      'Make.com',
      'VoiceCenter',
      'ManyChat',
      'Custom iframe interfaces',
      'Vercel',
    ],
    outcome:
      'Centralized information across systems and departments, reduced duplicate entry and operational errors, supported a growing data set, and gave both operational teams and leadership role-appropriate views of customers, properties, contracts and performance.',
  },
  {
    slug: 'financial-document-automation',
    title: 'Cross-Department Operations System for a Solar Energy Company',
    shortTitle: 'Solar Operations System',
    clientDisplayName: 'Solar energy company',
    status: 'completed',
    summary:
      'A cross-department monday.com system with tailored boards and automations that moved customers through sales, operations and finance.',
    role:
      'Owned business analysis, solution design, development, testing, delivery and deployment.',
    context: {
      heading: 'Context and business problem',
      paragraphs: [
        'Sales, operations and finance needed one connected system to move each customer through the company flow with clear ownership and consistent handoffs.',
      ],
    },
    constraints: {
      heading: 'Constraints',
      paragraphs: [
        'The client identity remains confidential, exact time savings were not measured and consequential actions still require human approval.',
      ],
    },
    flow: [
      'Sales intake',
      'monday.com customer flow',
      'Operations',
      'Finance',
      'Rivhit integration through Make.com',
      'AI-assisted financial document processing',
    ],
    challenge:
      'Coordinating reliable customer handoffs between departments while reducing manual financial administration.',
    solution: {
      heading: 'How the challenge was addressed',
      paragraphs: [
        'Tailored monday.com boards and automations supported the customer flow between sales, operations and finance, while Make.com connected the system to Rivhit.',
        'As one example of AI inside the broader project, an automation processed financial emails and attachments from Gmail, used OCR and OpenAI to extract required data, and created structured monday.com items for human review.',
        'Extraction accuracy was improved through prompt refinement and required-field validation before a record could move to review.',
      ],
    },
    technologies: ['monday.com', 'Make.com', 'Rivhit', 'Gmail', 'OpenAI', 'OCR'],
    outcome:
      'Created a shared operational flow across sales, operations and finance. Within that system, the AI document automation shifted financial work from manually organizing the inbox to reviewing structured records and approving consequential actions.',
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
