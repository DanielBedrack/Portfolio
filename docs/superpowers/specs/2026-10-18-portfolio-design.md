# Daniel Bedrack Portfolio - Design Specification

Date: 18 October 2026
Status: Approved by Daniel on 18 October 2026

## 1. Purpose

Create an English-only professional portfolio for salaried roles in Israeli companies. The site must position Daniel as an AI and automation developer who also leads technical projects end to end. Software development is a supporting technical foundation rather than the primary claim of professional experience.

The site should let a recruiter understand Daniel's positioning and strongest evidence in less than one minute, while giving technical hiring managers enough depth to evaluate his decisions, implementation work and delivery responsibilities.

## 2. Audience

Primary audiences:

- Recruiters hiring for AI automation, systems integration and automation-development roles
- Hiring managers seeking a hands-on technical project manager
- Technical reviewers evaluating software-development fundamentals and problem-solving ability

The initial market is Israel. All public site copy will be in English.

## 3. Positioning

Primary title:

> AI & Automation Developer | Technical Project Manager

Primary value proposition:

> I turn complex business processes into reliable automation systems - combining hands-on development with end-to-end technical project management.

Availability statement:

> Based in Israel · Open to full-time opportunities

Optimate must be presented as previous employment from March 2025 through September 2026. The site must not state or imply that Daniel currently works there.

## 4. Site Structure

The portfolio will use a hybrid structure:

- One concise homepage containing Daniel's complete high-level professional story
- Three featured project cards on the homepage
- One dedicated case-study page for each featured project
- A downloadable, updated CV
- Direct links to LinkedIn, GitHub and email
- A custom 404 page

Homepage order:

1. Navigation
2. Hero and primary calls to action
3. Featured Work
4. How I Work
5. Professional Experience
6. Skills
7. Education
8. Contact

Primary calls to action:

- View My Work
- Download Resume
- Contact Me

## 5. Visual Direction

Selected direction: Calm Operator.

The visual system will feel warm, mature, clear and human. It should communicate technical competence without resembling a generic dark developer template.

Core characteristics:

- Warm off-white background
- Deep green primary text and interface color
- Muted terracotta accent
- Serif display typography paired with a highly readable sans-serif body typeface
- Generous whitespace
- Soft borders and restrained rounded corners
- Editorial hierarchy with practical, system-oriented details

Avoid:

- Neon technology aesthetics
- Heavy gradients
- Excessive glassmorphism
- Dense dashboards
- Decorative animation that competes with the content
- Generic AI-generated illustrations

## 6. Homepage Layout

Selected layout: Work First.

The hero will contain Daniel's name, title, value proposition, location and availability. Featured projects will appear immediately after the hero so hiring teams encounter evidence before a longer biography.

The first project card, Megureit, will receive greater visual weight because it best combines automation, systems integration and project leadership. The financial-document automation and RemindMe will appear as supporting projects with distinct summaries.

The personal story, process and experience will remain visible farther down the same page. A professional portrait may be added later as a supporting element, but it is not required for the approved initial layout.

## 7. Navigation and Interaction

Desktop navigation:

- Daniel Bedrack
- Work
- Experience
- Contact

Mobile navigation will be compact and keyboard accessible. Project cards will stack into one column. No page may require horizontal scrolling.

Interaction principles:

- Clear focus and hover states
- Smooth in-page navigation
- Subtle content entrances and card feedback
- Full support for `prefers-reduced-motion`
- No scroll hijacking, custom cursor or autoplay media

Each case study will include a clear route back to all projects and a contact call to action at the end.

## 8. Case Study Template

Every case-study page will follow the same structure:

- Project summary
- Context and business problem
- Daniel's role and collaborators
- Constraints
- Solution and system flow
- Key technical or operational challenge
- How the challenge was addressed
- Technologies
- Outcome
- Verification limits or work-in-progress status
- Related links when safe to publish

Claims must distinguish verified facts, Daniel's firsthand account and unfinished functionality. No metrics will be invented.

## 9. Featured Project: Megureit

Working title:

> Integrated CRM Ecosystem for Megureit

Client context: Megureit, a real-estate company.

Business scope:

- Apartment-interest and lead management
- Customer and apartment management
- Contract management
- Shared workflows for customer service, contracts, property managers and the VP of Operations

Systems:

- Fireberry CRM
- Priority
- VoiceCenter
- ManyChat
- Make.com
- iframe screens that improved usability

Daniel led discovery, process characterization, CRM design and configuration, integrations, testing, training, implementation and ongoing support. One additional developer assisted with Fireberry-Priority synchronization and iframe screens. The public case study must preserve this collaboration boundary.

Outcomes will be qualitative unless evidence for exact metrics is later supplied:

- Centralized information across systems and departments
- Reduced duplicate entry
- Improved tracking of leads, customers, apartments and contracts
- Reduced operational errors
- Created a shared operational view

Primary challenge: maintaining reliable Fireberry-Priority synchronization as live data continued to grow and change.

Techniques described by Daniel:

- Unique identifiers
- Duplicate prevention
- Bidirectional updates
- Logging
- Error handling
- Retry mechanisms

The repository is private. Public content must not expose credentials, customer data or private implementation artifacts.

## 10. Featured Project: AI Financial Document Processing

Working title:

> AI-Powered Financial Document Processing for a Solar Energy Company

The client name will remain confidential.

Before the automation, an employee manually found, reviewed and organized financial emails and attachments in Gmail. The implemented workflow used OCR and OpenAI to classify documents, extract required information and create structured monday.com items for human review and approval.

Technology currently identified:

- Make.com
- Gmail
- monday.com
- OpenAI
- OCR

Google Cloud Vision is a probable OCR provider but must not be published as fact until Daniel verifies it.

Daniel owned business analysis, solution design, development, testing, delivery and deployment. The primary quality issue was inaccurate extraction. He addressed it through prompt refinement and required-field validation.

The outcome will be described without unsupported time or volume estimates: the employee's task changed from manual inbox organization to reviewing structured records and approving consequential actions.

## 11. Featured Project: RemindMe

Working title:

> RemindMe - Location-Aware Shopping Assistant

Public status: Work in Progress.

The product addresses small purchases that people remember only after reaching home. Users add items, assign store categories and receive reminders when approaching a relevant store, optionally while moving toward home.

Implemented or repository-supported capabilities:

- Expo and React Native application with web support
- Firebase Authentication and Firestore synchronization
- OpenStreetMap-based address and nearby-store discovery
- Configurable notification radius
- Homeward-movement assessment with GPS-noise rejection
- Shopping list, map, history and profile
- English, Hebrew and Spanish localization
- RTL support
- Multi-item voice entry
- Parsing of product names, quantities and units
- Personal correction dictionary
- Local Whisper Tiny fallback when browser speech recognition returns no text

Accuracy statement:

Daniel did not train a speech-recognition model. He designed an adaptive processing layer around limitations in free speech-recognition services. He tested the complete flow with his own Hebrew speech, including multiple products in one sentence.

Authorship statement:

> Designed and developed independently using an AI-assisted development workflow with OpenAI Codex.

Verification completed on 18 October 2026:

- 27 automated tests passed
- TypeScript checking passed
- Web production export passed
- The public demo returned HTTP 200

Not verified for publication as completed functionality:

- Reliable background notifications on a real Android or iPhone device
- Final native identifiers and mobile authentication configuration

## 12. Experience and Education

Experience summaries:

- Optimate, Automation Developer and Technical Project Manager, March 2025 - September 2026
- Tesla, Delivery Advisor, February 2024 - March 2025
- Sela College, Coding Support and Assignment Reviewer, March 2023 - February 2024

Education summaries:

- Software Development Program, Sela College / Lohamim Le'Hightech, March 2022 - July 2023
- Advanced Software Program / Yahalom, March 2023 - July 2023

The website must use an updated CV that also shows Optimate ending in September 2026.

## 13. Technical Architecture

Selected stack:

- React
- TypeScript
- Vite
- React Router
- GitHub Actions
- GitHub Pages for initial hosting

The portfolio will be a static site with no application backend or database.

Content architecture:

- A typed local project-data module will contain shared case-study metadata
- Homepage cards and case-study pages will read from the same source of truth
- Longer case-study sections may be stored as focused React components or typed content modules
- Resume and approved media will be versioned assets

Routing:

- `/`
- `/projects/megureit`
- `/projects/financial-document-automation`
- `/projects/remindme`
- A catch-all 404 route

Deployment will use GitHub Actions. Production deployment must occur only after Daniel reviews and approves the local build. A custom domain may be connected later.

## 14. Contact and Privacy

The initial site will not store visitor data.

Contact behavior:

- Email action using a `mailto:` link with a useful subject
- LinkedIn profile link
- GitHub profile link

No third-party analytics will be included at launch. No client name, screenshot, workflow data or internal detail will be published without permission.

External links will use safe attributes when opening a new tab. Email and phone details will be included only when Daniel approves the final public contact set.

## 15. Error Handling

- Custom 404 page with routes back to the homepage and projects
- Text fallback and descriptive alternative text for images
- No project link will be rendered without a valid route
- Missing optional media will fall back to a text-first project presentation
- Build-time validation will check required project fields
- External and downloadable links will be checked before release

The core story must remain understandable if decorative media fails to load.

## 16. Accessibility and Responsive Design

- Semantic landmarks and heading order
- Keyboard-accessible navigation and controls
- Visible focus indicators
- Sufficient color contrast
- Descriptive link labels and image alternative text
- Touch targets suitable for mobile use
- Responsive layouts without horizontal scrolling
- Motion reduction through `prefers-reduced-motion`
- Testing at narrow mobile, tablet and desktop widths

## 17. SEO and Sharing

Each route will define:

- Unique page title
- Meta description
- Canonical URL once the production URL is known
- Open Graph and social-sharing metadata
- Share image using the approved visual system

The site will also include a sitemap, robots metadata and structured professional-profile data where appropriate. Search copy must stay natural and must not repeat keywords unnaturally.

## 18. Testing and Release Gates

Automated checks:

- TypeScript
- Linting
- Unit and component tests for content rendering and navigation
- Build validation
- Route and required-field checks

Browser checks:

- Homepage and all case-study routes
- Custom 404 behavior
- CV download
- Email, GitHub and LinkedIn links
- Mobile, tablet and desktop layouts
- Keyboard navigation
- Reduced-motion behavior
- Major current browsers

Release checks:

- Lighthouse review for performance, accessibility, best practices and SEO
- No console errors
- No broken links
- No credentials, customer data or unapproved private information
- Daniel's explicit approval of the final local preview before publication

## 19. Out of Scope for the Initial Release

- Blog or content-management system
- Admin dashboard
- Database or server-side contact processing
- Authentication
- Visitor analytics
- Multiple languages
- Testimonials not already approved for publication
- Detailed proprietary workflow diagrams
- Deployment before local review and approval

## 20. Success Criteria

The initial release is successful when:

- A recruiter can understand Daniel's positioning and strongest evidence in under one minute
- All three case studies clearly separate problem, responsibility, solution, challenge and outcome
- Collaboration and AI-assisted development are described honestly
- The site works on mobile and desktop and meets the accessibility requirements above
- The production build and automated checks pass
- Daniel approves the final content and local visual presentation
- The published site contains no unsupported claims or confidential material
