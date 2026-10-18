# Daniel Bedrack Portfolio - Session Notes

Date: 18 October 2026

## Goal

Build an English-only professional portfolio for salaried positions in Israeli companies.

Target roles:

- AI and Automation Developer
- Technical Project Manager
- Software development as the technical foundation

The portfolio should position Daniel as someone who can understand a business process, design a technical solution, build or coordinate it, test it, deploy it, train users, and support the resulting system.

## Agreed positioning

Primary title:

> AI & Automation Developer | Technical Project Manager

Working value proposition:

> I turn complex business processes into reliable automation systems - combining hands-on development with end-to-end technical project management.

Availability line:

> Based in Israel · Open to full-time opportunities

Daniel is no longer employed by Optimate. The correct employment period is:

> March 2025 - September 2026

Do not describe Daniel as currently employed by Optimate.

## Website structure

The selected approach is a hybrid portfolio:

- A concise homepage that communicates the complete professional story quickly
- Three featured-project cards
- A dedicated case-study page for each featured project
- Experience, skills, education, CV download, GitHub, LinkedIn, email and contact sections

Proposed homepage sections:

- Hero
- Featured Work
- How I Work
- Experience
- Skills
- Education
- Contact

Proposed calls to action:

- View My Work
- Download Resume
- Contact Me

## Featured case study 1: Megureit

Working title:

> Integrated CRM Ecosystem for Megureit

Client: Megureit, a real-estate company.

Core systems:

- Fireberry CRM
- Priority
- VoiceCenter
- ManyChat
- Make.com
- iframe screens for an improved user experience

Business scope:

- Apartment-interest and lead management
- Customer and apartment management
- Contract management
- Shared workflows for customer service, contracts, property managers and the VP of Operations

Daniel's role:

- Led requirements discovery and process characterization
- Designed and configured the CRM
- Built and coordinated integrations
- Tested the system
- Trained users
- Led implementation and ongoing support

Daniel worked with one additional developer. That developer assisted with Fireberry-Priority synchronization and iframe screens. The portfolio must describe this collaboration accurately rather than claiming that every development task was completed alone.

Outcomes, without invented metrics:

- Centralized information that had been distributed across systems and departments
- Reduced duplicate data entry
- Improved tracking of leads, customers, apartments and contracts
- Reduced operational errors
- Gave multiple departments a shared, updated operational view

Key technical challenge:

- Reliable synchronization between Fireberry and Priority while the live system continued accumulating customers, properties, contracts and updates

Techniques used:

- Unique identifiers
- Duplicate prevention
- Bidirectional updates
- Logging
- Error handling
- Retry mechanisms

Repository:

https://github.com/DanielBedrack/Megureit

The repository is private. Its README confirms the Make.com and Fireberry workspace context, but Make.com blueprints and credentials are intentionally not stored in GitHub.

## Featured case study 2: AI financial-document automation

Working title:

> AI-Powered Financial Document Processing for a Solar Energy Company

The company must remain anonymous and should be described only as a solar energy company.

Problem before automation:

An employee manually reviewed and organized financial emails inside Gmail. Relevant forms, invoices and other financial documents had to be found, understood and processed manually.

Solution:

- Read relevant emails and attachments from Gmail
- Used OCR to read financial documents
- Used OpenAI to classify documents and extract important fields
- Converted unstructured email and document content into structured data
- Created monday.com items for review
- Kept a human approval step for consequential financial actions, such as approving receipt creation for a supplier

Technology:

- Make.com
- Gmail
- monday.com
- OpenAI
- OCR, probably Google Cloud Vision; this must be verified before publication

Daniel owned the work end to end:

- Business analysis
- Solution design
- Development
- Testing
- Delivery
- Deployment into the company's real workflow

Main technical issue:

- Inaccurate AI extraction

Mitigation:

- Prompt refinement
- Required-field validation before allowing the workflow to continue

Outcome, without invented hours or volume:

- Changed the employee's work from manual inbox organization to reviewing structured monday.com records and approving the next action
- Reduced repetitive sorting and centralized the relevant financial information

## Featured case study 3: RemindMe

Working title:

> RemindMe - Location-Aware Shopping Assistant

Status:

> Work in Progress

Problem:

People often remember small purchases only after arriving home. RemindMe is intended to remind the user while they are near a relevant store and travelling toward home.

Product behavior found in the repository:

- Users add shopping items and assign them to a store category
- The app discovers relevant nearby stores through OpenStreetMap
- It checks the user's configured notification radius
- It can require a reliable movement trend toward home
- It filters stationary GPS noise and movement away from home
- It sends bundled reminders and limits notification frequency
- It stores and synchronizes lists through Firebase and Firestore
- It supports English, Hebrew and Spanish
- It includes a map, history, profile, authentication and RTL support

Voice functionality:

- Accepts multiple products in one spoken sentence
- Parses product names, quantities and measurement units
- Supports English, Hebrew and Spanish
- Lets users review and correct recognized items before saving
- Maintains a personal correction dictionary
- Uses local Whisper Tiny as a fallback when browser speech recognition returns no text

Important accuracy statement:

Daniel did not train the speech-recognition model itself. He designed an adaptive processing layer around the limitations of free speech-recognition services. The app separates products, quantities and units, supports user review, and learns from corrections.

Daniel tested the full flow with his own real Hebrew speech, including several products in one sentence.

Development process:

Daniel defined and created the product independently using OpenAI Codex as an AI-assisted development tool.

Recommended wording:

> Designed and developed independently using an AI-assisted development workflow with OpenAI Codex.

Repository:

https://github.com/DanielBedrack/remind-me

Live demo:

https://danielbedrack.github.io/remind-me/

Verification performed on 18 October 2026:

- 27 automated tests passed
- TypeScript type checking passed
- The web export completed successfully
- The public demo returned HTTP 200

Not yet verified:

- Reliable background notifications on a real Android or iPhone device
- Final native app identifiers and mobile authentication configuration

## Professional background from the CV

Optimate:

- Automation Developer and Technical Project Manager
- Approximately 20 client projects from discovery and technical specification through development, testing, deployment, training and support
- Tools include Make.com, n8n, monday.com, Fireberry, Google Workspace, APIs, webhooks, JavaScript, Python, SQL and JSON
- Correct dates: March 2025 - September 2026

Tesla:

- Delivery Advisor
- February 2024 - March 2025
- Managed vehicle-delivery processes and coordinated with sales, logistics, service and operations teams

Sela College:

- Coding Support and Assignment Reviewer
- March 2023 - February 2024
- Supported software-development students, explained technical concepts and reviewed assignments

Education:

- Software Development Program, Sela College / Lohamim Le'Hightech, March 2022 - July 2023
- Advanced Software Program / Yahalom, March 2023 - July 2023
- Topics included React, Angular, JavaScript, TypeScript, Node.js, C#/.NET, Python, SQL, MongoDB, Firebase, Azure and Docker fundamentals

## Visual direction

Three directions were prepared:

- A: Precision Systems - dark, structured and highly technical
- B: Calm Operator - warm, mature and human; recommended because it balances technology, business understanding and project leadership
- C: Bold Editorial - confident, energetic and less conventional

No final visual direction was selected yet.

## Exact continuation point

When continuing, begin by selecting or refining the visual direction. After that, complete the remaining design sections, write the approved portfolio specification, review it with Daniel, and only then create the implementation plan.

Do not begin building the website before the design and written specification are approved.
