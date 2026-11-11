# Static Portfolio Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bilingual, browser-only portfolio chatbot that remains useful when Daniel's computer is offline and does not collect or transmit visitor data.

**Architecture:** A focused TypeScript static engine reads the existing approved `profile` and `projects` content, classifies the visitor's language and intent, and returns evidence-bound answers. An accessible React widget stores only the current tab's transcript in `sessionStorage`, exposes email contact through `mailto:`, and is gated by a Vite build flag so source can be reviewed without publishing it.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, Testing Library, Playwright, CSS Modules

**Spec:** `docs/superpowers/specs/2026-11-11-hybrid-portfolio-chatbot-design.md`

## Global Constraints

- Use only facts already exported by `src/content/profile.ts` and `src/content/projects.ts`; unknown claims must produce an explicit knowledge-gap response.
- Support Hebrew and English from the visitor's latest message; never answer in Chinese unless the latest message is Chinese, which is out of scope for this version.
- Job matching returns evidence, gaps, and follow-up questions without a numeric score.
- Do not collect a name, email address, message, lead, or consent record; contact is only `mailto:danielbedrack@gmail.com?subject=Portfolio%20inquiry`.
- Keep at most 20 visitor messages in one tab session and store transcript content only in `sessionStorage`, never `localStorage`.
- Enforce 2,000 characters for ordinary chat and 6,000 characters for job descriptions before processing.
- Do not add paid APIs, analytics, cookies, file upload, URL fetching, vector databases, or a new runtime dependency.
- Keep the widget disabled in production unless `VITE_PORTFOLIO_CHAT_ENABLED=true`; publishing or enabling the GitHub Pages build requires Daniel's separate explicit approval.

## Review Focus

- Mixed Hebrew/English input must select the language of the latest meaningful visitor text and preserve natural RTL when Hebrew wins.
- Empty, whitespace-only, control-character-only, and over-limit messages must be rejected locally without adding an assistant hallucination.
- Prompt-injection text that asks to reveal instructions or invent experience must receive only approved portfolio information or the knowledge-gap response.
- A job description containing repeated, punctuated, or differently cased skills must not duplicate evidence or report an approved skill as a gap.
- Corrupt `sessionStorage` data or storage denial must recover to an empty in-memory transcript without breaking the widget.

---

## File Map

- Create `src/chatbot/types.ts`: shared language, request, answer, intent, job-match, and transcript types.
- Create `src/chatbot/language.ts`: deterministic Hebrew/English detection.
- Create `src/chatbot/replies.ts`: bilingual UI and response copy only; no independent professional facts.
- Create `src/chatbot/staticEngine.ts`: intent routing, evidence-bound answers, and static job matching over approved content.
- Create `src/chatbot/session.ts`: tab-scoped session identifier and defensive `sessionStorage` transcript persistence.
- Create `src/chatbot/config.ts`: Vite feature-flag and input-limit constants.
- Create `src/components/chat/PortfolioChat.tsx`: launcher, accessible dialog, transcript, suggested questions, composer, state badge, and mail link.
- Create `src/styles/chatbot.module.css`: responsive LTR/RTL widget styles and reduced-motion/focus rules.
- Modify `src/app/App.tsx`: mount the widget only when the build flag is enabled.
- Create `src/test/chatbot-language.test.ts`: language and mixed-input tests.
- Create `src/test/chatbot-static-engine.test.ts`: intent, factual boundary, injection, limits, and job-match tests.
- Create `src/test/chatbot-session.test.ts`: storage, cap, corrupt-data, and denied-storage tests.
- Create `src/test/chatbot-ui.test.tsx`: accessible interaction, RTL, limits, mail link, and feature-flag tests.
- Create `e2e/chatbot.spec.ts`: browser, mobile, keyboard, storage, and refresh acceptance tests.
- Create `.env.example`: document the disabled-by-default widget flag without adding secrets.

### Task 1: Language and Static Answer Contracts

**Files:**
- Create: `src/chatbot/types.ts`
- Create: `src/chatbot/language.ts`
- Create: `src/test/chatbot-language.test.ts`

**Interfaces:**
- Consumes: raw visitor strings.
- Produces: `ChatLanguage = 'he' | 'en'`; `ChatIntent = 'identity' | 'experience' | 'skills' | 'projects' | 'project_detail' | 'job_match' | 'contact' | 'unknown'`; `ChatRequest { message: string; language?: ChatLanguage; requestType?: 'chat' | 'job_match' }`; `StaticChatAnswer { answer: string; language: ChatLanguage; intent: ChatIntent; suggestedQuestions: readonly string[]; projectSlug?: string }`; `JobMatchResult { language: ChatLanguage; evidence: readonly string[]; gaps: readonly string[]; followUpQuestions: readonly string[] }`; `detectChatLanguage(input: string): ChatLanguage`.

- [ ] **Step 1: Write the failing language tests**

Add tests named `detects Hebrew from Hebrew letters`, `detects English from Latin letters`, `uses the latest meaningful script in mixed input`, and `defaults empty or neutral input to English`. Assert that `detectChatLanguage('What is Daniel’s role? עברית')` is `he`, while `detectChatLanguage('עברית What is Daniel’s role?')` is `en`.

- [ ] **Step 2: Run the focused test and verify red**

Run: `npm run test:run -- src/test/chatbot-language.test.ts`

Expected: FAIL because `src/chatbot/language.ts` does not exist.

- [ ] **Step 3: Add the shared types and language detector**

Implement `detectChatLanguage(input: string): ChatLanguage` by scanning meaningful Hebrew and Latin letters from the end of the input; the last script encountered wins, and no letters returns `en`. Export the exact types in the Interfaces block from `src/chatbot/types.ts`.

- [ ] **Step 4: Run the focused test and verify green**

Run: `npm run test:run -- src/test/chatbot-language.test.ts`

Expected: PASS for all four language cases.

- [ ] **Step 5: Commit the language contract**

```bash
git add src/chatbot/types.ts src/chatbot/language.ts src/test/chatbot-language.test.ts
git commit -m "feat: add chatbot language contract"
```

### Task 2: Evidence-Bound Static Engine

**Files:**
- Create: `src/chatbot/replies.ts`
- Create: `src/chatbot/staticEngine.ts`
- Create: `src/test/chatbot-static-engine.test.ts`
- Read: `src/content/profile.ts`
- Read: `src/content/projects.ts`

**Interfaces:**
- Consumes: `ChatRequest`, `ChatLanguage`, `StaticChatAnswer`, and the existing `profile` and `projects` exports.
- Produces: `answerStaticChat(request: ChatRequest): StaticChatAnswer`; `analyzeStaticJobMatch(description: string, language: ChatLanguage): JobMatchResult`; `validateChatInput(message: string, requestType: 'chat' | 'job_match'): { ok: true; value: string } | { ok: false; reason: 'empty' | 'too_long' }`.

- [ ] **Step 1: Write failing validation and factual-answer tests**

Add tests that assert empty/control-only text returns `empty`, chat text at 2,001 characters returns `too_long`, job text at 6,001 characters returns `too_long`, and identity/experience/skills/project questions return only values found in `profile` or `projects`. Add Hebrew and English assertions and assert the project-detail answer returns the matching `projectSlug`.

- [ ] **Step 2: Write failing safety and Review Focus tests**

Add tests named `does not reveal instructions or invent experience`, `returns a knowledge gap for an unsupported fact`, and `deduplicates normalized job evidence and gaps`. The injection case must not contain system-prompt text, credentials, or the invented employer; the job case must match `TypeScript`, `React`, and `n8n` once each despite casing and punctuation, and must not contain a numeric score or percentage.

- [ ] **Step 3: Run the focused engine tests and verify red**

Run: `npm run test:run -- src/test/chatbot-static-engine.test.ts`

Expected: FAIL because the static engine and bilingual reply catalog do not exist.

- [ ] **Step 4: Implement input validation and intent routing**

Implement the three exported functions with deterministic keyword/alias matching. Build professional facts at call time from `profile` and `projects`; keep `replies.ts` limited to bilingual headings, prompts, fallback copy, and suggested questions so it cannot become a second factual source.

- [ ] **Step 5: Implement evidence-and-gap job analysis**

Normalize case, punctuation, and common aliases, deduplicate by canonical skill, and compare requested terms only with approved `profile.skills`, project technologies, roles, and summaries. Return follow-up questions for ambiguous requirements; never compute a score.

- [ ] **Step 6: Run engine and existing content tests**

Run: `npm run test:run -- src/test/chatbot-static-engine.test.ts src/test/content.test.ts`

Expected: PASS with no changes to approved portfolio content.

- [ ] **Step 7: Commit the static engine**

```bash
git add src/chatbot/replies.ts src/chatbot/staticEngine.ts src/test/chatbot-static-engine.test.ts
git commit -m "feat: add evidence-bound static chatbot engine"
```

### Task 3: Tab-Scoped Chat Session

**Files:**
- Create: `src/chatbot/session.ts`
- Create: `src/test/chatbot-session.test.ts`

**Interfaces:**
- Consumes: `ChatLanguage` and serializable visitor/assistant messages.
- Produces: `ChatMessage { id: string; role: 'visitor' | 'assistant'; text: string; language: ChatLanguage; source: 'visitor' | 'static' | 'ollama'; createdAt: string }`; `ChatSession { sessionId: string; messages: readonly ChatMessage[]; visitorMessageCount: number }`; `createSessionId(): string`; `loadChatSession(storage?: Storage): ChatSession`; `saveChatSession(session: ChatSession, storage?: Storage): void`; `appendChatMessage(session: ChatSession, message: ChatMessage): ChatSession`; `clearChatSession(storage?: Storage): ChatSession`.

- [ ] **Step 1: Write failing persistence and limit tests**

Assert the session ID remains stable through save/load in one tab, transcript JSON is written only under `portfolio-chat.session.v1`, no `localStorage` API is called, and appending the 21st visitor message throws `ChatSessionLimitError` without mutating the previous session.

- [ ] **Step 2: Write failing corrupt/denied storage tests**

Assert malformed JSON, a wrong schema version, and a `Storage` implementation that throws on get/set each return or preserve a valid empty in-memory session instead of throwing.

- [ ] **Step 3: Run the focused session test and verify red**

Run: `npm run test:run -- src/test/chatbot-session.test.ts`

Expected: FAIL because `src/chatbot/session.ts` does not exist.

- [ ] **Step 4: Implement defensive session persistence**

Use `crypto.randomUUID()` with a collision-resistant `crypto.getRandomValues` fallback, validate loaded JSON field-by-field, count only `role: 'visitor'` toward the 20-message cap, and catch storage access failures while retaining the returned in-memory object.

- [ ] **Step 5: Run the focused session test and verify green**

Run: `npm run test:run -- src/test/chatbot-session.test.ts`

Expected: PASS for persistence, cap, corruption, and denied-storage cases.

- [ ] **Step 6: Commit the session layer**

```bash
git add src/chatbot/session.ts src/test/chatbot-session.test.ts
git commit -m "feat: persist chatbot session per tab"
```

### Task 4: Accessible Static Chat Widget

**Files:**
- Create: `src/chatbot/config.ts`
- Create: `src/components/chat/PortfolioChat.tsx`
- Create: `src/styles/chatbot.module.css`
- Modify: `src/app/App.tsx`
- Create: `.env.example`
- Create: `src/test/chatbot-ui.test.tsx`

**Interfaces:**
- Consumes: `answerStaticChat`, `validateChatInput`, all session functions, and `profile.email`.
- Produces: `isPortfolioChatEnabled(envValue?: string): boolean`; `PortfolioChat(): JSX.Element`; a launcher named `Open portfolio assistant`; a dialog named `Daniel's portfolio assistant`; source label `מידע מהפורטפוליו` or `Portfolio information`.

- [ ] **Step 1: Write failing feature-flag and launcher tests**

Test `isPortfolioChatEnabled` for exact string `true` only. Render `App` with the flag disabled and assert no launcher; render `PortfolioChat` directly and assert the named launcher opens the named dialog.

- [ ] **Step 2: Write failing interaction, RTL, and limit tests**

Using `userEvent`, assert suggested questions and typed English/Hebrew messages add visitor and static assistant messages, Hebrew answers have `dir="rtl"`, empty input stays disabled, 2,001 characters display localized shortening copy, and the 21st visitor submission displays the localized session-limit copy.

- [ ] **Step 3: Write failing accessibility and contact tests**

Assert the dialog has an accessible title, focus moves into it when opened, Escape closes it and restores launcher focus, new replies use a polite `aria-live` region, and contact intent renders the exact `mailto:` URL without requesting personal data.

- [ ] **Step 4: Run the focused UI tests and verify red**

Run: `npm run test:run -- src/test/chatbot-ui.test.tsx`

Expected: FAIL because the widget and config do not exist.

- [ ] **Step 5: Implement the feature flag and static widget**

Mount `<PortfolioChat />` after `<PortfolioRoutes />` only when `isPortfolioChatEnabled(import.meta.env.VITE_PORTFOLIO_CHAT_ENABLED)` is true. Keep submission synchronous through `answerStaticChat`, persist after each accepted message, and derive `dir` from each message's language rather than from the page.

- [ ] **Step 6: Add responsive, focus, RTL, and reduced-motion styling**

Use the existing color/custom-property system; constrain the desktop panel, switch to an inset mobile sheet below 640px, preserve visible `:focus-visible`, use logical CSS properties, and remove nonessential transitions under `prefers-reduced-motion: reduce`.

- [ ] **Step 7: Document the local-only build flag**

Add `VITE_PORTFOLIO_CHAT_ENABLED=false` and a comment to `.env.example`; do not modify deployment workflows or GitHub repository settings.

- [ ] **Step 8: Run UI and accessibility regression tests**

Run: `npm run test:run -- src/test/chatbot-ui.test.tsx src/test/ui-accessibility.test.tsx src/test/homepage.test.tsx`

Expected: PASS with the existing portfolio routes and accessibility primitives unchanged.

- [ ] **Step 9: Commit the widget**

```bash
git add .env.example src/app/App.tsx src/chatbot/config.ts src/components/chat/PortfolioChat.tsx src/styles/chatbot.module.css src/test/chatbot-ui.test.tsx
git commit -m "feat: add accessible static portfolio chat"
```

### Task 5: Browser Acceptance and Static Release Gate

**Files:**
- Create: `e2e/chatbot.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: the enabled local widget built by Tasks 1-4.
- Produces: a documented local preview command and browser acceptance coverage; no public deployment.

- [ ] **Step 1: Add failing Playwright acceptance tests**

Cover desktop and 390x844 mobile viewports, keyboard open/send/close, Hebrew RTL, English reply, unknown question fallback, mail link, refresh preserving `sessionStorage`, a new browser context starting empty, no horizontal overflow, and no request to a non-portfolio origin during static answers.

- [ ] **Step 2: Run the browser test against an enabled preview and verify red**

Run in one terminal: `$env:VITE_PORTFOLIO_CHAT_ENABLED='true'; npm run build; npm run preview -- --host 127.0.0.1`

Run in another terminal: `npm run test:e2e -- e2e/chatbot.spec.ts`

Expected: at least one new acceptance assertion FAIL before final UI adjustments.

- [ ] **Step 3: Make only acceptance-driven UI adjustments**

Adjust the widget markup or CSS without changing approved content, storage policy, limits, or the disabled production default.

- [ ] **Step 4: Document local usage and the publication boundary**

Add a `Static chatbot preview` section to `README.md` with the PowerShell build/preview commands, state that it is free and browser-only, and state that GitHub Pages remains unchanged until Daniel separately approves enabling the build flag.

- [ ] **Step 5: Run the complete static release gate**

Run: `npm run check`

Run: `npm run test:e2e -- e2e/chatbot.spec.ts e2e/portfolio.spec.ts`

Expected: all TypeScript, ESLint, Vitest, content, resume, build, and Playwright checks PASS.

- [ ] **Step 6: Inspect the production output and repository diff**

Run: `rg -n "danielbedrack@gmail.com|VITE_PORTFOLIO_CHAT_ENABLED" dist src README.md .env.example`

Run: `git diff --check && git status --short`

Expected: the mail link and documented flag are present, no external AI endpoint is present, diff check is clean, and only planned files are modified.

- [ ] **Step 7: Commit the tested static chatbot**

```bash
git add e2e/chatbot.spec.ts README.md
git commit -m "test: verify static portfolio chatbot"
```

