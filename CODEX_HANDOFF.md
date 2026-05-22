# CODEX HANDOFF - ALMEAA CODAX

Last updated: 2026-05-22

## Current Session Summary

`BATCH 103 - Dependency Audit and Speed Blockers Closure` is closed.

Outcome:
- server dependency advisories were resolved (`0 vulnerabilities` on server audit),
- frontend advisories reduced to residual `quill` (breaking-only fix path) and `xlsx` (no patch available),
- performance warnings reduced to one warning,
- production behavior preserved with passing builds/smokes.

`BATCH 102 - Deep Real Usage, Linkage, Cleanup, Speed, and Hostinger Readiness Completion` is closed with documented external blockers.

Current BATCH 102 status:

- Package/path/course bug fixed in `pages/GenericPathPage.tsx`.
- `smoke:package-path-navigation` added and expected to guard the package route contract.
- Runtime API hardcoding to the old Render URL removed from `services/api.ts`.
- Runtime SEO base hardcoding to the old Vercel URL removed from `App.tsx`.
- Old Render preconnect/dns-prefetch removed from `index.html`.
- Hostinger deployment templates added under `deploy/hostinger/`.
- Docker templates added.
- Env examples/docs and backup/restore scripts/docs added.
- Audit docs added for linkage, performance, cleanup, unused files, feature activation, and security.
- Remaining blockers before real go-live: owner domain/VPS IP, MongoDB URI, optional Redis URL, payment/email/WhatsApp/AI/Sentry secrets, payment dry-run, VPS smoke, and browser verification after deployment.
- Verification so far: package/path, package split, real usage readiness, performance contract, frontend typecheck/build, server check/build, strict production frontend, payment package, health readiness, and docker compose config passed.
- Source commit `2d65643` was pushed to `main`, followed by a documentation addendum; post-push production strict smoke confirmed Vercel serves the latest BATCH 102 head after deploy catch-up, and health readiness passed.
- Known failures/blockers: `npm audit --omit=dev` and `npm --prefix server audit --omit=dev` report dependency advisories; `smoke:production-speed` passes with timing warnings.
- Docker note: `docker compose config` can print locally supplied env values; do not paste secrets into reports.

Do not use `git add .`. Stage only explicit BATCH 102 files.

## Previous Planning Summary

The owner asked whether to continue with small repeated production recheck batches or switch to a stronger plan. The correct next move is to stop the tiny recheck-only batches and start:

`BATCH 102 - Deep Real Usage, Linkage, Cleanup, Speed, and Hostinger Readiness Completion`

This handoff exists so any new Codex session/account can continue without guessing.

## Current Repo State Found

- Branch: `main`.
- Production currently passes strict frontend and health readiness smokes from the latest closed recheck cycle.
- Many recent batches from `100U` through `100AD` were documentation/production recheck closures only.
- The project still has old dirty/untracked files that must not be swept into commits.
- Known persistent dirty item outside current scope:
  - `docs/BATCH_1_2_FINAL_GO_LIVE_2026-05-14_AR.md`
- Known untracked historical docs/artifacts still present outside scope:
  - `BATCH_00_CURRENT_STATE_VERIFICATION_2026-05-14_AR.md`
  - `BATCH_26R_QUIZ_AVAILABILITY_AND_INTEGRITY_GENERAL_FIX_2026-05-18_AR.md`
  - `CONTENT_BOOTSTRAP_SAFE_IMPLEMENTATION_1_2026-05-14_AR.md`
  - `CONTENT_BOOTSTRAP_SPLIT_PLAN_2026-05-14_AR.md`
  - `FINAL_PRODUCTION_READINESS_REPORT_2026-05-14_AR.md`
  - `FIREBASE_LEGACY_CLEANUP_2026-05-14_AR.md`
  - `LOAD_TESTING_SCRIPTS_2026-05-14_AR.md`
  - `PAYMENT_AMOUNT_TAMPERING_FIX_2026-05-14_AR.md`
  - `SENTRY_MONITORING_READY_2026-05-14_AR.md`
  - `SEO_BROWSERROUTER_MIGRATION_PLAN_2026-05-14_AR.md`
  - `SEO_BROWSERROUTER_SAFE_IMPLEMENTATION_2026-05-14_AR.md`
  - `audit-artifacts/`
  - `audit-smoke-summary-2026-05-21.json`

## Previous Work Found

- `BATCH 100P` fixed and verified admin question bank runtime CRUD behavior.
- `BATCH 100Q` improved operational admin runtime paths.
- `BATCH 100R` through `100T` backfilled auth/security/integrations/payment docs.
- `BATCH 100U` through `100AD` were mostly production revalidation/stability checks.
- These recheck batches confirmed production was alive, but they did not complete the deep readiness work the owner now wants.

## Decision For Next Session

Do not continue with another small `100AE` recheck batch unless explicitly asked.

Start `BATCH 102` as the next real work batch.

## BATCH 102 Goal

Make the platform genuinely closer to production readiness and Hostinger/generic Linux VPS migration readiness without breaking the current Vercel/Render setup.

Main focus:

- Deep current-state audit from code, not only reports.
- Fix package/path/course navigation bug.
- Add package navigation regression smoke.
- Audit functional linkage.
- Remove runtime hardcoded production URL lock-in where safe.
- Complete Hostinger VPS deployment files.
- Complete Docker deployment files if missing.
- Complete env examples/docs.
- Audit speed/performance.
- Audit stale/vibe-coded logic without risky deletion.
- Audit unused/unlinked files without deleting automatically.
- Audit feature activation.
- Add backup/restore scripts and docs.
- Update security go-live audit.
- Add real-usage readiness smoke.
- Run and document verification commands honestly.

## Critical Known Bug To Fix First

Owner-reported bug:

> When opening a package, it should open content from an educational path, but currently it opens like a course player.

Suspected file:

- `pages/GenericPathPage.tsx`

Search targets:

- `navigate(\`/course/${pkg.id}\`)`
- `navigate("/course/"`
- `to={\`/course/${pkg.id}\`}`
- `packageId`
- `packageSubjectId`
- `tab=packages`
- `CoursePlayer`
- `CourseView`
- `CourseLanding`
- `GenericPathPage`
- `LearningSection`
- `CourseOverview`
- `isPackage`
- `packageContentTypes`
- `pathIds`
- `subjectIds`
- `includedCourseIds`
- `courseIds`

Required behavior:

- Packages must not navigate to `/course/${pkg.id}` unless the item is truly a real course.
- Package buttons/previews should stay in path/package context:
  - `/category/${path.id}?tab=packages&package=${pkg.id}`
  - If subject exists: `/category/${path.id}?tab=packages&subject=${subjectId}&package=${pkg.id}`
- Real course cards must still navigate to `/course/${course.id}`.
- Payment modal must still use package purchase semantics.

## Files To Create Or Update In BATCH 102

Primary report:

- `BATCH_102_DEEP_REAL_USAGE_LINKAGE_CLEANUP_SPEED_HOSTINGER_READINESS_2026-05-22_AR.md`

Handoff/status:

- `CODEX_HANDOFF.md`
- `PROJECT_STATUS.md`
- `docs/SPARK_BATCH_LEDGER_AR.md`
- `docs/NEXT_SESSION_HANDOVER_AR.md`

Audits/docs:

- `docs/FUNCTIONAL_LINKAGE_AUDIT.md`
- `docs/PERFORMANCE_SPEED_AUDIT.md`
- `docs/VIBE_CODING_CLEANUP_AUDIT.md`
- `docs/UNUSED_FILES_AND_LINKAGE_AUDIT.md`
- `docs/FEATURE_ACTIVATION_AUDIT.md`
- `docs/BACKUP_RESTORE_PRODUCTION.md`
- `docs/SECURITY_GO_LIVE_AUDIT.md`
- `docs/ENVIRONMENT.md`

Smoke tests:

- `scripts/smoke-package-path-navigation-contract.mjs`
- `scripts/smoke-real-usage-readiness-contract.mjs`
- `package.json` scripts:
  - `smoke:package-path-navigation`
  - `smoke:real-usage-readiness`

Hostinger/VPS:

- `deploy/hostinger/README.md`
- `deploy/hostinger/setup-server.sh`
- `deploy/hostinger/deploy.sh`
- `deploy/hostinger/nginx.conf`
- `deploy/hostinger/ecosystem.config.cjs`
- `deploy/hostinger/env.frontend.example`
- `deploy/hostinger/env.backend.example`

Docker if missing/incomplete:

- `Dockerfile.frontend`
- `Dockerfile.backend`
- `docker-compose.yml`
- `docker-compose.prod.yml` if useful
- `.dockerignore`
- `deploy/docker/nginx.conf` or `nginx/nginx.conf`

Backup/restore:

- `scripts/backup-db.sh`
- `scripts/restore-db.sh`
- `scripts/backup-uploads.sh`
- `scripts/restore-uploads.sh`

## Minimum Verification Commands For BATCH 102

Run and document:

- `npm run typecheck`
- `npm run build`
- `npm run smoke:package-path-navigation`
- `npm run smoke:package-course-split`
- `npm run smoke:real-usage-readiness`
- `npm run smoke:frontend:strict`
- `npm run smoke:performance` if available
- `npm run smoke:production-speed` if available
- `npm run smoke:payment-package` if available
- `npm run smoke:health-readiness`
- `npm run server:check`
- `npm run server:build`
- `npm audit --omit=dev`
- `npm --prefix server audit --omit=dev`
- `docker compose config` if Docker files exist

If anything fails:

- Capture the exact failure.
- Fix only if safe.
- Rerun.
- If still failing, document as blocker.

## Commands Already Run In Recent Recheck Work

Recent repeated PASS checks:

- `npm run smoke:frontend:strict`
- `npm run smoke:health-readiness`

These prove production is alive but are not enough for BATCH 102 readiness.

## Safety Rules For Next Session

- Do not use `git add .`.
- Stage explicit files only.
- Do not delete old reports/handoff files.
- Do not remove Vercel/Render support.
- Do not hardcode production URLs.
- Do not commit real secrets.
- Do not refactor large dashboards unless necessary for a verified bug.
- Do not rename APIs/routes/models/env variables unless unavoidable.
- Do not claim readiness unless verified.
- Keep package/course/path changes minimal and backward-compatible.

## Do-Not-Touch Areas Without Clear Reason

- Historical reports and closure evidence.
- Old dirty/untracked files outside BATCH 102 scope.
- Payment schema and payment webhook contracts unless a safe verified bug requires a minimal fix.
- Auth/session/cookie behavior unless a launch blocker is proven.
- Database model fields unless backward compatible and documented.

## Rollback Plan

If BATCH 102 breaks production:

1. Revert the BATCH 102 commit(s) only.
2. Keep Vercel/Render env variables as-is.
3. Redeploy previous known-good commit.
4. Rerun:
   - `npm run smoke:frontend:strict`
   - `npm run smoke:health-readiness`
   - package navigation smoke if it had already been added.
5. Document rollback in `CODEX_HANDOFF.md` and `PROJECT_STATUS.md`.

## Next Exact Task

Start BATCH 102 by reading the current state files first, then fix the package/path/course navigation bug in `GenericPathPage.tsx`, add `smoke:package-path-navigation`, and run:

- `npm run smoke:package-path-navigation`
- `npm run smoke:package-course-split`

Then continue through the BATCH 102 phases.
