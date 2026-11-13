# Local AI Failover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the tested static portfolio chatbot so every visitor automatically uses Daniel's local Ollama workflow when it is reachable and falls back safely to the browser-only engine for every failure mode.

**Architecture:** The website talks only to a narrow TypeScript gateway through Daniel's free ngrok development domain. The gateway validates and rate-limits requests, calls the existing n8n Chat Trigger on the private Docker network, and normalizes its Ollama answer; the browser router caches health for 60 seconds and uses the static engine whenever health, chat, validation, or quota checks fail.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Node.js 24, Node HTTP server, Docker Compose, n8n 2.43.7, Ollama, ngrok Free, Vitest, Node test runner, Playwright

**Spec:** `docs/superpowers/specs/2026-11-11-hybrid-portfolio-chatbot-design.md`

## Global Constraints

- Complete and verify `docs/superpowers/plans/2026-11-11-static-portfolio-chatbot-implementation.md` first; this plan consumes its exact `ChatRequest`, `StaticChatAnswer`, session, and widget interfaces.
- The only public gateway routes are `GET /health` and `POST /chat`; every other route and method returns `404` or `405` without proxying.
- The gateway may send chat only to the configured internal n8n Chat Trigger URL and may probe only the fixed n8n and Ollama health URLs from environment configuration; never expose or proxy the n8n editor, n8n sign-in, arbitrary URLs, or Ollama.
- Accept `application/json` only; ordinary messages are limited to 2,000 characters and job descriptions to 6,000 characters.
- Enforce 5 requests per minute, 50 requests per day, and 5 job-match requests per day per client IP; state is in memory and may reset with the container.
- Browser health timeout is 1.5 seconds, chat timeout is 25 seconds, and the health result is cached for 60 seconds.
- n8n successful execution payloads for this local instance are disabled; gateway logs never contain message, answer, job-description, or session content.
- CORS is limited to `https://danielbedrack.github.io` in the deployed configuration; localhost development origins are opt-in through local environment configuration.
- Use the ngrok Free plan and assigned static development domain only; no payment method, paid API, VPS, automatic upgrade, or quota bypass.
- Keep real `NGROK_AUTHTOKEN`, ngrok domain, and any credentials only in ignored local `.env`; repository examples contain placeholders.
- Do not publish the site, activate a new public workflow, or paste an ngrok token without Daniel's explicit action/approval at the relevant execution step.

## Review Focus

- Spoofed forwarding headers, IPv6 addresses, and missing client addresses must map to a stable bounded rate-limit key without trusting arbitrary public input.
- Aborted browser requests and late n8n replies must release timers/sockets and must not produce an unhandled rejection or a second UI answer.
- n8n responses shaped as an array, `{ output }`, or malformed JSON must normalize only the approved string output and otherwise return safe `502`.
- An allowed origin with a path, suffix, alternate scheme, or attacker-controlled subdomain must not pass the exact Origin allowlist.
- A stale healthy cache followed by `429`, `502`, `503`, invalid JSON, or timeout must answer statically once and mark AI unavailable until the next 60-second probe.

---

## File Map

- Create `chatbot/gateway/package.json`: isolated TypeScript build/test scripts and no production framework dependency.
- Create `chatbot/gateway/package-lock.json`: deterministic gateway dependency installation and Docker build input.
- Create `chatbot/gateway/tsconfig.json`: Node 24 ESM compilation.
- Create `chatbot/gateway/src/contracts.ts`: request parsing and n8n response normalization.
- Create `chatbot/gateway/src/rateLimit.ts`: in-memory minute/day/job quotas keyed by normalized client address.
- Create `chatbot/gateway/src/n8nClient.ts`: fixed-destination n8n Chat Trigger adapter with timeout and safe errors.
- Create `chatbot/gateway/src/server.ts`: Node HTTP routes, exact CORS, body limits, status mapping, and content-free logging.
- Create `chatbot/gateway/tests/contracts.test.ts`: schema, length, response-shape, and hostile-input tests.
- Create `chatbot/gateway/tests/rateLimit.test.ts`: quota windows and address normalization tests.
- Create `chatbot/gateway/tests/server.test.ts`: route, CORS, timeout, error, and privacy tests against a fake n8n server.
- Create `chatbot/gateway/Dockerfile`: reproducible non-root gateway image.
- Create `src/chatbot/gatewayClient.ts`: browser health/chat client with AbortController timeouts.
- Create `src/chatbot/chatRouter.ts`: 60-second availability cache and one-way per-message fallback to `answerStaticChat`.
- Create `src/test/chatbot-gateway-client.test.ts`: browser contract and timeout tests.
- Create `src/test/chatbot-router.test.ts`: health cache, source selection, and fallback tests.
- Modify `src/components/chat/PortfolioChat.tsx`: asynchronous router and `ollama`/`static` source badge.
- Modify `src/chatbot/config.ts`: public gateway URL and exact timeout/cache constants.
- Modify `src/test/chatbot-ui.test.tsx`: pending state, fallback, and source-label tests.
- Modify `chatbot/compose.yaml`: add `portfolio-gateway` and `ngrok`, private networks, healthchecks, and no public n8n/Ollama exposure.
- Modify `chatbot/.env.example`: placeholder-only gateway/ngrok/n8n variables.
- Modify `.gitignore`: guarantee local chatbot `.env` and ngrok files containing tokens are ignored.
- Modify `chatbot/tests/config.test.mjs`: compose isolation, route, env, and secret-placeholder assertions.
- Modify `chatbot/workflows/portfolio-chat.json`: remove the lead tool from public chat behavior and align the approved prompt with mail-only contact.
- Modify `chatbot/tests/workflow-exports.test.mjs`: verify chat-trigger contract, no lead tool, no successful payload retention dependency, and approved model settings.
- Create `chatbot/docs/hybrid-local-setup.md`: free-account setup, manual activation, shutdown behavior, and troubleshooting.
- Create `e2e/chatbot-hybrid.spec.ts`: live/fake gateway AI mode and forced-offline fallback acceptance.

### Task 1: Gateway Request and Response Contract

**Files:**
- Create: `chatbot/gateway/package.json`
- Create: `chatbot/gateway/package-lock.json`
- Create: `chatbot/gateway/tsconfig.json`
- Create: `chatbot/gateway/src/contracts.ts`
- Create: `chatbot/gateway/tests/contracts.test.ts`

**Interfaces:**
- Consumes: HTTP body bytes and unknown n8n JSON.
- Produces: `GatewayLanguage = 'he' | 'en'`; `GatewayRequestType = 'chat' | 'job_match'`; `GatewayChatRequest { message: string; sessionId: string; language: GatewayLanguage; requestType: GatewayRequestType }`; `GatewayChatResponse { answer: string; language: GatewayLanguage; source: 'ollama' }`; `parseGatewayRequest(value: unknown): GatewayChatRequest`; `normalizeN8nResponse(value: unknown, language: GatewayLanguage): GatewayChatResponse`; typed `GatewayValidationError` with public code `invalid_request` or `message_too_long`.

- [ ] **Step 1: Add the isolated gateway package**

Set `type: module`, `engines.node: >=24`, runtime script `start: node dist/server.js`, build script `tsc -p tsconfig.json`, and test script `tsx --test tests/*.test.ts`; add only `typescript`, `tsx`, and `@types/node` as dev dependencies, then run `npm install --prefix chatbot/gateway --package-lock-only` to create the lockfile.

- [ ] **Step 2: Write failing request-validation tests**

Assert exact accepted fields and enum values, reject extra/missing/non-string fields, reject whitespace/control-only text, accept exactly 2,000 chat and 6,000 job characters, and reject one character more with `message_too_long`. Include prompt-injection text as ordinary untrusted string data rather than instructions.

- [ ] **Step 3: Write failing n8n normalization tests**

Accept `{ "output": "answer" }` and `[{ "output": "answer" }]`; reject empty output, multiple ambiguous items, HTML error pages, internal error objects, and malformed values with a safe validation error that does not include the payload.

- [ ] **Step 4: Run contract tests and verify red**

Run: `npm --prefix chatbot/gateway exec -- tsx --test tests/contracts.test.ts`

Expected: FAIL because `contracts.ts` does not exist.

- [ ] **Step 5: Implement the exact contract functions**

Validate with explicit TypeScript guards rather than adding a production schema library; count Unicode code points with `Array.from(message).length`; return only `{ answer, language, source: 'ollama' }` from accepted n8n shapes.

- [ ] **Step 6: Run contract tests and typecheck**

Run: `npm --prefix chatbot/gateway exec -- tsx --test tests/contracts.test.ts`

Run: `npm --prefix chatbot/gateway run build`

Expected: all contract tests PASS and TypeScript emits `dist` without errors.

- [ ] **Step 7: Commit the gateway contract**

```bash
git add chatbot/gateway/package.json chatbot/gateway/package-lock.json chatbot/gateway/tsconfig.json chatbot/gateway/src/contracts.ts chatbot/gateway/tests/contracts.test.ts
git commit -m "feat: define portfolio gateway contract"
```

### Task 2: In-Memory Abuse Limits

**Files:**
- Create: `chatbot/gateway/src/rateLimit.ts`
- Create: `chatbot/gateway/tests/rateLimit.test.ts`

**Interfaces:**
- Consumes: normalized client address, request type, and injected current time.
- Produces: `normalizeClientAddress(socketAddress: string | undefined, forwardedFor: string | undefined, trustProxy: boolean): string`; `RateLimitDecision { allowed: boolean; retryAfterSeconds?: number; reason?: 'minute' | 'day' | 'job_day' }`; `createRateLimiter(options?: { now?: () => number }): { check(clientKey: string, requestType: GatewayRequestType): RateLimitDecision; clear(): void }`.

- [ ] **Step 1: Write failing quota tests**

Assert requests 1-5 per minute pass and 6 fails, requests 1-50 per day pass and 51 fails, job requests 1-5 per day pass and 6 fails, normal chat remains allowed after the job-only limit when global limits permit, and the correct window reset restores access.

- [ ] **Step 2: Write failing address-normalization tests**

Assert IPv4-mapped IPv6 normalizes to IPv4, plain IPv6 remains stable, missing addresses become a shared bounded `unknown` key, and `X-Forwarded-For` is ignored unless `trustProxy` is true; when trusted, use only the first syntactically valid address.

- [ ] **Step 3: Run rate-limit tests and verify red**

Run: `npm --prefix chatbot/gateway exec -- tsx --test tests/rateLimit.test.ts`

Expected: FAIL because `rateLimit.ts` does not exist.

- [ ] **Step 4: Implement fixed-window in-memory counters**

Maintain minute/day buckets per client key, compute `retryAfterSeconds` from the limiting bucket, prune expired buckets on `check`, and never store request content or session IDs.

- [ ] **Step 5: Run rate-limit tests and verify green**

Run: `npm --prefix chatbot/gateway exec -- tsx --test tests/rateLimit.test.ts`

Expected: all quota, reset, and spoofing cases PASS.

- [ ] **Step 6: Commit the limiter**

```bash
git add chatbot/gateway/src/rateLimit.ts chatbot/gateway/tests/rateLimit.test.ts
git commit -m "feat: rate limit local portfolio gateway"
```

### Task 3: Fixed-Destination n8n Adapter and HTTP Gateway

**Files:**
- Create: `chatbot/gateway/src/n8nClient.ts`
- Create: `chatbot/gateway/src/server.ts`
- Create: `chatbot/gateway/tests/server.test.ts`

**Interfaces:**
- Consumes: validated `GatewayChatRequest`, `N8N_CHAT_URL`, exact origin allowlist, and the rate limiter.
- Produces: `createN8nClient(options: { chatUrl: URL; n8nHealthUrl: URL; ollamaHealthUrl: URL; requiredOllamaModel: string; timeoutMs: number; fetchImpl?: typeof fetch }): { send(request: GatewayChatRequest, signal?: AbortSignal): Promise<GatewayChatResponse>; health(signal?: AbortSignal): Promise<boolean> }`; `createGatewayServer(options: GatewayServerOptions): http.Server`; `loadGatewayConfig(env: NodeJS.ProcessEnv): GatewayConfig`; `startGateway(): Promise<http.Server>`.

- [ ] **Step 1: Write failing route and CORS tests**

Start the gateway on an ephemeral port with a fake n8n server. Assert `GET /health` and `POST /chat` behavior, exact allowed-Origin echo plus `Vary: Origin`, rejected suffix/path/scheme/subdomain origins, JSON-only chat, body-size rejection, `OPTIONS /chat`, `404` for `/`, `/rest`, `/signin`, `/webhook`, and arbitrary paths, and `405` for wrong methods.

- [ ] **Step 2: Write failing upstream and privacy tests**

Assert the n8n adapter posts `{ action: 'sendMessage', sessionId, chatInput: message }` only to the configured URL; maps unreachable/failed health to `503`, timeout to `503`, malformed n8n output to `502`, quota denial to `429` with `Retry-After`, and never includes URL, stack, request, response, session, or message text in public errors or captured logger arguments.

- [ ] **Step 3: Write failing abort/late-response tests**

Abort the browser-side request while fake n8n is delayed and assert the gateway closes cleanly; return n8n output after the internal timeout and assert exactly one safe response with no unhandled rejection.

- [ ] **Step 4: Run server tests and verify red**

Run: `npm --prefix chatbot/gateway exec -- tsx --test tests/server.test.ts`

Expected: FAIL because the adapter and server do not exist.

- [ ] **Step 5: Implement the n8n adapter**

Use `AbortSignal.timeout(25_000)` combined with any caller signal, send only the Chat Trigger body, and normalize via `normalizeN8nResponse`. Implement health as bounded probes to the configured n8n `/healthz` URL and Ollama `/api/tags` URL, returning true only when n8n is healthy and the response lists `qwen3:4b-instruct`; none of these destinations may be visitor-controlled.

- [ ] **Step 6: Implement the Node HTTP server**

Read at most 8 KiB before parsing, set security headers, apply exact-origin CORS before route handling, call validation then rate limiting then n8n, and log only event name, status, duration bucket, and opaque client-key hash.

- [ ] **Step 7: Run the complete gateway unit suite**

Run: `npm --prefix chatbot/gateway test`

Run: `npm --prefix chatbot/gateway run build`

Expected: all contract, rate-limit, server, timeout, and privacy tests PASS; TypeScript build succeeds.

- [ ] **Step 8: Commit the gateway server**

```bash
git add chatbot/gateway/src/n8nClient.ts chatbot/gateway/src/server.ts chatbot/gateway/tests/server.test.ts
git commit -m "feat: add private n8n portfolio gateway"
```

### Task 4: Browser Gateway Client and Automatic Fallback

**Files:**
- Create: `src/chatbot/gatewayClient.ts`
- Create: `src/chatbot/chatRouter.ts`
- Create: `src/test/chatbot-gateway-client.test.ts`
- Create: `src/test/chatbot-router.test.ts`
- Modify: `src/chatbot/config.ts`

**Interfaces:**
- Consumes: `ChatRequest`, `StaticChatAnswer`, `answerStaticChat`, session ID, and build-time `VITE_PORTFOLIO_CHAT_GATEWAY_URL`.
- Produces: `GatewayClient { health(): Promise<boolean>; chat(request: ChatRequest & { sessionId: string }): Promise<GatewayChatResponse> }`; `createGatewayClient(options: { baseUrl: URL; fetchImpl?: typeof fetch; healthTimeoutMs?: number; chatTimeoutMs?: number }): GatewayClient`; `RoutedChatAnswer = StaticChatAnswer & { source: 'static' | 'ollama' }`; `createChatRouter(options: { gateway?: GatewayClient; now?: () => number; staticAnswer?: typeof answerStaticChat; healthTtlMs?: number }): { answer(request: ChatRequest & { sessionId: string }): Promise<RoutedChatAnswer>; resetAvailability(): void }`.

- [ ] **Step 1: Write failing gateway-client tests**

Assert `/health` uses GET and aborts at 1,500 ms, `/chat` uses POST JSON and aborts at 25,000 ms, only valid `{ answer, language, source: 'ollama' }` is accepted, and non-2xx, invalid JSON, wrong source, and late responses reject with a content-free `GatewayClientError`.

- [ ] **Step 2: Write failing router/cache tests**

Assert one health probe is reused for 60,000 ms, an unhealthy probe never sends chat, a healthy AI response returns `source: ollama`, and network error, abort, `429`, `502`, `503`, malformed output, or a stale-positive chat failure returns exactly one static answer and marks the cached state unhealthy until the TTL expires.

- [ ] **Step 3: Run browser routing tests and verify red**

Run: `npm run test:run -- src/test/chatbot-gateway-client.test.ts src/test/chatbot-router.test.ts`

Expected: FAIL because the client and router do not exist.

- [ ] **Step 4: Add exact hybrid configuration constants**

Export `HEALTH_TIMEOUT_MS = 1_500`, `CHAT_TIMEOUT_MS = 25_000`, `HEALTH_TTL_MS = 60_000`, and `getPortfolioGatewayUrl(envValue?: string): URL | undefined`; reject non-HTTPS production URLs while allowing `http://127.0.0.1` and `http://localhost` for development/tests.

- [ ] **Step 5: Implement abort-safe client and single-answer router**

Use one `AbortController` per request, clear every timer in `finally`, validate public response fields, call the static engine at most once per visitor submission, and never retry the same message automatically after fallback.

- [ ] **Step 6: Run browser routing tests and typecheck**

Run: `npm run test:run -- src/test/chatbot-gateway-client.test.ts src/test/chatbot-router.test.ts`

Run: `npm run typecheck`

Expected: all routing/cache/failure tests PASS and TypeScript succeeds.

- [ ] **Step 7: Commit the hybrid router**

```bash
git add src/chatbot/config.ts src/chatbot/gatewayClient.ts src/chatbot/chatRouter.ts src/test/chatbot-gateway-client.test.ts src/test/chatbot-router.test.ts
git commit -m "feat: route portfolio chat with static fallback"
```

### Task 5: Hybrid Widget State

**Files:**
- Modify: `src/components/chat/PortfolioChat.tsx`
- Modify: `src/test/chatbot-ui.test.tsx`

**Interfaces:**
- Consumes: `createChatRouter`, `RoutedChatAnswer`, and existing static widget/session interfaces.
- Produces: asynchronous submit behavior; disabled composer while pending; source labels `AI מקומי`/`Local AI` and `מידע מהפורטפוליו`/`Portfolio information`.

- [ ] **Step 1: Add failing pending/source/fallback UI tests**

Inject a fake router and assert one submission while pending, no duplicate on Enter, Ollama answer label on success, static label on gateway failure, transcript preservation across source changes, and late resolution after unmount causes no state-update warning.

- [ ] **Step 2: Run the focused UI test and verify red**

Run: `npm run test:run -- src/test/chatbot-ui.test.tsx`

Expected: FAIL because the widget still calls the static engine synchronously.

- [ ] **Step 3: Integrate the asynchronous router**

Create one router per mounted widget, call it once per accepted visitor message, append the returned source to the assistant message, keep technical failures invisible, and use localized neutral pending copy without promising AI availability.

- [ ] **Step 4: Run UI, router, and session regression tests**

Run: `npm run test:run -- src/test/chatbot-ui.test.tsx src/test/chatbot-router.test.ts src/test/chatbot-session.test.ts`

Expected: PASS for AI, fallback, source-switch, unmount, and storage behavior.

- [ ] **Step 5: Commit the hybrid UI**

```bash
git add src/components/chat/PortfolioChat.tsx src/test/chatbot-ui.test.tsx
git commit -m "feat: show local ai with silent fallback"
```

### Task 6: Docker, n8n, and ngrok Isolation

**Files:**
- Create: `chatbot/gateway/Dockerfile`
- Modify: `chatbot/compose.yaml`
- Modify: `chatbot/.env.example`
- Modify: `.gitignore`
- Modify: `chatbot/tests/config.test.mjs`
- Modify: `chatbot/workflows/portfolio-chat.json`
- Modify: `chatbot/tests/workflow-exports.test.mjs`

**Interfaces:**
- Consumes: gateway `dist/server.js`, existing n8n workflow ID `d0RQFciCwOEUb4XJ`, Chat Trigger webhook ID `94c404d3-766e-4a0b-906c-517ad0b0815a`, and Windows Ollama at `host.docker.internal:11434`.
- Produces: private `n8n` and `portfolio-gateway` services plus ngrok forwarding only to `portfolio-gateway:8080`; placeholder variables `NGROK_AUTHTOKEN`, `NGROK_DOMAIN`, `N8N_CHAT_URL`, `N8N_HEALTH_URL`, `OLLAMA_HEALTH_URL`, `OLLAMA_MODEL`, `ALLOWED_ORIGINS`, and `TRUST_PROXY`.

- [ ] **Step 1: Extend failing configuration tests**

Assert `n8n` remains bound only to `127.0.0.1:5678`, gateway has no public host binding, ngrok target is exactly `portfolio-gateway:8080`, no Ollama service/port is public, both new services use `restart: unless-stopped`, the gateway healthcheck targets `/health`, and real-looking token/domain values are absent from tracked files.

- [ ] **Step 2: Extend failing workflow-export tests**

Assert the model remains `qwen3:4b-instruct` with `think: false`, `temperature: 0.2`, `numCtx: 4096`, and `numPredict: 256`; Chat Trigger webhook ID remains stable; the `save_portfolio_lead` node/connection and Google Sheet/Gmail contact disclosure are absent; mail-only contact copy is present; and the workflow stays inactive in the export until Daniel activates it locally.

- [ ] **Step 3: Run configuration/workflow tests and verify red**

Run: `npm --prefix chatbot test -- tests/config.test.mjs tests/workflow-exports.test.mjs`

Expected: FAIL because gateway/ngrok services and the public-chat prompt changes are not present.

- [ ] **Step 4: Add the reproducible non-root gateway image**

Use a multi-stage Node 24 Alpine Dockerfile: install from the gateway lockfile, build TypeScript, copy only runtime files, switch to the built-in non-root `node` user, expose 8080, and start `dist/server.js`.

- [ ] **Step 5: Add private Compose services and execution privacy**

Add `EXECUTIONS_DATA_SAVE_ON_SUCCESS=none` to n8n; add gateway with `N8N_CHAT_URL=http://n8n:5678/webhook/94c404d3-766e-4a0b-906c-517ad0b0815a/chat`, `N8N_HEALTH_URL=http://n8n:5678/healthz`, `OLLAMA_HEALTH_URL=http://host.docker.internal:11434/api/tags`, and `OLLAMA_MODEL=qwen3:4b-instruct`; add ngrok with `http --domain=${NGROK_DOMAIN} portfolio-gateway:8080`; pass secrets only from local environment; keep n8n's existing localhost binding and Ollama `extra_hosts` behavior.

- [ ] **Step 6: Remove lead collection from the public workflow export**

Delete the `save_portfolio_lead` node and its AI-tool connection, replace contact-flow prompt sections with bilingual mail-only guidance using Daniel's approved email, preserve approved profile/project facts and model settings, and keep `active: false` in Git.

- [ ] **Step 7: Add placeholders and ignore rules**

Document placeholder values in `chatbot/.env.example`, including `NGROK_AUTHTOKEN=replace_with_local_token` and `NGROK_DOMAIN=replace_with_free_static_domain`; ensure `.gitignore` covers `chatbot/.env`, all nested `.env` files except examples, gateway `dist`, and local ngrok config files.

- [ ] **Step 8: Run local config, workflow, secret, and image checks**

Run: `npm --prefix chatbot test`

Run: `npm --prefix chatbot run validate:workflows`

Run: `npm --prefix chatbot run check:secrets`

Run: `docker compose --env-file chatbot/.env.example -f chatbot/compose.yaml config`

Run: `docker build -t portfolio-gateway:test chatbot/gateway`

Expected: all tests/validators PASS, Compose resolves without exposing n8n/gateway publicly, and the gateway image builds.

- [ ] **Step 9: Commit the isolated local stack**

```bash
git add .gitignore chatbot/.env.example chatbot/compose.yaml chatbot/gateway/Dockerfile chatbot/tests/config.test.mjs chatbot/workflows/portfolio-chat.json chatbot/tests/workflow-exports.test.mjs
git commit -m "feat: isolate local ai gateway with ngrok"
```

### Task 7: Free Local Setup and End-to-End Verification

**Files:**
- Create: `chatbot/docs/hybrid-local-setup.md`
- Create: `e2e/chatbot-hybrid.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: the tested gateway image, Compose stack, free ngrok account/domain, locally active n8n workflow, Ollama model, and hybrid widget.
- Produces: reproducible free setup instructions and end-to-end evidence for AI available/unavailable transitions; still no public site deployment.

- [ ] **Step 1: Add fake-gateway hybrid Playwright tests**

Route the configured gateway in Playwright to simulate healthy Ollama, delayed health, chat timeout, `429`, `502`, `503`, invalid JSON, and recovery after 60 seconds. Assert the user sees exactly one answer each time, correct source labels, preserved transcript, and no technical error text.

- [ ] **Step 2: Run hybrid browser tests and verify red**

Run: `npm run test:e2e -- e2e/chatbot-hybrid.spec.ts`

Expected: at least one new transition or timing assertion FAIL before final integration adjustments.

- [ ] **Step 3: Make only integration-driven client/UI adjustments**

Fix contract, timing, or presentation mismatches without weakening exact CORS, limits, privacy, fallback, or disabled-by-default publication behavior.

- [ ] **Step 4: Write the free local setup guide**

Document: create/use an ngrok Free account without billing; copy the assigned static dev domain; place token/domain only in `chatbot/.env`; build and start Compose; import/update then manually activate `Portfolio Chat`; verify Ollama model; set the local Vite gateway URL; stop the stack; explain that computer/Docker/Ollama/ngrok downtime automatically means static mode and never incurs a charge.

- [ ] **Step 5: Add a manual security and privacy checklist**

Include exact checks for `GET /health`, valid bilingual `/chat`, `/rest` and `/signin` returning `404`, oversized input, rate limits, ngrok stopped, Ollama stopped, n8n stopped, absence of successful execution payloads, gateway logs without message content, and `git grep`/secret scan before any push.

- [ ] **Step 6: With Daniel present, enter only local ngrok values and start the stack**

Daniel supplies/pastes `NGROK_AUTHTOKEN` and `NGROK_DOMAIN` into ignored `chatbot/.env`; do not display or commit them. Run: `docker compose --env-file chatbot/.env -f chatbot/compose.yaml up -d --build`

Expected: n8n, gateway, and ngrok become healthy; no paid-plan or payment-method prompt is accepted.

- [ ] **Step 7: With Daniel's explicit approval, activate the local workflow and run live non-personal smoke tests**

Use one English and one Hebrew portfolio question with no personal data. Verify the public ngrok URL reaches only `/health` and `/chat`, the response source is `ollama`, the n8n editor remains localhost-only, and stopping Ollama yields a static browser answer.

- [ ] **Step 8: Run the full repository release gate**

Run: `npm run check`

Run: `npm run test:e2e -- e2e/portfolio.spec.ts e2e/chatbot.spec.ts e2e/chatbot-hybrid.spec.ts`

Run: `npm --prefix chatbot test && npm --prefix chatbot run validate:workflows && npm --prefix chatbot run check:secrets`

Run: `npm --prefix chatbot/gateway test && npm --prefix chatbot/gateway run build`

Run: `git diff --check && git status --short`

Expected: every automated check PASS, only planned files differ, and no secret or real ngrok token/domain is tracked.

- [ ] **Step 9: Record verification limits and publication hold**

Update `README.md` with the observed local/live results and date, explicitly distinguish fake-gateway tests from live ngrok/n8n/Ollama checks, and state that GitHub Pages remains unchanged until Daniel separately approves publishing the enabled widget and public gateway URL.

- [ ] **Step 10: Commit the verified hybrid documentation and tests**

```bash
git add README.md chatbot/docs/hybrid-local-setup.md e2e/chatbot-hybrid.spec.ts
git commit -m "test: verify hybrid portfolio chatbot failover"
```
