# CODEX HANDOFF - ALMEAA CODAX

Last updated: 2026-05-24

## Current Session Summary

`BATCH 142 - Publish Snapshot Closure` is now active.

Current outcome:
- BATCH 142 publish snapshot executed:
  - GitHub push completed.
  - Vercel production deploy completed and alias confirmed (`almeaacodax.vercel.app`).
  - Render deploy trigger executed (`dep-d89lshq8qa3s73e5d7dg`).
- Post-publish checks are green:
  - `smoke:operational` PASS (71/71)
  - `smoke:health-readiness` PASS
  - `smoke:frontend:strict` PASS (26/26)
- BATCH 140 revalidation cycle PASS:
  - operational smoke: 71/71
  - health readiness: PASS
  - strict frontend: PASS (26/26)
- stability remains preserved after repeated continuation runs.
- BATCH 139 continuation sweep executed and PASS:
  - `smoke:batch136-admin-users-schools-parent-payment`
  - `smoke:payment-package`
  - `smoke:batch100f-relationship-audit`
- admin/runtime/relationship/payment contracts remain stable after final operational closure.
- BATCH 138 opened as post-closure verification sweep.
- stability checks PASS after BATCH 137 closure:
  - `smoke:health-readiness` PASS
  - `smoke:frontend:strict` PASS (production commit match `4e3ef12`)
- opened cross-session reusable closure plan:
  - `BATCH_137_FINAL_CLOSURE_EXECUTION_PLAN_2026-05-24_AR.md`
- BATCH 136 core fixes are complete and preserved; BATCH 137 is dedicated to closure execution and authenticated runtime evidence.
- implemented safe runtime fix for admin users actions menu: three-dots button is now functional in `dashboards/admin/UsersManager.tsx`,
- implemented safe runtime fix for schools cards actions menu: three-dots button is now functional in `dashboards/admin/SchoolsManager.tsx`,
- implemented admin users deletion flow end-to-end (`DELETE /auth/admin/users/:id` + frontend API + UI action) with protections for current admin and last-admin account,
- fixed admin school command-center action linkage so school-command smoke contract passes again,
- revalidated extended relationship/schools/payments readiness set (relationship audit, school portal command center, RBAC school scope, payment tampering, package-path and real-usage contracts, plus strict production frontend),
- hardened `smoke:operational` entrypoint with explicit admin-auth env precheck and actionable failure output when credentials/token are missing,
- added operational smoke execution runbook: `docs/OPERATIONAL_SMOKE_RUNBOOK_AR.md`,
- validated core contracts: `typecheck` PASS and `smoke:batch100q-operational-admin-runtime` PASS,
- created dedicated batch report `BATCH_136_ADMIN_USERS_SCHOOLS_PARENT_PAYMENT_DEEP_AUDIT_2026-05-24_AR.md`,
- pending: authenticated browser verification and completion matrix for users/schools/parent-link/payment gateways.
- BATCH 137 execution cycle was run end-to-end and is green except secret-gated operational smoke:
  - PASS: typecheck/build/server build + batch136/payment/relationship/schools/real-usage/health/frontend-strict/student-learning-journey.
  - FAIL (expected): `smoke:operational` because admin auth env is not present in current shell.
- Additional operational retry against production API was executed:
  - base: `https://almeaacodax-k2ux.onrender.com/api`
  - result: FAIL with `429 Too many login attempts` on `POST /auth/login`.
- Fastest final-closure route now:
  - provide fresh `SMOKE_ADMIN_TOKEN` and rerun `npm run smoke:operational` (bypasses password-login rate limit path).
 - Operational token-run executed and finalized:
  - full `smoke:operational` matrix PASS `71/71`.
  - fixed production content-link integrity by updating quiz
    `quiz_current_p_1777779639431_sub_1777779748206_practice`
    with a valid published question reference.
  - prior single blocker is resolved.

Immediate next action for any new account:
1. Open admin runtime with valid credentials.
2. Execute users/schools/parent/payment manual matrix from BATCH 136 report.
3. Apply only confirmed safe fixes.
4. Close batch with explicit PASS/FAIL evidence and push.
5. Follow the dedicated deep plan file:
   - `BATCH_136_ADMIN_PANEL_DEEP_RUNTIME_PLAN_2026-05-24_AR.md`
   - this is the canonical checklist for extra relationship/schools/payment gaps requested by owner.
6. Execute newly added static-risk checks first:
   - new-parent linking source completeness,
   - schools supervisor-flow discoverability,
   - payment approval -> unlock scope runtime mapping.
7. New-parent linking source completeness is now fixed in code:
   - create-parent linked-students options now use full `linkableStudents` source.
   - parent school-change linked-student filtering also uses `linkableStudents`.
   - keep runtime verification as remaining closure step.
8. Latest consolidated verification cycle is green (except credential-gated operational smoke):
   - batch136 central smoke PASS,
   - school management smoke PASS,
   - payment package + tampering smokes PASS,
   - health readiness PASS,
   - strict frontend PASS with production serving commit `af16784` after deploy-lag rerun.
9. Latest strict production alignment update:
   - `smoke:health-readiness` PASS.
   - `smoke:frontend:strict` PASS with production serving commit `e952d11` (after deploy-lag rerun).
10. Latest strict production alignment update 2:
   - `smoke:frontend:strict` PASS with production serving commit `0bf2582`.
   - operational blocker unchanged: admin auth env still required for `smoke:operational`.
11. New owner-reported runtime blockers were added as mandatory tracks:
   - learning player: `المصادر` / `المناقشات` tabs not working,
   - learning player: `المفضلة` / `المشاركة` actions not working,
   - admin payments: `اعتماد` button not working.
   - canonical plan reference:
     - `BATCH_136_ADMIN_PANEL_DEEP_RUNTIME_PLAN_2026-05-24_AR.md`
12. Owner requested explicit deep runtime coverage additions:
   - full student journey verification (purchase -> admin approval -> access unlock),
   - deep users-management and relationships runtime verification.
13. P0 payment approve-button blocker was fixed:
   - `dashboards/admin/FinancialManager.tsx`
   - approve is no longer hard-blocked by `riskNotes` presence; warnings remain visible.
   - validated by `typecheck`, `smoke:payment-package`, and `smoke:batch136-admin-users-schools-parent-payment`.
14. Learning player runtime blockers were fixed:
   - file: `components/CoursePlayer.tsx`
   - `الوصف / المصادر / المناقشات` tabs are now wired and rendered by active state.
   - `المصادر` now has real preview/download actions from lesson/course resources.
   - `المناقشات` now loads lesson threads and supports creating a new thread.
   - `المفضلة` and `المشاركة` actions are now wired (local persistence + share utility).
   - validated by `typecheck`, `smoke:batch136-admin-users-schools-parent-payment`, and `smoke:real-usage-readiness`.
15. Payment receipt UX was expanded without schema changes:
   - file: `components/PaymentModal.tsx`
   - student can now submit receipt proof via:
     - link field (`receiptUrl`) OR
     - direct receipt image upload (preview/remove before submit).
   - safety constraints: image-only, max 2MB.
   - verified by `typecheck`, `smoke:payment-package`, and `smoke:batch136-admin-users-schools-parent-payment`.
16. Student-journey and relationship deep smokes were revalidated:
   - `smoke:student-journey` PASS
   - `smoke:batch100f-relationship-audit` PASS
   - `smoke:school-management` PASS
17. Cross-session command continuity improvement:
   - `package.json` now includes alias `smoke:student-learning-journey`.
   - both names now run the same journey smoke script.
18. Added deep code-level admin runtime matrix in BATCH 136 report:
   - UsersManager: PASS on CRUD/actions/relations wiring (runtime-auth evidence still pending for edge flows).
   - SchoolsManager: PASS on card actions, class/supervisor/relations wiring (large-data runtime evidence pending).
   - FinancialManager: PASS on review wiring and approve gating fix; end-to-end unlock proof still marked pending runtime-auth evidence.
19. Next mandatory closure target remains:
   - authenticated browser E2E evidence for purchase -> admin approve -> learner unlock,
   - authenticated browser evidence for users/schools relation persistence after reload.
20. Latest closure smoke cycle status:
   - `smoke:exam-payment-phase8` PASS
   - `smoke:health-readiness` PASS
   - `smoke:frontend:strict` PASS after one deploy-lag rerun
   - production confirmed serving commit/version `8e3d2bb`.
21. Authenticated operational closure remains secret-gated:
   - `npm run smoke:operational` fails fast by design when admin auth context is missing.
   - required one-of:
     - `SMOKE_ADMIN_TOKEN`
     - `SMOKE_ADMIN_EMAIL` + `SMOKE_ADMIN_PASSWORD`
     - `GOLIVE_ADMIN_EMAIL` + `GOLIVE_ADMIN_PASSWORD`
     - `ADMIN_EMAIL` + `ADMIN_PASSWORD`
   - treat as owner-secret blocker, not application regression.
22. Deployment tooling/credentials status from this environment:
   - GitHub push: available and completed.
   - Vercel CLI: installed, but not authenticated (`vercel whoami` failed: no credentials/token).
   - Render CLI: not installed (`render` command not found).
   - MongoDB connectivity: production health smoke indicates DB connected; no secret rotation performed in this batch.
23. To complete publish step:
   - provide Vercel credentials/token and run production deploy,
   - trigger Render backend redeploy (dashboard/deploy hook/API token path),
   - keep Mongo secrets owner-managed and run backup scripts before infra changes.
24. Additional verification state:
   - `server:check` PASS.
   - `smoke:production-speed` PASS with one non-blocking frontend-shell timing warning.
   - `npm audit --omit=dev` reports known frontend dependency advisories:
     - `quill` (breaking upgrade path through editor package),
     - `xlsx` (no direct upstream fix in current track).
   - `npm --prefix server audit --omit=dev` reports moderate `qs` advisory via express/body-parser chain.
25. Remaining hard blockers are now exclusively:
   - owner secrets/auth for operational authenticated smoke,
   - owner deployment credentials/path for Vercel/Render publish execution.
26. Deployment execution completed in this session:
   - Vercel production deploy succeeded and alias is active: `https://almeaacodax.vercel.app`.
   - Render backend deploy triggered by API and reached `live` state (`dep-d89fm88jo6nc73dq5of0`).
   - post-deploy checks:
     - `smoke:health-readiness` PASS
     - `smoke:frontend:strict` PASS
27. Final remaining blocker now narrowed to authenticated operational smoke credentials only.

`BATCH 135 - Package Split Prod Alignment` is closed.

Outcome:
- revalidated package/course split contract,
- revalidated health readiness and strict frontend production alignment with commit `5c609d5`,
- continuity docs updated for immediate next-batch startup.

`BATCH 134 - Question Bank Real Usage Prod Verify` is closed.

Outcome:
- revalidated question-bank runtime CRUD and real usage readiness contracts,
- revalidated health readiness and strict frontend production alignment with commit `aa7862e`,
- continuity docs updated for immediate next-batch startup.

`BATCH 133 - Package Path Operational Prod Verify` is closed.

Outcome:
- revalidated package/path navigation and operational admin runtime contracts,
- revalidated health readiness contract,
- strict frontend needed one rerun due to deploy lag then passed with production commit `d9136cf`,
- continuity docs updated for immediate next-batch startup.

`BATCH 132 - Question Bank Real Usage Operational Prod Verify` is closed.

Outcome:
- revalidated question-bank runtime CRUD, real usage readiness, and operational continuity contracts,
- revalidated health readiness contract,
- strict frontend needed one rerun due to deploy lag then passed with production commit `bad4bec`,
- continuity docs updated for immediate next-batch startup.

`BATCH 131 - Package Path Operational Prod Verify` is closed.

Outcome:
- revalidated package/path navigation and operational admin runtime contracts,
- revalidated health readiness and strict frontend production alignment with commit `91a7bcb`,
- continuity docs updated for immediate next-batch startup.

`BATCH 130 - Question Bank Real Usage Prod Verify` is closed.

Outcome:
- revalidated question-bank runtime CRUD and real usage readiness contracts,
- revalidated health readiness and strict frontend production alignment with commit `cfac5e9`,
- continuity docs updated for immediate next-batch startup.

`BATCH 129 - Package Path Operational Continuity` is closed.

Outcome:
- revalidated package/path navigation and operational admin runtime contracts,
- revalidated health readiness contract,
- strict frontend needed one rerun due to deploy lag then passed with production commit `7207ddd`,
- continuity docs updated for immediate next-batch startup.

`BATCH 128 - Question Bank Split Continuity` is closed.

Outcome:
- revalidated question-bank runtime CRUD and package/course split contracts,
- revalidated health readiness contract,
- strict frontend needed one rerun due to deploy lag then passed with production commit `7fd1ef6`,
- continuity docs updated for immediate next-batch startup.

`BATCH 127 - Real Usage Operational Prod Alignment` is closed.

Outcome:
- revalidated real usage readiness and operational admin runtime contracts,
- revalidated health readiness and strict frontend production alignment with commit `0945350`,
- continuity docs updated for immediate next-batch startup.

`BATCH 126 - Question Bank Package Path Prod Verify` is closed.

Outcome:
- revalidated question-bank runtime CRUD and package/path navigation contracts,
- revalidated health readiness and strict frontend production alignment with commit `383694f`,
- continuity docs updated for immediate next-batch startup.

`BATCH 125 - Real Usage Operational Speed Continuity` is closed.

Outcome:
- revalidated real usage readiness and operational admin runtime contracts,
- production speed check passed with one non-blocking course-list timing warning,
- strict frontend verified production commit `0087679`,
- continuity docs updated for immediate next-batch startup.

`BATCH 124 - Question Bank Package Path Continuity` is closed.

Outcome:
- revalidated question-bank runtime CRUD and package/path navigation contracts,
- revalidated health readiness and strict frontend production alignment with commit `e4ddb3d`,
- continuity docs updated for immediate next-batch startup.

`BATCH 123 - Real Usage Split Continuity` is closed.

Outcome:
- revalidated real usage readiness and package/course split contracts,
- revalidated health readiness and strict frontend production alignment with commit `e3aa7cf`,
- continuity docs updated for immediate next-batch startup.

`BATCH 122 - Package Path Operational Continuity` is closed.

Outcome:
- revalidated package/path navigation and operational admin runtime contracts,
- revalidated health readiness and strict frontend production alignment with commit `35706ce`,
- continuity docs updated for immediate next-batch startup.

`BATCH 121 - Question Bank Real Usage Continuity` is closed.

Outcome:
- revalidated question bank runtime CRUD and real usage readiness contracts,
- revalidated health readiness contract,
- strict frontend needed one rerun due to deploy lag then passed with production commit `b156f23`,
- continuity docs updated for immediate next-batch startup.

`BATCH 120 - Package Split Speed Strict Recheck` is closed.

Outcome:
- revalidated package/course split contract,
- revalidated health readiness and strict frontend production alignment with commit `3216c43`,
- production speed check passed with one non-blocking initial commit-alignment warning,
- continuity docs updated for immediate next-batch startup.

`BATCH 119 - Real Usage Operational Alignment` is closed.

Outcome:
- revalidated real usage readiness and operational admin runtime contracts,
- revalidated health readiness and strict frontend production alignment with commit `74e80c6`,
- continuity files updated to keep instant next-batch startup on owner command.

`BATCH 118 - Question Bank Package Path Readiness` is closed.

Outcome:
- revalidated question-bank runtime CRUD contract,
- revalidated package/path navigation contract,
- revalidated health readiness and strict frontend production alignment with commit `4fea125`,
- updated continuity tracking for immediate next-batch start.

`BATCH 117 - Readiness Strict Speed Recheck` is closed.

Outcome:
- revalidated health readiness contract,
- strict frontend required one rerun due to deploy lag then passed with production commit `55f5017`,
- production speed check passed with initial commit-alignment warning only,
- continuity tracking updated for immediate next batch start.

`BATCH 116 - Real Usage Split and Prod Alignment` is closed.

Outcome:
- revalidated real usage readiness and package/course split contracts,
- revalidated health readiness and strict frontend production alignment with commit `904360e`,
- updated continuity files to keep next-batch startup immediate on owner command.

`BATCH 115 - Admin Runtime Continuity Recheck` is closed.

Outcome:
- revalidated question bank runtime CRUD and operational admin runtime contracts,
- revalidated health readiness contract,
- strict frontend check required one rerun due to deploy lag and then passed with production commit match `ea3c5cb`,
- continuity docs updated for immediate next batch start.

`BATCH 114 - Real Usage Navigation Continuity Recheck` is closed.

Outcome:
- revalidated real-usage readiness and package-path routing contracts,
- revalidated health readiness contract,
- strict frontend check needed one rerun due to deploy lag then passed with production commit match `ac1700b`,
- continuity docs updated for immediate next-batch start on owner command.

`BATCH 113 - Operational Runtime and Speed Recheck` is closed.

Outcome:
- revalidated question bank runtime CRUD and operational admin runtime contracts,
- revalidated health and strict frontend production checks with commit match `905525f`,
- production speed check passed with one non-blocking course-list timing warning in this cycle,
- continuity docs updated for direct next batch start.

`BATCH 112 - Performance and Speed Stability Recheck` is closed.

Outcome:
- revalidated performance lazy-loading guardrails,
- revalidated production speed contract with only one temporary deploy-lag warning,
- revalidated health and strict frontend production checks with commit match `02df954`,
- updated continuity tracking for immediate next batch start on owner request.

`BATCH 111 - Real Usage and Split Guard Recheck` is closed.

Outcome:
- revalidated real usage readiness source-contract checks,
- revalidated package/course split guardrails in payment and routing behavior,
- revalidated operational admin runtime and production strict frontend checks with commit match `6b8b0f2`,
- updated central continuity files for immediate next batch execution.

`BATCH 110 - Question Bank and Package Route Stability` is closed.

Outcome:
- revalidated admin question-bank runtime CRUD contract,
- revalidated package/path navigation contract to ensure packages never regress to course-player fallback behavior,
- revalidated health and strict frontend production checks with commit match `1788200`,
- updated continuity tracking for immediate next-batch execution.

`BATCH 109 - Post-Deploy Runtime Alignment` is closed.

Outcome:
- verified runtime health and question-bank CRUD contract remained stable after the latest push,
- observed one expected deploy-lag mismatch on first strict check,
- reran strict verification until production matched commit `553cbda`,
- closed with continuity docs updated for immediate next-batch execution.

`BATCH 108 - Admin Question Bank Continuity Recheck` is closed.

Outcome:
- revalidated admin question bank runtime CRUD contract,
- revalidated operational admin runtime contract,
- revalidated production health and strict frontend serving checks,
- no code behavior/design changes; continuity documentation updated for next account.

`BATCH 107 - Cross-Session Continuity Playbook Closure` is closed.

Outcome:
- introduced a mandatory cross-session playbook at `docs/CROSS_SESSION_CONTINUITY_PLAYBOOK_AR.md`,
- normalized the execution rule for every new account/session:
  - owner says `اكمل` + no active batch => start a new batch directly,
  - owner says `اكمل` + active batch exists => continue same batch to closure,
- revalidated baseline production/runtime checks before closure.

`BATCH 106 - Operational Readiness Deepening` is closed.

Outcome:
- deep runtime and operational smokes passed,
- production-speed smoke reached zero timing warnings in this pass,
- batch closed and handed over.

`BATCH 105 - React Quill Replacement Feasibility` is closed.

Outcome:
- implemented safe non-breaking containment by sanitizing quill output at editor onChange,
- verified build/typecheck/performance stability,
- left residual advisory elimination to future controlled migration because the available patch path is breaking.

`BATCH 104 - Frontend Audit Remediation Strategy` is closed.

Outcome:
- spreadsheet import surfaces were hardened with centralized xlsx sanitization and safer read options,
- smoke/build/typecheck remained stable,
- residual advisories are still documented for `quill` (breaking path) and `xlsx` (no patch available).

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

## Session Update 2026-05-24 - BATCH 146 Continuous Publish Cycle 4

Summary:
- Completed a full publish cycle closure after prior handoff compaction.

What was done:
- Verified local/main divergence and pushed commit `60babec` to `origin/main`.
- Deployed frontend to Vercel production and verified alias at `https://almeaacodax.vercel.app`.
- Triggered backend deploy on Render using active service `srv-d7qtcr9o3t8c73cs32sg` (deploy id `dep-d89m5njbc2fs73fcenq0`).
- Ran production-facing verification:
  - `npm run smoke:health-readiness` -> PASS
  - `npm run smoke:frontend:strict` -> PASS (26/26, production commit `60babec`).

Blockers:
- No blocking failures in this cycle.

Warnings for next session:
- Keep using the active Render service id above; legacy id `srv-d6muvvqdbo4c73fuak60` returns not found.
- Continue explicit staging only (`git add <files>`), never `git add .`.

Rollback:
- If any regression appears, rollback to previous known-good commit `13554c3`, redeploy Vercel/Render, then rerun strict + health smokes.

## Session Update 2026-05-24 - BATCH 147 Continuous Publish Cycle 5

Summary:
- Completed publish/deploy closure cycle with production verification and handover continuity updates.

What was done:
- Preflight complete: `git log origin/main..main` was empty and `git push origin main` returned up to date.
- Vercel production deploy completed:
  - inspect: `https://vercel.com/nasefs-projects-18e6bdb1/almeaacodax/GwTnwuXSDKQrHHaHzYVQy9Knayjn`
  - production: `https://almeaacodax-phmhyg977-nasefs-projects-18e6bdb1.vercel.app`
  - alias: `https://almeaacodax.vercel.app`
- Render deploy triggered:
  - service: `srv-d7qtcr9o3t8c73cs32sg`
  - deploy id: `dep-d89m8o28qa3s73e5l9b0`
- Production checks PASS:
  - `npm run smoke:health-readiness`
  - `npm run smoke:frontend:strict` (26/26, commit match `bfaf95c`).

Blockers:
- No publish/deploy blockers in this cycle.

Next exact task:
- Execute `BATCH_148_FINAL_DELIVERY_DEEP_AUDIT_PLAN_2026-05-24_AR.md` for full role-based/browser-runtime delivery audit and targeted minimal fixes only.

Warnings and do-not-touch:
- Preserve existing visual design/theme/layout; no redesign.
- Keep backward compatibility and avoid large refactors.
- Continue explicit staging only; never use `git add .`.
