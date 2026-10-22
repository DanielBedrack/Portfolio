# Portfolio Lead Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit-consent portfolio contact flow that stores each valid inquiry once in a private Google Sheet and then sends Daniel a Gmail notification.

**Architecture:** The portfolio AI Agent calls one `Save Portfolio Lead` n8n subworkflow through `Call n8n Workflow Tool`. The subworkflow validates input, derives a deterministic request ID, checks Google Sheets for duplicates, appends one row, sends Gmail only after storage succeeds, updates the row with the notification outcome, and returns a structured result.

**Tech Stack:** n8n 2.43.7 Community Edition, Google Sheets, Gmail, Node.js 20 test runner, JSON Schema, Ajv

**Spec:** `docs/superpowers/specs/2026-10-18-portfolio-chatbot-n8n-design.md`

## Global Constraints

- Keep both workflows inactive and local until the complete acceptance matrix passes.
- Collect `name`, `email` and `message` only after explicit consent to Google Sheets storage and email delivery.
- Use fictional visitor details for routine and automated tests.
- Store Google credentials only in n8n Credentials; never export or commit tokens or credential values.
- The lead sheet columns are exactly `createdAt`, `language`, `name`, `email`, `message`, `consent`, `requestId` and `emailStatus`.
- The destination address is `danielbedrack@gmail.com`.
- Google Sheets must succeed before Gmail is attempted.
- A repeated `requestId` must not create another row or another Gmail attempt.
- An unknown Gmail outcome must never trigger an automatic resend.
- A real Google write or Gmail send requires action-time confirmation immediately before execution.

## Review Focus

- A visitor who has not explicitly consented must cause zero Google Sheets and Gmail calls; Task 2 owns this test.
- A Google Sheets timeout with an unknown write result must be inspected by `requestId` before any retry; Tasks 3 and 5 own this test.
- A duplicate confirmed submission must return `duplicate` with one sheet row and at most one Gmail attempt; Tasks 2 and 5 own this test.
- A stored lead whose Gmail result is failed or unknown must remain saved with the matching `emailStatus`; Tasks 4 and 5 own this test.
- Prompt-injection text inside the visitor's message must remain data and must not alter consent, destination, tool order or system instructions; Task 5 owns this test.

---

### Task 1: Update the Contact Contracts and Fixtures

**Files:**
- Modify: `chatbot/contracts/contact-request.schema.json`
- Modify: `chatbot/contracts/contact-result.schema.json`
- Create: `chatbot/test-fixtures/contact-cases.json`
- Modify: `chatbot/tests/contracts.test.mjs`
- Modify: `chatbot/tests/acceptance.test.mjs`

**Interfaces:**
- Consumes: `{ name, email, message, language, consent, sessionId }`.
- Produces: `{ requestId, status, stored, notificationAttempted, safeMessage }`, where `status` is `stored_and_notified | stored_notification_failed | stored_notification_unknown | duplicate | invalid | storage_failed`.

- [ ] **Step 1: Write failing contract tests**

Add tests named `requires explicit storage and email consent`, `requires a session identifier`, `accepts only the lead workflow statuses`, and `marks only stored statuses as stored`. Assert `language` is `he|en`, `consent` equals `true`, and unexpected properties fail validation.

- [ ] **Step 2: Run the contract tests and verify RED**

Run: `cd chatbot; npm test -- tests/contracts.test.mjs`

Expected: FAIL because the current schemas require caller-supplied `requestId` and still expose the old delivery statuses.

- [ ] **Step 3: Update the two schemas and contact fixtures**

Replace caller-supplied `requestId` with required `sessionId` in `ContactRequest`. Require the five exact `ContactResult` fields and six exact statuses from the Interfaces block. Add fictional fixtures for declined consent, missing fields, invalid email, valid Hebrew, valid English, duplicate, storage failure, Gmail failure and Gmail unknown.

Pin the result booleans as follows: `stored_and_notified`, `stored_notification_failed` and `stored_notification_unknown` use `stored: true` and `notificationAttempted: true`; `duplicate` uses `stored: true` and `notificationAttempted: false` for the current execution; `invalid` and `storage_failed` use both booleans as `false`.

- [ ] **Step 4: Run the focused and full repository tests**

Run: `cd chatbot; npm test -- tests/contracts.test.mjs; npm test`

Expected: PASS with zero failures.

- [ ] **Step 5: Commit**

```bash
git add chatbot/contracts chatbot/test-fixtures/contact-cases.json chatbot/tests
git commit -m "test: define durable portfolio lead contracts"
```

### Task 2: Build the Credential-Free Lead Subworkflow

**Files:**
- Create: `chatbot/workflows/save-portfolio-lead.json`
- Modify: `chatbot/tests/acceptance.test.mjs`
- Modify: `chatbot/docs/learning-log.md`

**Interfaces:**
- Consumes: validated `ContactRequest` through Execute Sub-workflow Trigger.
- Produces: a schema-valid `ContactResult`; in simulation mode performs no external calls.

- [ ] **Step 1: Add failing workflow assertions**

Assert that the exported workflow is inactive, begins with Execute Sub-workflow Trigger, contains validation before any external node, and has no credential values. Add cases proving declined consent and invalid email make zero adapter calls.

- [ ] **Step 2: Run the workflow assertions and verify RED**

Run: `cd chatbot; npm test -- tests/acceptance.test.mjs`

Expected: FAIL because `save-portfolio-lead.json` does not exist.

- [ ] **Step 3: Build the subworkflow in the n8n editor**

Create `Save Portfolio Lead` with Execute Sub-workflow Trigger, input normalization, consent/required-field/email validation, deterministic request-ID generation and a simulation switch. Generate `requestId` as SHA-256 of `sessionId`, normalized email and trimmed message without placing those source values in the identifier.

- [ ] **Step 4: Verify invalid and simulated executions**

Execute the declined-consent, invalid-email, simulated-success, simulated-failure and simulated-unknown fixtures.

Expected: invalid cases make zero adapter calls; all results match `ContactResult`; no real Google service is contacted.

- [ ] **Step 5: Export, sanitize and validate**

Export the inactive workflow to `chatbot/workflows/save-portfolio-lead.json`, remove execution data and credential bindings, then run `npm run validate:workflows` and `npm run check:secrets`.

Expected: both commands exit `0`.

- [ ] **Step 6: Record the node-by-node learning checkpoint and commit**

Document each node's input, output and reason for existing in `chatbot/docs/learning-log.md`.

```bash
git add chatbot/workflows/save-portfolio-lead.json chatbot/tests/acceptance.test.mjs chatbot/docs/learning-log.md
git commit -m "feat: add simulated portfolio lead subworkflow"
```

### Task 3: Add Durable Google Sheets Storage

**Files:**
- Modify: `chatbot/workflows/save-portfolio-lead.json`
- Create: `chatbot/docs/google-sheet-setup.md`
- Modify: `chatbot/docs/manual-test-matrix.md`
- Modify: `chatbot/tests/acceptance.test.mjs`

**Interfaces:**
- Consumes: a valid lead plus a user-created Google Sheets credential and private spreadsheet.
- Produces: one row keyed by `requestId`; returns `storage_failed` without attempting Gmail when storage is not confirmed.

- [ ] **Step 1: Add failing sheet-order and duplicate tests**

Assert that duplicate lookup precedes append, append precedes Gmail, the eight exact columns are mapped, sheet failure has `notificationAttempted: false`, and duplicate input returns `duplicate` without another append.

- [ ] **Step 2: Run the tests and verify RED**

Run: `cd chatbot; npm test -- tests/acceptance.test.mjs`

Expected: FAIL because the workflow has only simulated adapters.

- [ ] **Step 3: Create the private lead sheet and headers**

Create a spreadsheet named `Portfolio Chatbot Leads` owned by Daniel's Google account with one sheet named `Leads` and the eight exact headers from Global Constraints. Do not share it with anyone else.

- [ ] **Step 4: Pause for Daniel's Google Sheets authentication**

Open `Connect to Google Sheets` in local n8n and have Daniel complete Google OAuth himself. Do not request, view, copy or store passwords, OAuth codes or tokens.

- [ ] **Step 5: Add duplicate lookup, append and failure routing**

Configure Google Sheets nodes to look up `requestId`, append exactly one row when absent, and return `duplicate` when present. On a timeout or unknown append result, look up the same `requestId` before any retry.

- [ ] **Step 6: Verify one controlled fictional row**

After action-time confirmation, execute one `LOCAL TEST` fixture and inspect the sheet.

Expected: one row with the eight mapped columns, `emailStatus` equal to `not_attempted`, and no Gmail execution. The only allowed sheet values for `emailStatus` are `not_attempted`, `sent`, `failed` and `unknown`.

- [ ] **Step 7: Re-run the same request ID**

Expected: result `duplicate`, still one row, zero additional external writes.

- [ ] **Step 8: Export, sanitize, verify and commit**

Run: `cd chatbot; npm run validate:workflows; npm run check:secrets; npm test`

Expected: all commands exit `0`; the committed export contains no credential binding or spreadsheet ID.

```bash
git add chatbot/workflows/save-portfolio-lead.json chatbot/docs chatbot/tests/acceptance.test.mjs
git commit -m "feat: store consented portfolio leads in sheets"
```

### Task 4: Add Gmail Notification and Row Status Update

**Files:**
- Modify: `chatbot/workflows/save-portfolio-lead.json`
- Modify: `chatbot/docs/manual-test-matrix.md`
- Modify: `chatbot/tests/acceptance.test.mjs`

**Interfaces:**
- Consumes: a newly stored lead and a user-created Gmail credential.
- Produces: a plain-text notification to `danielbedrack@gmail.com`, then updates `emailStatus` to `sent`, `failed` or `unknown`.

- [ ] **Step 1: Add failing Gmail ordering and outcome tests**

Assert Gmail is unreachable unless append reports success, the recipient is fixed, the message contains only name/email/message/language/requestId, and each Gmail outcome maps to the documented status and sheet update.

- [ ] **Step 2: Run the tests and verify RED**

Run: `cd chatbot; npm test -- tests/acceptance.test.mjs`

Expected: FAIL because the sanitized workflow has no Gmail delivery path.

- [ ] **Step 3: Pause for Daniel's Gmail authentication**

Open `Connect to Gmail` in local n8n and have Daniel complete Google OAuth himself. Never request or inspect his password or OAuth token.

- [ ] **Step 4: Add Gmail and status-update nodes**

Send plain text with subject `Portfolio chatbot inquiry - <visitor name>`. Route confirmed send, confirmed failure and unknown result to the matching Google Sheets `emailStatus` update and `ContactResult` status. Never retry an unknown send automatically.

- [ ] **Step 5: Verify simulated failure and unknown outcomes**

Expected: one stored row; `emailStatus` is `failed` or `unknown`; no second Gmail attempt.

- [ ] **Step 6: Verify one controlled real notification**

After action-time confirmation, submit one fictional `LOCAL TEST` lead. Confirm the Gmail node success output and receipt in `danielbedrack@gmail.com` before accepting `stored_and_notified`.

- [ ] **Step 7: Export, sanitize, verify and commit**

Run: `cd chatbot; npm run validate:workflows; npm run check:secrets; npm test`

Expected: all commands exit `0`; no credential material, spreadsheet ID or real test PII appears in Git.

```bash
git add chatbot/workflows/save-portfolio-lead.json chatbot/docs/manual-test-matrix.md chatbot/tests/acceptance.test.mjs
git commit -m "feat: notify on stored portfolio leads"
```

### Task 5: Connect the Chat Agent and Run End-to-End Acceptance

**Files:**
- Modify: `chatbot/workflows/portfolio-chat.json`
- Modify: `chatbot/workflows/save-portfolio-lead.json`
- Modify: `chatbot/test-fixtures/chat-cases.json`
- Modify: `chatbot/tests/acceptance.test.mjs`
- Modify: `chatbot/docs/learning-log.md`
- Modify: `chatbot/docs/manual-test-matrix.md`

**Interfaces:**
- Consumes: ordinary portfolio chat plus explicit consent and validated contact fields.
- Produces: one call to `Save Portfolio Lead` and a localized response derived only from its structured result.

- [ ] **Step 1: Add failing conversation acceptance cases**

Cover Hebrew and English consent, consent refusal, premature personal-data request, invalid email correction, duplicate submission, storage failure, Gmail unknown and prompt injection inside the message. Assert that the AI Agent never controls Google Sheets or Gmail directly.

- [ ] **Step 2: Run the cases and verify RED**

Run: `cd chatbot; npm test -- tests/acceptance.test.mjs`

Expected: FAIL because the chat export lacks the single subworkflow tool.

- [ ] **Step 3: Obtain action-time confirmation and remove the two partial direct tools**

Delete only the uncredentialed Google Sheets Tool and Gmail Tool added directly to the AI Agent. Preserve Chat Trigger, AI Agent, Ollama Chat Model and all unrelated settings.

- [ ] **Step 4: Add one Call n8n Workflow Tool**

Name it `save_portfolio_lead`, point it to `Save Portfolio Lead`, expose only the six `ContactRequest` inputs, and describe that it may be called only after explicit consent and complete validation.

- [ ] **Step 5: Update the system message**

Add the disclosure in Hebrew and English, require consent before requesting personal details, prohibit direct success claims, and map each subworkflow status to a concise localized response.

- [ ] **Step 6: Run the credential-free chat matrix**

Verify refusal, invalid input, language switching, ordinary portfolio questions and prompt injection without executing real external writes.

- [ ] **Step 7: Run the controlled end-to-end test**

After action-time confirmation, submit one fictional `LOCAL TEST` inquiry and verify: one sheet row, one Gmail receipt, correct `emailStatus`, and one localized success response. Repeat the same request ID and verify no new row or email.

- [ ] **Step 8: Export, sanitize and run the full verification suite**

Run: `cd chatbot; npm run validate:knowledge; npm run validate:workflows; npm run check:secrets; npm test; docker compose config --quiet`

Expected: every command exits `0`; both workflows are inactive; exports contain no credentials, spreadsheet identifiers or real personal data.

- [ ] **Step 9: Complete the learning walkthrough and commit**

Daniel explains the consent boundary, request ID, duplicate lookup, fixed operation order, partial-success statuses and why unknown Gmail outcomes are not retried.

```bash
git add chatbot/workflows chatbot/test-fixtures chatbot/tests chatbot/docs
git commit -m "feat: connect durable portfolio lead capture"
```
