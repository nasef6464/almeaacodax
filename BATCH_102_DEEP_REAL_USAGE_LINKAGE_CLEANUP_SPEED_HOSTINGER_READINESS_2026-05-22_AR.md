# BATCH 102 - Deep Real Usage, Linkage, Cleanup, Speed, and Hostinger Readiness

Date: 2026-05-22

## Initial State

- Previous handoff required a deep readiness batch instead of more tiny production rechecks.
- Production had recent Vercel/Render smoke confirmations, but Hostinger/VPS, Docker, env docs, and package/path navigation needed real source verification.
- Dirty/untracked historical files existed before this batch and were left untouched.

## Inspected

- Frontend: React/Vite/TypeScript route shell, `App.tsx`, `pages/GenericPathPage.tsx`, `components/LearningSection.tsx`, `pages/CourseView.tsx`.
- Backend: Express/TypeScript server scripts, env examples, routes/models through source search.
- Deployment: absence of `deploy/` and Docker files confirmed before this batch.
- Runtime URLs: `services/api.ts`, `App.tsx`, `index.html`.
- Existing reports: `PROJECT_STATUS.md`, `CODEX_HANDOFF.md`, `docs/NEXT_SESSION_HANDOVER_AR.md`, `docs/SPARK_BATCH_LEDGER_AR.md`.

## Already Done Before This Batch

- Admin question bank CRUD had prior runtime verification in BATCH 100P.
- Production health/frontend strict checks were repeatedly closed through BATCH 100AD.
- Payment tampering, package revenue, route loading, health readiness, and security smokes already existed.

## Bugs Found And Fixed

- Fixed package buttons in `pages/GenericPathPage.tsx` that could fallback to `/course/${pkg.id}`.
- Active packages now stay in `/category/${path.id}?tab=packages&package=${pkg.id}` or include `subject=${packageSubjectId}` when present.
- Real courses still navigate to `/course/${course.id}` through course cards.
- Runtime API URL is no longer hardcoded to the old Render URL in `services/api.ts`; it now uses `VITE_API_URL`, runtime override, `/api` for deployed same-origin, or localhost for local dev.
- SEO base URL in `App.tsx` now uses `VITE_PUBLIC_SITE_URL` / `VITE_SITE_URL` / current origin instead of a fixed Vercel URL.
- Removed old Render preconnect/dns-prefetch lock-in from `index.html`.

## Added

- Package navigation smoke: `scripts/smoke-package-path-navigation-contract.mjs`.
- Real usage readiness smoke: `scripts/smoke-real-usage-readiness-contract.mjs`.
- Hostinger/PM2/Nginx deployment templates under `deploy/hostinger/`.
- Docker frontend/backend/compose/Nginx templates.
- Env examples and environment reference.
- MongoDB/uploads backup and restore scripts plus docs.
- Linkage, performance, cleanup, unused files, feature activation, and security audit docs.

## Risky / Skipped

- No database schema changes.
- No dashboard refactor.
- No deletion of suspected unused files.
- Historical reports with old URLs were not edited.
- Real payment, email, WhatsApp, AI, and Sentry activation still need owner secrets.

## Final Readiness Verdict

- Real usage: PARTIAL. Core package/path bug is fixed and source/build checks pass, but real payment/WhatsApp/email/AI require owner secrets and live dry-runs.
- Hostinger VPS: PARTIAL to YES for file readiness. Templates exist and `docker compose config` passes, but actual VPS IP/domain/env/SSL must be supplied by owner.
- Docker: YES for configuration syntax; image build was not fully executed in this batch.

## Commands Run

- PASS: `npm run smoke:package-path-navigation`
- PASS: `npm run smoke:package-course-split`
- PASS: `npm run smoke:real-usage-readiness`
- PASS: `npm run smoke:performance`
- PASS: `npm run typecheck`
- PASS: `npm run build`
- PASS: `npm run server:check`
- PASS: `npm run server:build`
- PASS: `npm run smoke:frontend:strict`
- PASS with timing warnings: `npm run smoke:production-speed`
- PASS: `npm run smoke:payment-package`
- PASS: `npm run smoke:health-readiness`
- PASS after compose env-file fix: `docker compose config`
- FAIL with known dependency advisories: `npm audit --omit=dev`
- FAIL with known dependency advisories: `npm --prefix server audit --omit=dev`

## Audit Blockers

- Frontend dependency audit reports vulnerable `protobufjs`, `quill` through `react-quill-new`, `ws`, and `xlsx`; `xlsx` has no fix available in the current audit output.
- Server audit reports `ws` through Socket.IO dependencies.
- `smoke:production-speed` completed but warned on frontend shell, API health, course list, and announcement ads timing.
