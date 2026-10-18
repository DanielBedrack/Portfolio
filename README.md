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
