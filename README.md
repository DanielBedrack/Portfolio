# Daniel Bedrack Portfolio

English-language professional portfolio for AI automation, systems integration and technical project-management roles. The site is a static React application with a work-first homepage, three case studies and an updated downloadable resume.

## Requirements

- Node.js 24, as specified in `.nvmrc`
- npm
- Chromium installed through Playwright for browser tests

## Local setup

```bash
npm ci
npx playwright install chromium
npm run dev
```

Vite prints the local development URL after startup. The production site uses the case-sensitive `/Portfolio/` base path.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run verify:content
npm run verify:resume
npm run build
npm run test:e2e
```

Run the complete non-browser gate with `npm run check`. Run the complete release gate with:

```bash
npm ci
npm run check
npm run test:e2e
```

## Production preview

```bash
npm run build
npm run preview -- --host 127.0.0.1
```

The browser-test server in `scripts/serve-dist.mjs` additionally reproduces GitHub Pages 404 recovery for direct case-study links.

## Static chatbot preview

The portfolio includes a free browser-only chatbot that answers from the same approved profile and project content used by the site. It stores the current transcript only in the tab's `sessionStorage`, sends no chat content to an external service, and uses a direct `mailto:` link for contact.

The widget is disabled by default. To build and preview it locally in PowerShell:

```powershell
$env:VITE_PORTFOLIO_CHAT_ENABLED='true'
npm run build
npm run preview -- --host 127.0.0.1
```

To run its browser acceptance tests:

```powershell
$env:VITE_PORTFOLIO_CHAT_ENABLED='true'
npm run test:e2e -- e2e/chatbot.spec.ts
```

GitHub Pages remains unchanged until Daniel separately approves enabling the build flag in a deployment. Building or testing the widget locally does not publish it.

## Optional local AI mode

The chatbot can optionally try Daniel's local Ollama/n8n stack through a narrow gateway and automatically fall back to the browser-only engine. The gateway exposes only health and chat routes, applies per-IP limits, saves no successful n8n execution payloads, and never exposes the n8n editor or Ollama directly.

This mode uses no paid AI API. It is designed for ngrok's limited Free plan; current quotas and terms must be rechecked before publication. When the computer or any local service is off—or the free quota is unavailable—visitors still receive the static portfolio answer.

Setup, privacy limits, shutdown behavior, and the manual security checklist are documented in [chatbot/docs/hybrid-local-setup.md](chatbot/docs/hybrid-local-setup.md). The tracked workflow remains inactive, the widget remains disabled in the default build, no real ngrok value is stored in Git, and GitHub Pages remains unchanged.

Offline verification recorded on 2026-11-11: the repository gate passed 77 Vitest tests plus typecheck, lint, content, resume, and production build; the static Playwright suite passed 25 tests with one intentional desktop skip; the fake-gateway hybrid suite passed 14 tests across desktop and mobile; the chatbot package passed 55 tests; the gateway passed 15 tests and built as a non-root Docker image. Live ngrok, live n8n activation, and live Ollama-through-ngrok verification have **not** been run and require Daniel's ignored local values and separate approval.

## Editing content

- Professional profile and experience: `src/content/profile.ts`
- Case-study content: `src/content/projects.ts`
- Content contracts: `src/content/types.ts`
- Route metadata: `src/app/routeMeta.ts`
- Resume: `public/Daniel-Bedrack-CV-2026.pdf`
- Visual tokens: `src/styles/tokens.css`

Keep client claims evidence-based. Do not publish credentials, customer data, private implementation artifacts or unverified metrics. The anonymous solar-energy client must remain unnamed, and Google Cloud Vision must not be listed unless Daniel verifies it.

## Deployment

Deployment is intentionally manual. After all checks pass and Daniel approves the content, visual presentation, updated resume and public contact details:

1. Open the repository's **Actions** tab on GitHub.
2. Select **Deploy GitHub Pages**.
3. Choose **Run workflow** for the exact approved commit.

The deployment workflow has only a `workflow_dispatch` trigger. Pushes and pull requests run verification through the separate CI workflow and cannot publish the site automatically.
