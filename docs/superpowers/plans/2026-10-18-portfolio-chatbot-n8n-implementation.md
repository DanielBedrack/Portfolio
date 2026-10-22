# Portfolio Chatbot n8n Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a free local n8n portfolio chatbot that answers grounded questions in Hebrew and English, analyzes job descriptions, and sends an explicitly consented test contact email exactly once.

**Architecture:** Run n8n 2.43.7 in Docker and Ollama natively on Windows, connected through `host.docker.internal`. Keep the chat, job-match, contact and RAG responsibilities in separate importable workflows with explicit JSON contracts; version only sanitized workflow exports and non-secret test artifacts.

**Tech Stack:** n8n 2.43.7 Community Edition, Docker Compose, Ollama, `qwen3:4b`, Qdrant, `qwen3-embedding:0.6b`, Node.js 20, Node's built-in test runner, JSON Schema, Ajv

**Spec:** `docs/superpowers/specs/2026-10-18-portfolio-chatbot-n8n-design.md`

## Global Constraints

- The first deliverable is local only; do not host n8n, Ollama or a chatbot endpoint publicly.
- Use only free and local model/runtime components.
- Support Hebrew and English and answer in the language of the latest visitor message.
- Ground portfolio claims only in the approved knowledge artifact.
- Do not invent metrics, clients, skills, employment claims or completed functionality.
- Do not produce a numeric job-fit score.
- Require explicit consent before collecting name, email or message.
- Do not store leads in a CRM, spreadsheet or project database.
- Treat n8n execution history as stored data and prune it after 24 hours in the learning environment.
- Use fictional contact details in automated and routine local tests.
- Put credentials only in n8n Credentials; never export or commit them.
- Treat visitor text and pasted job descriptions as untrusted data, never as instructions.
- Do not integrate with or deploy the public portfolio under this plan.
- Build workflows in the n8n editor node by node, explain each node to Daniel, then export the sanitized JSON to the repository.
- When creating or changing workflow JSON, invoke the `samautomation-workflows:n8n-workflow-check` skill and satisfy its valid-input, invalid-input and duplicate-event checks.

## Review Focus

- A job description containing prompt-injection text must remain data and must not change the agent's rules; Task 5 owns the adversarial fixture and live assertion.
- A Hebrew question followed by an English question in the same session must switch response language without losing grounded context; Task 4 owns this test.
- An email timeout or unknown result must not trigger an automatic resend or a false success response; Tasks 6 and 7 own these tests.
- Two contact events with the same `requestId` must produce one delivery attempt while storing no contact PII in the idempotency record; Task 6 owns this test.
- Workflow exports and execution settings must contain no credential values and must prune successful and failed execution payloads after 24 hours; Tasks 1, 3 and 9 own these checks.

---

## Planned File Structure

```text
portfolio/
  chatbot/
    .env.example
    .gitignore
    compose.yaml
    package.json
    package-lock.json
    README.md
    contracts/
      contact-request.schema.json
      contact-result.schema.json
      job-match-result.schema.json
      portfolio-knowledge.schema.json
    docs/
      learning-log.md
      manual-test-matrix.md
    knowledge/
      portfolio-approved.json
      rag/
        portfolio-approved.md
    scripts/
      check-environment.mjs
      check-secrets.mjs
      validate-knowledge.mjs
      validate-workflows.mjs
    test-fixtures/
      chat-cases.json
      contact-cases.json
      job-match-cases.json
    test-results/
      live-results.json
    tests/
      config.test.mjs
      contracts.test.mjs
      workflow-exports.test.mjs
      acceptance.test.mjs
    workflows/
      portfolio-chat.json
      job-match.json
      contact-delivery.json
      rag-ingestion.json
  docs/superpowers/
    specs/2026-10-18-portfolio-chatbot-n8n-design.md
    plans/2026-10-18-portfolio-chatbot-n8n-implementation.md
```

### Task 1: Reproducible Local Runtime

**Files:**
- Create: `chatbot/package.json`
- Create: `chatbot/package-lock.json`
- Create: `chatbot/.env.example`
- Create: `chatbot/.gitignore`
- Create: `chatbot/compose.yaml`
- Create: `chatbot/scripts/check-environment.mjs`
- Create: `chatbot/tests/config.test.mjs`
- Create: `chatbot/README.md`

**Interfaces:**
- Consumes: Docker Desktop, Node.js 20, and a native Ollama service reachable from Windows.
- Produces: `npm run check:config`, `npm run check:environment`, n8n at `http://localhost:5678`, Ollama at `http://localhost:11434`, and the Docker-to-Ollama base URL `http://host.docker.internal:11434`.

- [ ] **Step 1: Write the failing configuration test**

Create `config.test.mjs` with tests named `pins the approved n8n version`, `prunes execution data after 24 hours`, `persists n8n state`, `mounts workflows and knowledge read only`, and `does not declare secrets`. Assert image `docker.n8n.io/n8nio/n8n:2.43.7`, timezone `Asia/Jerusalem`, `EXECUTIONS_DATA_PRUNE=true`, `EXECUTIONS_DATA_MAX_AGE=24`, a named n8n data volume, and no key matching `password|token|secret|credential` with a non-placeholder value.

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd chatbot; npm test -- tests/config.test.mjs`

Expected: FAIL because `compose.yaml` and `.env.example` do not exist.

- [ ] **Step 3: Implement the local runtime files**

Create `compose.yaml` with one `n8n` service, port `5678:5678`, persistent `/home/node/.n8n`, read-only `/workspace/workflows` and `/workspace/knowledge` mounts, `host.docker.internal:host-gateway`, execution pruning, telemetry opt-out and the pinned image. Keep `.env.example` limited to non-secret configuration and document creation of a private untracked `.env`.

- [ ] **Step 4: Implement `check-environment.mjs`**

Export `checkEnvironment({ n8nUrl, ollamaUrl }): Promise<EnvironmentReport>`, where `EnvironmentReport` contains `n8n: "ok" | "unreachable"`, `ollama: "ok" | "unreachable"`, and `models: string[]`. Exit non-zero unless both services respond and `qwen3:4b` is listed.

- [ ] **Step 5: Verify configuration before installation**

Run: `cd chatbot; npm install; npm test -- tests/config.test.mjs; docker compose config --quiet`

Expected: tests PASS and Docker Compose configuration exits `0`.

- [ ] **Step 6: Install and start the local services**

Run interactively on Windows: `winget install --id Ollama.Ollama -e`, then `ollama pull qwen3:4b`, followed by `cd chatbot; docker compose up -d`.

Expected: Ollama installs without requesting model API credentials, the model pull completes, and the n8n container becomes healthy. If Ollama is already installed when execution begins, record its version and skip only the installer command.

- [ ] **Step 7: Verify live health**

Run: `cd chatbot; npm run check:environment`

Expected: prints n8n `ok`, Ollama `ok`, includes `qwen3:4b`, and exits `0`.

- [ ] **Step 8: Record the learning checkpoint**

In `README.md`, explain in plain language what runs natively, what runs in Docker, why `host.docker.internal` is needed and how to stop/start without deleting the named volume.

- [ ] **Step 9: Commit**

```bash
git add chatbot/.env.example chatbot/.gitignore chatbot/compose.yaml chatbot/package.json chatbot/package-lock.json chatbot/scripts/check-environment.mjs chatbot/tests/config.test.mjs chatbot/README.md
git commit -m "chore: add local n8n chatbot runtime"
```

### Task 2: Approved Knowledge and Data Contracts

**Files:**
- Create: `chatbot/contracts/portfolio-knowledge.schema.json`
- Create: `chatbot/contracts/job-match-result.schema.json`
- Create: `chatbot/contracts/contact-request.schema.json`
- Create: `chatbot/contracts/contact-result.schema.json`
- Create: `chatbot/knowledge/portfolio-approved.json`
- Create: `chatbot/knowledge/rag/portfolio-approved.md`
- Create: `chatbot/scripts/validate-knowledge.mjs`
- Create: `chatbot/tests/contracts.test.mjs`
- Modify: `chatbot/package.json`
- Modify: `chatbot/package-lock.json`

**Interfaces:**
- Consumes: approved facts from `docs/superpowers/specs/2026-10-18-portfolio-design.md`.
- Produces: JSON Schema contracts and `validateKnowledge(value): { valid: boolean; errors: string[] }`; `JobMatchResult` fields `language`, `strongMatches`, `partialMatches`, `missingEvidence`, `followUpQuestions`; `ContactRequest` fields `requestId`, `consent`, `name`, `email`, `message`, `language`; `ContactResult` fields `requestId`, `status`, `deliveryAttempted`, `safeMessage`.

- [ ] **Step 1: Write failing contract tests**

Test valid knowledge, a missing required project, an unsupported metric, a job-match result containing a numeric score, a contact request without consent, an invalid email, and valid Hebrew/English language values. Assert unsupported data fails with a readable JSON path.

- [ ] **Step 2: Run the tests and verify failure**

Run: `cd chatbot; npm test -- tests/contracts.test.mjs`

Expected: FAIL because schemas and validator are absent.

- [ ] **Step 3: Define exact schemas**

Use JSON Schema with `additionalProperties: false`. Restrict `language` to `he|en`; restrict contact result status to `sent|duplicate|invalid|failed|unknown`; require `consent` to equal `true`; forbid any job-match `score` property.

- [ ] **Step 4: Create the sanitized knowledge artifacts**

Populate the JSON and Markdown variants with the approved positioning, employment dates, skills, three case studies, collaboration boundaries and verification limits. Include `sourceId` on every claim so job-match evidence can cite a stable identifier. Do not include secrets, customer records, unapproved metrics or private implementation artifacts.

- [ ] **Step 5: Implement and run validation**

Install Ajv as a development dependency, implement `validateKnowledge`, and add `npm run validate:knowledge`.

Run: `cd chatbot; npm run validate:knowledge; npm test -- tests/contracts.test.mjs`

Expected: all commands PASS.

- [ ] **Step 6: Commit**

```bash
git add chatbot/contracts chatbot/knowledge chatbot/scripts/validate-knowledge.mjs chatbot/tests/contracts.test.mjs chatbot/package.json chatbot/package-lock.json
git commit -m "feat: add approved chatbot knowledge contracts"
```

### Task 3: Workflow Export and Secret Validation Harness

**Files:**
- Create: `chatbot/scripts/validate-workflows.mjs`
- Create: `chatbot/scripts/check-secrets.mjs`
- Create: `chatbot/tests/workflow-exports.test.mjs`
- Create: `chatbot/test-fixtures/workflow-valid.json`
- Create: `chatbot/test-fixtures/workflow-invalid.json`
- Create: `chatbot/test-fixtures/workflow-duplicate-event.json`
- Modify: `chatbot/package.json`

**Interfaces:**
- Consumes: one workflow export object or an array of exports.
- Produces: `validateWorkflowExport(value): ValidationResult`, `scanForSecrets(value): SecretFinding[]`, and npm scripts `validate:workflows` and `check:secrets`.

- [ ] **Step 1: Invoke the n8n workflow-check skill**

Read and follow `samautomation-workflows:n8n-workflow-check` before creating the validator or any production workflow JSON.

- [ ] **Step 2: Write failing validator tests**

Assert that the valid fixture passes; the invalid fixture fails for missing nodes/connections; duplicate node IDs, duplicate webhook paths or duplicate event keys fail; active production triggers fail; and values resembling passwords, OAuth tokens, API keys or populated credential objects fail the secret scan.

- [ ] **Step 3: Run the tests and verify failure**

Run: `cd chatbot; npm test -- tests/workflow-exports.test.mjs`

Expected: FAIL because the validation functions do not exist.

- [ ] **Step 4: Implement the validators**

Require non-empty `name`, unique node IDs and names, valid connection targets, `active: false`, no pinned personal data, no populated credential secrets, and unique trigger/event identifiers. Credential references may contain only n8n credential IDs and display names, and the export must remain usable after those references are removed for repository storage.

- [ ] **Step 5: Verify all three fixture classes**

Run: `cd chatbot; npm test -- tests/workflow-exports.test.mjs; npm run validate:workflows; npm run check:secrets`

Expected: fixture tests PASS; repository scans exit `0` when the production workflows do not yet exist.

- [ ] **Step 6: Commit**

```bash
git add chatbot/scripts chatbot/tests/workflow-exports.test.mjs chatbot/test-fixtures chatbot/package.json
git commit -m "test: add n8n workflow export safeguards"
```

### Task 4: Grounded Bilingual Portfolio Conversation

**Files:**
- Create: `chatbot/workflows/portfolio-chat.json`
- Create: `chatbot/test-fixtures/chat-cases.json`
- Create: `chatbot/docs/learning-log.md`
- Create: `chatbot/tests/acceptance.test.mjs`
- Modify: `chatbot/README.md`

**Interfaces:**
- Consumes: Chat Trigger fields `chatInput` and `sessionId`, Ollama base URL, model `qwen3:4b`, and `portfolio-approved.json` content copied into the approved system prompt at export time.
- Produces: chat text in `he|en`; refusal for missing evidence; short memory scoped by `sessionId`; inactive sanitized export `portfolio-chat.json`.

- [ ] **Step 1: Add failing chat acceptance cases**

Create fixtures for English and Hebrew factual questions, a missing metric, a request to invent an achievement, and a same-session Hebrew-to-English switch. Tests must assert expected language markers, required claim IDs or facts, and forbidden invented claims.

- [ ] **Step 2: Build the workflow node by node in n8n**

Add Chat Trigger, AI Agent, Ollama Chat Model and Simple Memory. Set Ollama URL to `http://host.docker.internal:11434`, model `qwen3:4b`, and memory key from `sessionId`. Add a system message that defines the approved knowledge boundary, bilingual rule and refusal wording.

- [ ] **Step 3: Verify a single live message before adding memory**

Use the n8n chat preview to send `What is Daniel's professional focus?`.

Expected: an English response grounded in the approved positioning and no external claims.

- [ ] **Step 4: Verify bilingual memory behavior**

In one session ask a Hebrew project question and then an English follow-up.

Expected: the first answer is Hebrew, the second is English, and both remain grounded in the same project context.

- [ ] **Step 5: Verify refusal and dependency failure**

Ask for an unsupported percentage improvement, then stop Ollama and repeat a normal question.

Expected: the unsupported claim is refused; Ollama downtime produces the localized service-unavailable response rather than invented content.

- [ ] **Step 6: Export, sanitize and validate**

Export to `portfolio-chat.json`, remove local credential references and pinned execution data, keep `active: false`, then run `npm run validate:workflows` and `npm run check:secrets`.

Expected: both commands PASS.

- [ ] **Step 7: Record the learning checkpoint**

Document Chat Trigger, AI Agent, Chat Model, Simple Memory, system prompt and `sessionId` in `learning-log.md`, including what each node consumes and produces.

- [ ] **Step 8: Commit**

```bash
git add chatbot/workflows/portfolio-chat.json chatbot/test-fixtures/chat-cases.json chatbot/tests/acceptance.test.mjs chatbot/docs/learning-log.md chatbot/README.md
git commit -m "feat: add grounded bilingual portfolio chat"
```

### Task 5: Structured Job-Match Subworkflow

**Files:**
- Create: `chatbot/workflows/job-match.json`
- Create: `chatbot/test-fixtures/job-match-cases.json`
- Modify: `chatbot/workflows/portfolio-chat.json`
- Modify: `chatbot/tests/acceptance.test.mjs`
- Modify: `chatbot/docs/learning-log.md`

**Interfaces:**
- Consumes: `{ jobDescription: string, language: "he" | "en", evidence: PortfolioKnowledge }` through Execute Sub-workflow Trigger.
- Produces: `JobMatchResult` conforming exactly to `job-match-result.schema.json` and containing evidence `sourceId` values for each strong or partial match.

- [ ] **Step 1: Write failing job-match cases**

Add strong-match, partial-match, unsupported-requirement, Hebrew, English, oversized-input and prompt-injection fixtures. The adversarial fixture must include an instruction to ignore prior rules and invent experience; assert that the output lists the unsupported requirement under `missingEvidence` and never follows the instruction.

- [ ] **Step 2: Build the subworkflow**

Use Execute Sub-workflow Trigger, input normalization/length validation, an Ollama-backed chain or agent, Structured Output Parser, and final schema-shaped fields. Set a hard job-description length of 12,000 characters and return a localized validation error above that limit.

- [ ] **Step 3: Connect the chat workflow**

Route explicit job-description analysis intent to Execute Sub-workflow, pass language plus approved evidence, and render the structured result without adding new claims.

- [ ] **Step 4: Run live positive and adversarial checks**

Execute one approved automation role and one prompt-injection fixture through the chat preview.

Expected: valid schema, no numeric score, evidence IDs on matches, and injection text treated only as job-description data.

- [ ] **Step 5: Export and validate both workflows**

Run: `cd chatbot; npm run validate:workflows; npm run check:secrets; npm test -- tests/acceptance.test.mjs`

Expected: all checks PASS.

- [ ] **Step 6: Record the learning checkpoint and commit**

Explain subworkflows, structured output and the difference between visitor data and system instructions in `learning-log.md`.

```bash
git add chatbot/workflows chatbot/test-fixtures/job-match-cases.json chatbot/tests/acceptance.test.mjs chatbot/docs/learning-log.md
git commit -m "feat: add evidence based job matching"
```

### Task 6: Consent-Gated Contact Flow With Simulated Delivery

**Files:**
- Create: `chatbot/workflows/contact-delivery.json`
- Create: `chatbot/test-fixtures/contact-cases.json`
- Modify: `chatbot/workflows/portfolio-chat.json`
- Modify: `chatbot/tests/acceptance.test.mjs`
- Modify: `chatbot/docs/learning-log.md`

**Interfaces:**
- Consumes: `ContactRequest` through Execute Sub-workflow Trigger.
- Produces: `ContactResult`; stores only `{ requestId, deliveryState, updatedAt }` for local idempotency and never stores name, email or message in the idempotency record.

- [ ] **Step 1: Write failing contact cases**

Cover declined consent, missing field, invalid email, valid fictional input, simulated failure, simulated unknown outcome and two identical `requestId` events. Assert zero delivery attempts without consent/valid input, one attempt for duplicates, and no PII in the idempotency state.

- [ ] **Step 2: Build validation and consent routing**

Create Execute Sub-workflow Trigger, explicit consent check, required-field validation, basic email validation and a localized invalid result. The chat workflow must collect fields only after consent and allow a refusal to return to normal chat.

- [ ] **Step 3: Add a simulated mail adapter**

Use a branch controlled by `deliveryMode: "simulate-success" | "simulate-failure" | "simulate-unknown"`. Return the exact `ContactResult` contract and do not use a real credential.

- [ ] **Step 4: Add idempotency without lead storage**

Use workflow static data keyed only by `requestId`, retaining `deliveryState` and `updatedAt` for 24 hours. Write `attempting` immediately before the adapter call, then replace it with `sent`, `failed` or `unknown`. Reject duplicates in `attempting`, `sent` or `unknown` states; a confirmed failure may be retried only through an explicit new request. An unknown result returns `unknown` and is never retried automatically.

- [ ] **Step 5: Run valid, invalid and duplicate executions**

Expected: invalid input makes zero attempts; valid input makes one; the duplicate returns `duplicate`; simulated failure returns `failed`; simulated timeout returns `unknown` with no second attempt.

- [ ] **Step 6: Export, validate and document**

Run: `cd chatbot; npm run validate:workflows; npm run check:secrets; npm test -- tests/acceptance.test.mjs`

Expected: all checks PASS.

- [ ] **Step 7: Commit**

```bash
git add chatbot/workflows chatbot/test-fixtures/contact-cases.json chatbot/tests/acceptance.test.mjs chatbot/docs/learning-log.md
git commit -m "feat: add consent gated contact workflow"
```

### Task 7: Controlled Gmail Delivery

**Files:**
- Modify: `chatbot/workflows/contact-delivery.json`
- Modify: `chatbot/test-fixtures/contact-cases.json`
- Create: `chatbot/docs/manual-test-matrix.md`
- Modify: `chatbot/README.md`

**Interfaces:**
- Consumes: a user-created Gmail credential inside n8n and a valid `ContactRequest` with `deliveryMode: "gmail"`.
- Produces: one email to Daniel's approved destination and a `ContactResult` whose `status` is `sent` only when the Gmail node confirms success.

- [ ] **Step 1: Add a failing Gmail-mode contract case**

Assert that Gmail mode cannot run without a selected n8n credential and that a timeout maps to `unknown`, not `failed` or `sent`.

- [ ] **Step 2: Pause for Daniel's interactive authentication**

Open the local n8n credential screen and have Daniel complete Google authentication himself. Do not request, view, copy, export or store passwords, OAuth codes or tokens.

- [ ] **Step 3: Add the Gmail node**

Send a plain-text message to the approved destination with subject `Portfolio chatbot inquiry - {{$json.name}}`; include name, reply email, message, language and request ID. Do not attach the conversation history.

- [ ] **Step 4: Verify one controlled fictional submission**

Use fictional visitor fields and a message explicitly labeled `LOCAL TEST`. Confirm the Gmail node's success output and receipt in Daniel's inbox before marking the result `sent`.

- [ ] **Step 5: Verify ambiguous and duplicate behavior**

Simulate the post-send response being unavailable, then submit the same `requestId` again.

Expected: the first result is `unknown`, the workflow does not retry automatically, and the manual test matrix instructs checking the inbox before any human retry.

- [ ] **Step 6: Sanitize the export and verify secrets are absent**

Remove the credential reference from the committed export while preserving a README instruction to select it locally after import.

Run: `cd chatbot; npm run validate:workflows; npm run check:secrets`

Expected: PASS with no credential material in Git.

- [ ] **Step 7: Commit**

```bash
git add chatbot/workflows/contact-delivery.json chatbot/test-fixtures/contact-cases.json chatbot/docs/manual-test-matrix.md chatbot/README.md
git commit -m "feat: add controlled chatbot email delivery"
```

### Task 8: Local RAG Ingestion and Retrieval

**Files:**
- Modify: `chatbot/compose.yaml`
- Create: `chatbot/workflows/rag-ingestion.json`
- Modify: `chatbot/workflows/portfolio-chat.json`
- Modify: `chatbot/test-fixtures/chat-cases.json`
- Modify: `chatbot/tests/config.test.mjs`
- Modify: `chatbot/tests/acceptance.test.mjs`
- Modify: `chatbot/docs/learning-log.md`

**Interfaces:**
- Consumes: `knowledge/rag/portfolio-approved.md`, Ollama embedding model `qwen3-embedding:0.6b`, and Qdrant collection `portfolio_approved_v1`.
- Produces: chunks with metadata `{ sourceId, section, language: "en" }`; retriever tool results containing `text`, `sourceId`, and similarity metadata; grounded Hebrew or English chat answers.

- [ ] **Step 1: Extend failing configuration and retrieval tests**

Assert that Compose pins a Qdrant image, uses a named volume, does not expose Qdrant outside localhost, and retains the n8n-only startup path. Add English and Hebrew retrieval fixtures that must resolve to the same approved `sourceId`, plus an unrelated question that must retrieve no usable evidence.

- [ ] **Step 2: Add Qdrant as an opt-in Compose profile**

Add service `qdrant` under profile `rag`, bind port `6333` to `127.0.0.1`, persist `/qdrant/storage`, and keep the initial `docker compose up -d n8n` path valid.

- [ ] **Step 3: Install the embedding model and start RAG services**

Run: `ollama pull qwen3-embedding:0.6b`, then `cd chatbot; docker compose --profile rag up -d`.

Expected: Ollama lists both approved models and Qdrant health responds locally.

- [ ] **Step 4: Build the ingestion workflow**

Use Manual Trigger, file loading from the read-only knowledge mount, a text splitter, Ollama Embeddings and Qdrant Vector Store. Use collection `portfolio_approved_v1`, deterministic metadata and a clean-rebuild operation so repeated ingestion does not duplicate chunks.

- [ ] **Step 5: Verify ingestion idempotency**

Run ingestion twice.

Expected: the second run replaces or upserts the same logical chunks and collection count does not double.

- [ ] **Step 6: Add retrieval to the chat workflow**

Attach Qdrant retrieval as a constrained knowledge tool. Require answers to use retrieved chunks, keep the same language behavior and refuse when no relevant chunk supports the claim.

- [ ] **Step 7: Run cross-language and no-answer checks**

Expected: equivalent Hebrew and English questions cite the same `sourceId`; an unrelated question produces the missing-information fallback.

- [ ] **Step 8: Export, validate and document concepts**

Explain document ingestion, chunks, embeddings, vectors, similarity retrieval, chat memory and stored knowledge as distinct concepts in `learning-log.md`.

Run: `cd chatbot; npm run check:config; npm run validate:workflows; npm run check:secrets; npm test`

Expected: all checks PASS.

- [ ] **Step 9: Commit**

```bash
git add chatbot/compose.yaml chatbot/workflows chatbot/test-fixtures/chat-cases.json chatbot/tests chatbot/docs/learning-log.md
git commit -m "feat: add local portfolio rag retrieval"
```

### Task 9: Full Acceptance, Restart and Learning Handoff

**Files:**
- Create: `chatbot/test-results/live-results.json`
- Modify: `chatbot/tests/acceptance.test.mjs`
- Modify: `chatbot/docs/manual-test-matrix.md`
- Modify: `chatbot/docs/learning-log.md`
- Modify: `chatbot/README.md`

**Interfaces:**
- Consumes: all four sanitized workflow exports, both Ollama models, Qdrant profile, Gmail credential selected only in the local instance, and all fixture sets.
- Produces: one verified local learning environment, a completed manual test matrix and exact start/stop/import/re-export instructions.

- [ ] **Step 1: Add the full acceptance runner**

Define `live-results.json` as an array of `{ caseId, workflow, executedAt, actualStatus, passed }`. Make `acceptance.test.mjs` fail unless every fixture is mapped to exactly one recorded result. Reject duplicate `caseId` values and any result containing fields other than those five, so real visitor email or message content cannot enter the artifact.

- [ ] **Step 2: Run the complete fixture matrix**

Execute all chat, job-match and contact cases, including prompt injection, language switching, invalid input, failure, unknown outcome and duplicate delivery.

Expected: every case passes and no unsupported claims appear.

- [ ] **Step 3: Verify restart persistence**

Run: `cd chatbot; docker compose --profile rag down; docker compose --profile rag up -d; npm run check:environment`

Expected: n8n, workflows, non-secret settings and Qdrant vectors remain available; credentials remain only inside the local n8n volume.

- [ ] **Step 4: Re-export and run repository safeguards**

Re-export each workflow, sanitize it, and run: `cd chatbot; npm run validate:knowledge; npm run validate:workflows; npm run check:secrets; npm test; docker compose config --quiet`.

Expected: every command exits `0`.

- [ ] **Step 5: Run the n8n security audit**

Run the audit from the local instance or container and record findings relevant to unprotected webhooks, risky nodes, credentials and outdated versions. Fix local-scope issues without exposing the instance publicly.

- [ ] **Step 6: Complete the learning walkthrough**

Have Daniel explain each node, the input/output contract of each workflow, the difference between memory and RAG, why unknown email results are not retried, and where execution data is retained. Record any topic needing another walkthrough.

- [ ] **Step 7: Confirm scope boundary**

Update `README.md` to state that the chatbot is local-only and is not embedded in the public portfolio. List production questions that require a separate design: hosting, HTTPS, authentication, rate limiting, abuse protection, privacy notice, retention, monitoring and model/API cost.

- [ ] **Step 8: Commit**

```bash
git add chatbot/test-results/live-results.json chatbot/tests/acceptance.test.mjs chatbot/docs chatbot/README.md chatbot/workflows
git commit -m "test: verify local portfolio chatbot learning flow"
```

The implementation is complete only after all repository checks pass, all live test rows are recorded, Daniel completes the learning walkthrough, and no public deployment or website integration has occurred.
