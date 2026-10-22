# Portfolio Chatbot Learning Project - Design Specification

Date: 18 October 2026
Updated: 19 October 2026
Status: Contact-flow revision approved in conversation; awaiting review of this updated written specification

## 1. Purpose

Build a free, local-first portfolio chatbot as a practical n8n learning project. The chatbot will eventually support the public portfolio, but the first deliverable is a local prototype that Daniel can understand, test and modify node by node.

The chatbot has three user-facing responsibilities:

- Answer questions about Daniel's experience, skills and approved portfolio projects.
- Compare a pasted job description with verified portfolio evidence.
- Offer an explicit-consent contact flow that stores the inquiry in a private Google Sheet and then notifies Daniel by Gmail.

The project must teach the underlying concepts progressively rather than introduce RAG, production hosting and public website integration at once.

## 2. Audience and Language

The primary users are recruiters and hiring managers evaluating Daniel for AI automation, systems integration and technical project management roles.

The chatbot supports Hebrew and English. It may use the browser language for its initial greeting. After the visitor sends a message, it responds in the language of the latest message. If language detection is genuinely ambiguous, the chatbot asks whether the visitor prefers Hebrew or English.

## 3. Scope and Delivery Strategy

Development follows a staged hybrid approach:

1. Build a local conversational prototype with curated portfolio knowledge.
2. Add bilingual behavior and short conversational memory.
3. Add evidence-based job-description analysis.
4. Add explicit-consent contact collection, Google Sheets lead storage and Gmail notification.
5. Add local RAG as a separate learning milestone.
6. Evaluate public website integration only after the local prototype passes its tests.

The initial implementation ends at the verified local prototype. Public hosting, website embedding and real visitor data are outside this specification and require a separate production design and explicit approval.

## 4. Local Architecture

The core local flow is:

`Chat Trigger -> AI Agent -> Ollama Chat Model -> Response`

The selected environment is:

- n8n running locally in Docker.
- Ollama running a local language model.
- `qwen3:4b` as the initial model candidate because its size is appropriate for an initial local test and its published model information describes broad multilingual support.
- No paid model API or hosted automation service in the learning prototype.

Observed local machine context on 18 October 2026:

- Windows Lenovo 83D4.
- Intel Core Ultra 9 185H with 16 cores and 22 logical processors.
- Approximately 32 GB RAM.
- Intel Arc integrated graphics reporting 2 GB adapter memory.
- Node.js, npm and Docker are installed.
- n8n and Ollama are not installed as persistent commands.

The model choice remains subject to measured Hebrew and English quality, latency and resource use. A model that runs successfully but produces unreliable Hebrew does not pass the acceptance criteria.

## 5. Workflow Boundaries

### 5.1 Portfolio Conversation Workflow

Responsibilities:

- Receive chat messages through Chat Trigger.
- maintain short-lived conversational context.
- Instruct the AI Agent to answer in the visitor's current language.
- Limit factual answers to approved portfolio knowledge.
- Route job-description analysis and contact delivery to dedicated subworkflows.
- Return a clear fallback when the model or a dependency is unavailable.

This workflow must not send email directly or contain mail credentials.

### 5.2 Approved Knowledge Source

The first version uses a small, sanitized knowledge document derived from the approved portfolio specification. It contains only:

- Approved positioning and professional summary.
- Employment and education facts.
- Approved skills.
- Approved public descriptions of Megureit, financial-document automation and RemindMe.
- Verification limits and work-in-progress labels.
- Approved public contact options.

It must exclude credentials, customer records, private workflow details, unpublished metrics, private source code and unverified claims. The source document is the factual boundary for the initial agent prompt.

### 5.3 Job-Match Workflow

Input:

- A pasted job description.
- Approved portfolio facts or evidence references.
- The visitor's response language.

Output is structured JSON with:

- Strong matches backed by specific evidence.
- Partial matches.
- Requirements for which no verified evidence exists.
- Useful follow-up questions for Daniel.

The workflow must not produce a numeric fit score. Text inside the job description is untrusted data, not system instruction, and cannot override the agent's rules.

### 5.4 Contact Delivery Workflow

The contact workflow is invoked only after the visitor explicitly chooses to contact Daniel and accepts a short disclosure that the submitted details will be stored in Daniel's private Google Sheet and emailed to him.

It collects:

- Name.
- Email address.
- Message.
- Conversation language.

It validates consent, required fields and basic email structure before any external write. The AI Agent calls one dedicated `Save Portfolio Lead` subworkflow rather than controlling Google Sheets and Gmail as independent tools.

The subworkflow performs these steps in a fixed order:

1. Validate consent and the structured lead fields.
2. Derive a deterministic request identifier from the chat session and confirmed submission.
3. Check the lead sheet for that request identifier and return `duplicate` when it already exists.
4. Append one row to the private Google Sheet.
5. Send a Gmail notification to `danielbedrack@gmail.com`.
6. Update the saved row with the Gmail result and return a structured result to the conversation workflow.

The sheet columns are `createdAt`, `language`, `name`, `email`, `message`, `consent`, `requestId` and `emailStatus`. The workflow stores no conversation history. Google and Gmail credentials remain only in n8n's credential system and are never embedded in prompts, exports or repository files.

If the sheet write succeeds but Gmail fails or has an unknown result, the lead remains stored and its `emailStatus` records the outcome. The workflow must not append the same `requestId` again during a retry. A successful chat response means the lead was stored; it does not falsely claim that Gmail succeeded when notification delivery is failed or unknown.

The subworkflow accepts exactly `{ name, email, message, language, consent, sessionId }`, with `language` restricted to `he|en` and `consent` required to equal `true`. It returns one of `stored_and_notified`, `stored_notification_failed`, `stored_notification_unknown`, `duplicate`, `invalid` or `storage_failed`, plus the non-secret `requestId`. Only `stored_and_notified` confirms both external writes.

### 5.5 Future RAG Workflows

RAG is added only after the non-RAG chatbot is stable. It consists of two independently testable flows:

- Ingestion: approved documents -> extraction -> chunking -> embeddings -> local vector store.
- Retrieval: visitor question -> query embedding -> relevant chunks -> grounded agent response.

The initial candidate for multilingual embeddings will be selected and benchmarked during the RAG milestone. Adding retrieval must not change the contact workflow or the job-match output contract.

## 6. Conversation Behavior

The initial greeting briefly offers three capabilities: ask about Daniel, compare a role, or make contact. The interface does not force the visitor through a rigid menu; natural-language questions remain supported.

### 6.1 Portfolio Questions

The chatbot answers only from approved knowledge. When the requested fact is missing, it states that the information is not available in the approved portfolio material and offers a contact path. It must not infer metrics, client facts, employment claims or completed product behavior.

### 6.2 Job Comparison

For a pasted job description, the chatbot presents evidence-based matches, partial matches, unknowns and follow-up questions. It distinguishes absence of evidence from evidence of absence. It does not promise suitability, hiring outcomes or skill levels that are not documented.

### 6.3 Contact Flow

The chatbot requests consent before asking for personal details. Declining consent returns the visitor to normal conversation. Successful delivery is reported only after the mail workflow confirms it. On failure, the chatbot provides an approved direct contact alternative and clearly states that the automated submission was not confirmed.

## 7. Privacy and Security

- Use fictional names and email addresses during local development and automated tests.
- Collect and store contact fields only after explicit visitor consent to both Google Sheets storage and email delivery.
- Limit access to the lead sheet to Daniel's Google account unless he explicitly approves additional sharing.
- Do not connect real mail credentials until the workflow is ready for a controlled end-to-end test.
- Store credentials only in n8n's credential system.
- Never place secrets in workflow exports, repository files, prompts or chat transcripts.
- Treat all visitor input, including job descriptions, as untrusted content.
- Limit message and job-description length to prevent accidental overload and trivial abuse.
- Minimize n8n execution payload retention before testing with any real personal data.
- Define automatic execution-history pruning before public deployment.
- Do not claim that "no data is stored" while n8n execution history contains message payloads.
- Review the website privacy disclosure before any public integration.

The approved portfolio design currently describes a static site with no backend and no visitor-data storage. Therefore, public chatbot integration is a deliberate future architecture change, not part of the initial portfolio build.

## 8. Error Handling

- Ollama unavailable: return a localized service-unavailable response and record a technical failure without fabricating an answer.
- No grounded answer: say the information is not present and offer contact.
- Invalid structured job-match output: retry once with the expected schema, then return a localized fallback.
- Job-match failure: keep ordinary portfolio chat available.
- Invalid contact field: explain the correction needed without sending.
- Mail failure or timeout: report that delivery was not confirmed and provide a direct contact alternative.
- Unknown mail result: do not retry automatically because the first send may have succeeded.
- Duplicate submission: use a deterministic request identifier and a durable lookup in Google Sheets so the same confirmed request is not appended or emailed twice.
- Sheet succeeds and Gmail fails: keep the saved lead, record `failed`, return an honest partial-success result and do not append a second row automatically.
- Sheet succeeds and Gmail result is unknown: keep the saved lead, record `unknown`, do not resend automatically and require inbox inspection before any manual retry.
- Oversized input: reject it with a concise limit explanation.

## 9. Testing Strategy

Each workflow is tested separately before an end-to-end test.

### 9.1 Conversation Tests

- Expected portfolio questions in Hebrew and English.
- Language switching inside one session.
- Unsupported questions and missing facts.
- Requests to invent metrics, clients or achievements.
- Ollama-unavailable fallback.
- Short-memory behavior without long-term personal-data persistence.

### 9.2 Job-Match Tests

- Strongly matching job description.
- Partially matching job description.
- Job description with unsupported requirements.
- Hebrew and English descriptions.
- Job text containing prompt-injection instructions.
- Valid structured output and invalid-output fallback.

### 9.3 Contact Tests

- Visitor declines consent.
- Missing name, email or message.
- Invalid email.
- Valid fictional submission.
- Valid fictional submission creates one correctly mapped Google Sheets row before Gmail is attempted.
- Simulated mail failure.
- Unknown send result with no automatic retry.
- Duplicate event with only one sheet row and one delivery attempt.
- Google Sheets failure produces no Gmail attempt and no success response.

### 9.4 Operational Tests

- Restart n8n and confirm that workflows and required non-secret configuration persist.
- Export workflows and confirm that exports contain no credentials or secrets.
- Confirm that real personal data was not used during local testing.
- Confirm that each workflow's input and output contract is understandable without inspecting its internal nodes.

## 10. Learning Milestones

Each milestone ends with a working demonstration and a short explanation of every node used.

1. Start n8n and Ollama locally and verify health independently.
2. Send one message through Chat Trigger and receive one local model response.
3. Add the approved knowledge boundary and refusal behavior.
4. Add bilingual behavior and short memory.
5. Add the structured job-match subworkflow.
6. Add consent, validation and simulated contact delivery.
7. Add controlled Google Sheets storage and Gmail notification with fictional test data.
8. Add RAG ingestion and retrieval as a separate milestone.
9. Run the complete local acceptance suite.

Each stage should be understood before moving to the next. A passing final result without understanding the component flow does not satisfy the learning goal.

## 11. Success Criteria

The local prototype is successful when:

- Daniel can explain the purpose of every node and connection.
- The chatbot responds appropriately in Hebrew and English.
- Portfolio answers remain grounded in approved content.
- Job comparisons distinguish matches, partial matches and missing evidence.
- Contact details are requested only after consent.
- Valid fictional contact data is stored in the private Google Sheet exactly once and reaches the controlled email destination at most once.
- Failures are reported honestly and do not create false success messages.
- Workflow exports contain no credentials or private customer information.
- All conversation, job-match, contact and operational test cases pass.

## 12. Out of Scope

- Public hosting of n8n or Ollama.
- Embedding the chatbot in the deployed portfolio.
- Real recruiter submissions during local development.
- CRM or project-database storage other than the approved private Google Sheet.
- Analytics, authentication or an administration interface.
- Paid model APIs or paid hosting.
- Automated replies to recruiters.
- Production security, rate-limiting and monitoring implementation.
- Changes to the existing portfolio implementation plan.

## 13. References

- n8n documentation: https://docs.n8n.io/
- Ollama Qwen3 4B model page: https://ollama.com/library/qwen3%3A4b
- Existing portfolio design: `docs/superpowers/specs/2026-10-18-portfolio-design.md`
