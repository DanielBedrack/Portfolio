import type { Profile } from './types'

export const profile: Profile = {
  name: 'Daniel Bedrack',
  title: 'AI & Automation Developer | Technical Project Manager',
  valueProposition:
    'I turn complex business processes into reliable automation systems — combining hands-on development with end-to-end technical project management.',
  availability: 'Based in Israel · Open to full-time opportunities',
  email: 'danielbedrack@gmail.com',
  linkedIn: 'https://www.linkedin.com/in/danielbedrack',
  github: 'https://github.com/DanielBedrack',
  process: ['Discover', 'Design', 'Build', 'Test', 'Deploy'],
  howIWork: [
    {
      heading: 'Understand the operation',
      paragraphs: [
        'I map the people, decisions and data behind a process before choosing the technology.',
      ],
    },
    {
      heading: 'Build the system',
      paragraphs: [
        'I combine configuration, integrations and code into workflows people can use and maintain.',
      ],
    },
    {
      heading: 'Deliver and improve',
      paragraphs: [
        'I test, deploy, train users and support the system as real operational data changes.',
      ],
    },
  ],
  experience: [
    {
      company: 'Optimate',
      role: 'Automation Developer and Technical Project Manager',
      start: 'March 2025',
      end: 'September 2026',
      summary:
        'Designed and delivered CRM, automation and integration projects from discovery through deployment and support.',
    },
    {
      company: 'Tesla',
      role: 'Delivery Advisor',
      start: 'February 2024',
      end: 'March 2025',
      summary:
        'Coordinated customer deliveries from purchase confirmation through handover, including CRM and case management.',
    },
    {
      company: 'Sela College',
      role: 'Coding Support and Assignment Reviewer',
      start: 'March 2023',
      end: 'February 2024',
      summary:
        'Supported software-development students and reviewed technical assignments.',
    },
  ],
  education: [
    {
      program: 'Software Development Program',
      institution: "Sela College / Lohamim Le'Hightech",
      start: 'March 2022',
      end: 'July 2023',
    },
    {
      program: 'Advanced Software Program / Yahalom',
      institution: 'Sela College',
      start: 'March 2023',
      end: 'July 2023',
    },
  ],
  skills: [
    'Make.com',
    'n8n',
    'monday.com',
    'Fireberry CRM',
    'OpenAI',
    'REST APIs',
    'Webhooks',
    'React',
    'TypeScript',
    'JavaScript',
    'Python',
    'SQL',
  ],
}
