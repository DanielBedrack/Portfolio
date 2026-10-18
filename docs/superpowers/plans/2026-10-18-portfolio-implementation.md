# Daniel Bedrack Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, accessible, English-only portfolio that presents Daniel as an AI and Automation Developer and Technical Project Manager through three evidence-based case studies.

**Architecture:** A static React and TypeScript application built with Vite. Shared typed content drives both homepage cards and case-study routes; React Router provides navigation, while GitHub Actions verifies the project and holds a manual-only GitHub Pages release workflow until Daniel approves publication.

**Tech Stack:** React, TypeScript, Vite, React Router, CSS Modules plus global design tokens, Vitest, React Testing Library, Playwright, ESLint, GitHub Actions, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-10-18-portfolio-design.md`

## Global Constraints

- All public copy is English-only and targets salaried roles in Israeli companies.
- Primary positioning is `AI & Automation Developer | Technical Project Manager`.
- Visual direction is Calm Operator: warm off-white, deep green, muted terracotta, serif display type and readable sans-serif body type.
- Homepage layout is Work First; featured projects follow the hero.
- Featured projects are Megureit, AI Financial Document Processing and RemindMe, in that order.
- Optimate dates are March 2025 through September 2026; never render `Present` for this role.
- Megureit must credit the additional developer for Fireberry-Priority synchronization and iframe assistance.
- The solar-energy client remains anonymous; do not name Google Cloud Vision until Daniel verifies it.
- RemindMe is labeled `Work in Progress`; do not claim that real-device background notifications are verified.
- The site stores no visitor data and ships without analytics, authentication, database or server-side contact processing.
- No production deployment occurs before Daniel approves the local preview.
- No client data, credentials, private screenshots or unsupported metrics may enter the repository.

## Review Focus

- A direct request for `/portfolio/projects/remindme` on GitHub Pages must return the RemindMe case study rather than a platform 404; Task 5 owns the redirect and direct-route test.
- A project with no approved image must still render a complete text-first card and case study without broken-image UI; Tasks 2 and 5 own this test.
- Users requesting reduced motion must receive no entrance animation or smooth-scroll behavior; Tasks 3 and 8 own the CSS and browser test.
- External LinkedIn and GitHub links opened in a new tab must include `rel="noopener noreferrer"`; Task 6 owns this test.
- The downloadable CV must show Optimate ending in September 2026 and must not show that role as `Present`; Task 7 owns automated and visual verification.

---

## Planned File Structure

```text
portfolio/
  .github/workflows/
    ci.yml                         # Test, lint and build on pushes and pull requests
    deploy-pages.yml               # Manual-only GitHub Pages release
  docs/superpowers/
    specs/2026-10-18-portfolio-design.md
    plans/2026-10-18-portfolio-implementation.md
  e2e/
    portfolio.spec.ts              # Responsive, keyboard, routing and download checks
  public/
    404.html                       # GitHub Pages SPA redirect
    Daniel-Bedrack-CV-2026.pdf     # Updated and visually verified CV
    favicon.svg
    og-default.png                 # Approved social-sharing image
    robots.txt
    sitemap.xml
  scripts/
    verify-content.ts              # Build-time project and link validation
    verify-resume.mjs              # PDF identity and employment-date validation
  src/
    app/
      App.tsx                      # Route table and top-level shell
      routeMeta.ts                 # Per-route title, description and canonical path
    components/
      layout/
        Container.tsx
        Footer.tsx
        Navigation.tsx
      ui/
        ButtonLink.tsx
        ExternalLink.tsx
        ProjectCard.tsx
        SectionHeading.tsx
      sections/
        ContactSection.tsx
        EducationSection.tsx
        ExperienceSection.tsx
        FeaturedWork.tsx
        Hero.tsx
        ProcessSection.tsx
        SkillsSection.tsx
    content/
      profile.ts                   # Contact, positioning, experience and education
      projects.ts                  # Typed source of truth for all case studies
      types.ts                     # Content interfaces and status types
      validateContent.ts           # Runtime/build validation functions
    pages/
      HomePage.tsx
      NotFoundPage.tsx
      ProjectPage.tsx
    seo/
      Seo.tsx                      # Document metadata and structured profile data
    styles/
      globals.css                  # Reset, typography, accessibility and motion rules
      tokens.css                   # Calm Operator color, spacing and typography tokens
      components.module.css        # Shared component styling
      pages.module.css             # Page and responsive composition
    test/
      setup.ts
      content.test.ts
      homepage.test.tsx
      routing.test.tsx
      seo-contact.test.tsx
      ui-accessibility.test.tsx
    main.tsx
    vite-env.d.ts
  eslint.config.js
  index.html
  package.json
  package-lock.json
  playwright.config.ts
  tsconfig.app.json
  tsconfig.json
  vite.config.ts
  vitest.config.ts
```

### Task 1: Application Foundation and Test Harness

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `eslint.config.js`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `src/main.tsx`
- Create: `src/vite-env.d.ts`
- Create: `src/app/App.tsx`
- Create: `src/test/setup.ts`
- Test: `src/test/routing.test.tsx`

**Interfaces:**
- Consumes: approved design spec only
- Produces: `App(): JSX.Element`, npm scripts `dev`, `build`, `preview`, `test`, `test:run`, `lint`, `typecheck` and `check`

- [ ] **Step 1: Scaffold the Vite React TypeScript application and install runtime and test dependencies**

Install React, React DOM, React Router, Vite, TypeScript, Vitest, React Testing Library, `@testing-library/jest-dom`, `@testing-library/user-event`, jsdom and ESLint. Commit the generated lockfile; do not add a UI framework.

- [ ] **Step 2: Write the failing application-shell test**

Create `src/test/routing.test.tsx` with `renders the application shell`, asserting that `<App />` renders a `main` landmark and a navigation landmark.

- [ ] **Step 3: Run the test and verify the expected failure**

Run: `npm run test:run -- src/test/routing.test.tsx`

Expected: FAIL because the shell and landmarks are not implemented.

- [ ] **Step 4: Implement the minimal application shell**

Export `function App(): JSX.Element` from `src/app/App.tsx`; mount it from `src/main.tsx`. Render only the landmarks required by the failing test.

- [ ] **Step 5: Run foundation checks**

Run: `npm run test:run -- src/test/routing.test.tsx && npm run typecheck && npm run lint && npm run build`

Expected: all commands exit `0` and Vite writes `dist/`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json index.html vite.config.ts vitest.config.ts eslint.config.js tsconfig.json tsconfig.app.json src
git commit -m "chore: scaffold portfolio application"
```

### Task 2: Typed Portfolio Content and Validation

**Files:**
- Create: `src/content/types.ts`
- Create: `src/content/profile.ts`
- Create: `src/content/projects.ts`
- Create: `src/content/validateContent.ts`
- Create: `scripts/verify-content.ts`
- Test: `src/test/content.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: none
- Produces: `Project`, `ProjectStatus`, `ProjectSection`, `Profile`, `projects: readonly Project[]`, `profile: Profile`, `getProjectBySlug(slug: string): Project | undefined`, `validatePortfolioContent(projects: readonly Project[], profile: Profile): string[]`

- [ ] **Step 1: Define the failing content-contract tests**

Test that:

- exactly three projects exist in the approved order;
- slugs are `megureit`, `financial-document-automation` and `remindme`;
- Megureit contains the collaboration credit;
- the financial project exposes `clientDisplayName: "Solar energy company"` and contains no unverified provider name;
- RemindMe has `status: "work-in-progress"` and includes its verification limits;
- Optimate ends in `September 2026` and contains no `Present` value;
- `validatePortfolioContent` returns an error for a missing title, duplicate slug or missing outcome;
- optional `image` may be absent without validation failure.

- [ ] **Step 2: Run the content tests and verify failure**

Run: `npm run test:run -- src/test/content.test.ts`

Expected: FAIL because the types, content and validator do not exist.

- [ ] **Step 3: Implement the typed content source**

Define exact interfaces in `types.ts`; populate `profile.ts` and `projects.ts` only with approved facts from the spec. Keep project sections structured rather than storing page-sized HTML strings.

- [ ] **Step 4: Implement validation and the build-time script**

`validatePortfolioContent` returns human-readable errors without throwing. `scripts/verify-content.ts` calls it, prints every error and exits nonzero when errors exist. Add `verify:content` to `package.json` and include it in `check`.

- [ ] **Step 5: Run the content checks**

Run: `npm run test:run -- src/test/content.test.ts && npm run verify:content`

Expected: all content tests pass and the script reports zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/content src/test/content.test.ts scripts/verify-content.ts package.json package-lock.json
git commit -m "feat: add verified portfolio content model"
```

### Task 3: Calm Operator Design System and UI Primitives

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/globals.css`
- Create: `src/styles/components.module.css`
- Create: `src/components/layout/Container.tsx`
- Create: `src/components/ui/ButtonLink.tsx`
- Create: `src/components/ui/ProjectCard.tsx`
- Create: `src/components/ui/SectionHeading.tsx`
- Test: `src/test/ui-accessibility.test.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `Project` from Task 2
- Produces: `Container`, `ButtonLink`, `ProjectCard` and `SectionHeading` components; global design-token custom properties; `.motion-enter` behavior disabled under reduced motion

- [ ] **Step 1: Write failing primitive and accessibility tests**

Assert that `ButtonLink` renders a real anchor, `ProjectCard` renders its title/status without requiring an image, headings retain the requested level and every interactive element has an accessible name.

- [ ] **Step 2: Run the test and verify failure**

Run: `npm run test:run -- src/test/ui-accessibility.test.tsx`

Expected: FAIL because components and styles do not exist.

- [ ] **Step 3: Implement Calm Operator tokens and global rules**

Define named custom properties for off-white surfaces, deep-green text/actions, muted-terracotta accent, borders, focus rings, spacing, radii, content widths and typography. Add global focus-visible, selection, responsive typography and `prefers-reduced-motion` rules. Smooth scrolling must be disabled inside the reduced-motion media query.

- [ ] **Step 4: Implement the four primitives**

Keep components presentational. `ProjectCard` accepts `{ project: Project; featured?: boolean }` and renders text-first when `project.image` is absent.

- [ ] **Step 5: Run tests and static checks**

Run: `npm run test:run -- src/test/ui-accessibility.test.tsx && npm run typecheck && npm run lint`

Expected: all commands pass.

- [ ] **Step 6: Commit**

```bash
git add src/styles src/components src/main.tsx src/test/ui-accessibility.test.tsx
git commit -m "feat: add calm operator design system"
```

### Task 4: Work-First Homepage

**Files:**
- Create: `src/components/layout/Navigation.tsx`
- Create: `src/components/layout/Footer.tsx`
- Create: `src/components/sections/Hero.tsx`
- Create: `src/components/sections/FeaturedWork.tsx`
- Create: `src/components/sections/ProcessSection.tsx`
- Create: `src/components/sections/ExperienceSection.tsx`
- Create: `src/components/sections/SkillsSection.tsx`
- Create: `src/components/sections/EducationSection.tsx`
- Create: `src/components/sections/ContactSection.tsx`
- Create: `src/pages/HomePage.tsx`
- Create: `src/styles/pages.module.css`
- Test: `src/test/homepage.test.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `profile`, `projects` and UI primitives from Tasks 2-3
- Produces: `HomePage(): JSX.Element`, section anchors `work`, `experience` and `contact`

- [ ] **Step 1: Write failing homepage tests**

Assert the approved hero title and value proposition, availability line, three project cards in order, Megureit marked featured, process sequence `Discover`, `Design`, `Build`, `Test`, `Deploy`, corrected Optimate dates and navigation links to the three section anchors.

- [ ] **Step 2: Run the homepage tests and verify failure**

Run: `npm run test:run -- src/test/homepage.test.tsx`

Expected: FAIL because homepage sections are not implemented.

- [ ] **Step 3: Implement Navigation, Hero and Featured Work**

Use semantic `header`, `nav`, `main` and `section` elements. The hero's primary button targets `#work`; the resume link targets `/portfolio/Daniel-Bedrack-CV-2026.pdf` and may remain visually disabled until Task 7 adds the approved file.

- [ ] **Step 4: Implement Process, Experience, Skills, Education, Contact and Footer**

Render all copy from the typed content source. Do not duplicate experience dates or project descriptions inside components.

- [ ] **Step 5: Implement responsive Work-First composition**

Megureit receives the larger project-card treatment on desktop. All project cards stack into one column below the mobile breakpoint. Confirm no fixed width can create horizontal overflow.

- [ ] **Step 6: Run homepage and regression checks**

Run: `npm run test:run -- src/test/homepage.test.tsx src/test/content.test.ts src/test/ui-accessibility.test.tsx && npm run check`

Expected: all tests and static checks pass.

- [ ] **Step 7: Commit**

```bash
git add src/components src/pages/HomePage.tsx src/styles/pages.module.css src/app/App.tsx src/test/homepage.test.tsx
git commit -m "feat: build work-first portfolio homepage"
```

### Task 5: Case Studies, Routing and GitHub Pages Deep Links

**Files:**
- Create: `src/pages/ProjectPage.tsx`
- Create: `src/pages/NotFoundPage.tsx`
- Create: `public/404.html`
- Test: `src/test/routing.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: `getProjectBySlug`, `Project` and shared layout components
- Produces: routes `/`, `/projects/:slug`, `*`; `ProjectPage(): JSX.Element`; `NotFoundPage(): JSX.Element`; GitHub Pages base `/portfolio/`

- [ ] **Step 1: Add failing route tests**

Test the homepage, each approved project slug, an unknown project slug and a wholly unknown route. Assert that unknown content renders the custom 404 rather than an empty shell. Assert RemindMe displays `Work in Progress` and the unverified mobile limitations.

- [ ] **Step 2: Add the failing text-first case-study test**

Render a project without `image` and assert that every approved section remains visible and no broken `img` element is rendered.

- [ ] **Step 3: Run route tests and verify failure**

Run: `npm run test:run -- src/test/routing.test.tsx`

Expected: FAIL because routes and project pages do not exist.

- [ ] **Step 4: Implement React Router routes and case-study layout**

Use `BrowserRouter` with basename `/portfolio`. `ProjectPage` resolves `slug` through `getProjectBySlug`; missing projects render `NotFoundPage`. Render the shared case-study sequence from the spec and include a back-to-work link plus contact call to action.

- [ ] **Step 5: Implement GitHub Pages direct-route recovery**

Set Vite base to `/portfolio/`. Add `public/404.html` that preserves the requested path in a query parameter and redirects to `/portfolio/`; add startup restoration in `src/main.tsx` before React mounts. Keep the logic focused in an exported `restoreGitHubPagesPath(location: Location, history: History): void` function so it can be unit tested.

- [ ] **Step 6: Test the redirect helper**

Assert that `/portfolio/?p=%2Fprojects%2Fremindme` restores `/portfolio/projects/remindme`, while a normal homepage URL remains unchanged.

- [ ] **Step 7: Run route and build checks**

Run: `npm run test:run -- src/test/routing.test.tsx && npm run build`

Expected: route tests pass, `dist/404.html` exists and the production build exits `0`.

- [ ] **Step 8: Commit**

```bash
git add src/app src/pages src/main.tsx src/test/routing.test.tsx public/404.html vite.config.ts
git commit -m "feat: add case studies and resilient routing"
```

### Task 6: Metadata, Safe External Links and Contact Actions

**Files:**
- Create: `src/app/routeMeta.ts`
- Create: `src/seo/Seo.tsx`
- Create: `src/components/ui/ExternalLink.tsx`
- Test: `src/test/seo-contact.test.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/ProjectPage.tsx`
- Modify: `src/components/sections/ContactSection.tsx`
- Modify: `index.html`

**Interfaces:**
- Consumes: current route and typed profile/project content
- Produces: `getRouteMeta(pathname: string): RouteMeta`, `Seo({ meta }: { meta: RouteMeta }): JSX.Element`, `ExternalLink`, contact URLs for email, LinkedIn and GitHub

- [ ] **Step 1: Write failing metadata and contact tests**

Assert a unique title and description for `/` and each project, a default for unknown paths, canonical paths under `/portfolio/`, Open Graph values, JSON-LD person data, `mailto:danielbedrack@gmail.com?subject=Portfolio%20inquiry`, and the approved LinkedIn/GitHub URLs from the CV.

- [ ] **Step 2: Add the failing external-link security test**

Assert that links with `target="_blank"` render `rel="noopener noreferrer"`.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm run test:run -- src/test/seo-contact.test.tsx`

Expected: FAIL because metadata and safe link components do not exist.

- [ ] **Step 4: Implement route metadata and the SEO component**

Update `document.title`, description, canonical, Open Graph and JSON-LD when routes change. Use the current `window.location.origin` plus the route path; do not hardcode a production domain that has not been selected.

- [ ] **Step 5: Implement contact and external-link behavior**

Publish email, LinkedIn and GitHub; exclude the phone number. Use `ExternalLink` for every new-tab link. Keep contact actions as links rather than a data-submitting form.

- [ ] **Step 6: Run SEO/contact and regression checks**

Run: `npm run test:run -- src/test/seo-contact.test.tsx && npm run check`

Expected: all checks pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/routeMeta.ts src/seo src/components/ui/ExternalLink.tsx src/components/sections/ContactSection.tsx src/pages index.html src/test/seo-contact.test.tsx
git commit -m "feat: add portfolio metadata and contact links"
```

### Task 7: Updated Resume and Public Static Assets

**Files:**
- Create: `public/Daniel-Bedrack-CV-2026.pdf`
- Create: `public/favicon.svg`
- Create: `public/og-default.png`
- Create: `public/robots.txt`
- Create: `public/sitemap.xml`
- Create: `scripts/verify-resume.mjs`
- Modify: `package.json`
- Modify: `src/components/sections/Hero.tsx`

**Interfaces:**
- Consumes: approved contact information, employment dates and visual tokens
- Produces: downloadable updated PDF, stable public asset paths, `verify:resume` npm script

- [ ] **Step 1: Add a failing resume verification script**

`verify-resume.mjs` must fail when the PDF is absent, does not begin with the PDF signature, does not contain extractable `September 2026`, or still pairs Optimate with `Present`. Add the minimal PDF text-extraction development dependency and include `verify:resume` in `check`.

- [ ] **Step 2: Run the resume verification and confirm failure**

Run: `npm run verify:resume`

Expected: FAIL because the updated PDF does not exist.

- [ ] **Step 3: Create the updated CV PDF**

Use the PDF/document artifact workflow to reproduce the supplied CV with Optimate ending in September 2026. Preserve all other approved content unless Daniel requests a correction. Save only the approved result at `public/Daniel-Bedrack-CV-2026.pdf`.

- [ ] **Step 4: Render and visually inspect the PDF**

Render every page to PNG. Confirm readable text, no clipping or overlap, consistent spacing and the corrected Optimate date. Obtain Daniel's content approval before treating the file as final.

- [ ] **Step 5: Create branded static assets**

Create a simple DB monogram favicon and a 1200 by 630 social image using the approved Calm Operator palette and primary positioning. Add `robots.txt` and a sitemap containing the homepage and three project paths under `/portfolio/`.

- [ ] **Step 6: Enable and test the resume action**

Remove any disabled state from the Hero resume link. Run: `npm run verify:resume && npm run build`.

Expected: resume verification passes and the PDF plus public assets exist in `dist/`.

- [ ] **Step 7: Commit**

```bash
git add public scripts/verify-resume.mjs package.json package-lock.json src/components/sections/Hero.tsx
git commit -m "feat: add updated resume and public assets"
```

### Task 8: Browser, Responsive and Accessibility Verification

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/portfolio.spec.ts`
- Modify: `package.json`
- Modify: UI or styles only when a failing test identifies a defect

**Interfaces:**
- Consumes: complete application and production preview
- Produces: npm scripts `test:e2e` and `test:e2e:headed`; browser coverage for critical user journeys

- [ ] **Step 1: Configure Playwright against the production preview**

Configure a web server that runs `npm run build && npm run preview -- --host 127.0.0.1`, and test Chromium at desktop and a 390 by 844 mobile viewport.

- [ ] **Step 2: Write critical-path browser tests**

Test homepage navigation, all project routes, back-to-work, unknown-route 404, email/GitHub/LinkedIn links and CV download. Assert the page has no horizontal overflow at 390 pixels.

- [ ] **Step 3: Write keyboard and reduced-motion tests**

Tab through navigation and calls to action, assert visible focus, emulate `reducedMotion: "reduce"`, and assert `.motion-enter` has no animation and root scrolling is not smooth.

- [ ] **Step 4: Write the GitHub Pages direct-link test**

Request `/portfolio/projects/remindme` through a test server that serves `404.html` for unknown files; follow the redirect and assert the RemindMe heading and `Work in Progress` label appear.

- [ ] **Step 5: Run Playwright and fix only demonstrated failures**

Run: `npm run test:e2e`

Expected: all desktop and mobile projects pass with no retries required.

- [ ] **Step 6: Run the full local verification suite**

Run: `npm run check && npm run test:e2e`

Expected: typecheck, lint, content validation, resume validation, unit tests, build and browser tests all pass.

- [ ] **Step 7: Commit**

```bash
git add playwright.config.ts e2e package.json package-lock.json src
git commit -m "test: cover portfolio user journeys"
```

### Task 9: CI, Manual Deployment Workflow and Final Review

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy-pages.yml`
- Modify: `README.md`
- Modify: files identified by final verification only

**Interfaces:**
- Consumes: npm `check` and `test:e2e` scripts
- Produces: CI on pushes and pull requests; manual-only `workflow_dispatch` Pages deployment; documented local and release commands

- [ ] **Step 1: Add CI workflow**

On pushes and pull requests, check out the repository, install the locked dependencies, install Playwright Chromium, run `npm run check` and run `npm run test:e2e`. Grant read-only repository permissions.

- [ ] **Step 2: Add the manual-only Pages workflow**

Trigger only with `workflow_dispatch`. Build the exact commit, upload `dist/` with the official Pages artifact action and deploy with the official Pages action. Do not add a push trigger.

- [ ] **Step 3: Document development and release commands**

The README must document setup, development, all verification commands, local production preview, manual deployment location, content-editing files and the requirement for Daniel's approval before deployment.

- [ ] **Step 4: Run the final local checks**

Run: `npm ci && npm run check && npm run test:e2e`

Expected: every command exits `0` from a clean dependency installation.

- [ ] **Step 5: Run release-quality manual review**

Inspect desktop and mobile screenshots for the homepage, all three case studies and 404 page. Run Lighthouse against the production preview and resolve material accessibility, performance, best-practice or SEO failures. Confirm no console errors, broken links, credentials, private customer data or unsupported claims.

- [ ] **Step 6: Present the local preview to Daniel**

Keep publication disabled. Provide the local preview and ask Daniel to approve content, visual presentation, updated CV and public contact details.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows README.md
git commit -m "ci: add portfolio verification and manual release"
```

Publication is a separate, explicit step after Daniel approves the completed local preview. Do not run the manual deployment workflow during implementation.
