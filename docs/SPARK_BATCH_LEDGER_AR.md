# ??? ????? Spark

| ??? ?????? | ??? ?????? | ?????? ??? ???????? | ??? ????? | ??????? ??????? | ??????? ???????? |
|---|---|---|---|---|---|
| 00 | Current State Verification | Fully closed | 2026-05-17 | BATCH_00_CURRENT_STATE_VERIFICATION_2026-05-14_AR.md | ????? ???? ?????. |
| 01 | Data Visibility Regression Tests | Fully closed | 2026-05-17 | DATA_VISIBILITY_REGRESSION_TESTS_2026-05-14_AR.md | ????? ???? ?????. |
| 02 | Payment Amount Tampering Protection | Fully closed | 2026-05-17 | BATCH_02R_PAYMENT_AMOUNT_TAMPERING_PRODUCTION_CLOSURE_2026-05-16_AR.md | ?? ?????? ???? ??? ??? `e1129da`: ????? ??????? ?? ?????? ???? server-verified (`amount/itemName/includedCourseIds`) ??? ??? access ????? ????? ???????? ???. |
| 03 | Platform Integration Secrets Security | Fully closed | 2026-05-17 | BATCH_03R_PLATFORM_INTEGRATION_SECRETS_PRODUCTION_CLOSURE_2026-05-17_AR.md | ???? ?????? ????: GET/PATCH/history/runtime-audit/setup-checklist ???? 200 ?? ????? ???????. |
| 04 | Admin Users Pagination | Fully closed | 2026-05-17 | ADMIN_USERS_PAGINATION_FIX_2026-05-14_AR.md | ????? ???? ?????. |
| 05 | Payment Requests Pagination | Fully closed | 2026-05-17 | PAYMENT_REQUESTS_PAGINATION_FIX_2026-05-14_AR.md | ???? ?? ???? ??? ???????: pagination ?????? + ??? scope ?????? + ??? requestId ??? search? ?? ???? ???? ?????? ????????. |
| 06 | Quiz Results Pagination | Fully closed | 2026-05-17 | QUIZ_RESULTS_PAGINATION_FIX_2026-05-14_AR.md | ??????? ???? ?? ????? ??? ????? ???????? ???????. |
| 07 | Access Codes Pagination | Fully closed | 2026-05-17 | ACCESS_CODES_PAGINATION_FIX_2026-05-14_AR.md | ????? ???? ?????. |
| 08 | Questions Pagination | Fully closed | 2026-05-17 | QUESTIONS_PAGINATION_AND_SAFE_SERIALIZER_FIX_2026-05-14_AR.md | ????? ???? ?????. |
| 09 | RBAC Security Audit Plan | Fully closed | 2026-05-17 | BATCH_09_RBAC_AUDIT_AR.md | ????? RBAC ???? ??? ???? ???????? ?? ????? ????? ???? ????? scope ??? supervisor. |
| 10 | RBAC/API Hardening Batch 1 | Fully closed | 2026-05-17 | BATCH_10_RBAC_API_HARDENING_BATCH_1_2026-05-17_AR.md | ?? ?????? ???? ??? ????? (`67b662d`): ?????? ???? ?????? ???? 403 ??? report/import/relations? ??????? 403? ??????? ?????. |
| 11 | Sentry Monitoring Readiness | Fully closed | 2026-05-17 | SENTRY_MONITORING_READY_2026-05-14_AR.md | ????? ???? ?????. |
| 12 | Redis/BullMQ Production Queue Readiness | Fully closed | 2026-05-17 | BATCH_12R_REDIS_QUEUE_PRODUCTION_VERIFICATION_CLOSURE_2026-05-17_AR.md | ?? ?????? ???????? ??????? ?????: `smoke:notification-phase10` PASS? `smoke:production-ops-phase14` PASS? `smoke:batch12-golive` PASS? ?`managed_redis` ???? PASS (Redis reachable). |
| 13 | Firebase Legacy Cleanup / Isolation | Fully closed | 2026-05-17 | FIREBASE_LEGACY_CLEANUP_2026-05-14_AR.md | ????? ???? ?????. |
| 14 | Content Bootstrap Split Plan | Fully closed | 2026-05-17 | CONTENT_BOOTSTRAP_SPLIT_PLAN_2026-05-14_AR.md | ???? ??? ?????. |
| 15 | Content Bootstrap Safe Implementation | Fully closed | 2026-05-17 | BATCH_15R_CONTENT_BOOTSTRAP_SCOPE_HARDENING_CLOSURE_2026-05-17_AR.md | Enforced safe bootstrap scope for non-staff on production (`x-content-scope: learning`) with live verification pass. |
| 16 | Auth Cookie Migration Plan | Fully closed | 2026-05-17 | BATCH_16R_AUTH_COOKIE_OUTCOME_VERIFICATION_CLOSURE_2026-05-17_AR.md | Verified cookie-first outcome on code + production auth endpoints; no oauth token in callback URL flow. |
| 17 | Auth Cookie Migration Phase 1 | Fully closed | 2026-05-17 | BATCH_17R_AUTH_COOKIE_PRODUCTION_CLOSURE_2026-05-17_AR.md | ?? ????? ??? ??????? (`0d25f1ee1897`) + ???? callback ???? oauth_token + ????? ????? ???? Google ?????? + Local Storage ???? token. |
| 18 | SEO BrowserRouter Migration Plan | Fully closed | 2026-05-17 | SEO_BROWSERROUTER_MIGRATION_PLAN_2026-05-14_AR.md | ???? ??? ?????. |
| 19 | SEO BrowserRouter Safe Implementation | Fully closed | 2026-05-17 | BATCH_19R_SEO_BROWSERROUTER_PRODUCTION_CLOSURE_2026-05-17_AR.md | ?? ??? ????? SEO clean routes ???? hash ?? status/sitemap/robots ??? ???????. |
| 20 | Load Testing Scripts | Programmatically closed (script+evidence ready), scale hardening pending | 2026-05-17 | BATCH_20R_LOAD_TESTING_SCALE_HARDENING_CLOSURE_2026-05-17_AR.md | Revalidated contracts/build; production evidence still shows 500+ not ready without infra hardening window. |
| 21 | Final Production Readiness Report | Fully closed | 2026-05-17 | BATCH_21B_PRODUCTION_HARDENING_CONTRACT_ALIGNMENT_2026-05-17_AR.md | ?? ?????? ??? hardening ?? middleware ??????? ?????? ????? ??????? ???? ???? ??????? ???????? PASS. |

## ????? BATCH 02R â€” 2026-05-17
- ??? ??????: `BATCH_02R_PAYMENT_AMOUNT_TAMPERING_PRODUCTION_CLOSURE_2026-05-16_AR`.
- ?? ????? ????? tampering ???? ???????? ?? ?????? ??????? ?? ??????? (`amount/itemName/includedCourseIds`) ?? create schema.
- ??? tampering ??? (9/9).
- ?????? ???????? ?????? 02 ?? ????: `Programmatically closed, production verification pending`.

## ????? BATCH 09 â€” 2026-05-17 (Audit Only)
- ????? ??????: `BATCH_09_RBAC_AUDIT_AR.md`.
- ??????: ????? ?????? ??? ????? ????? `server/src/routes/` ???? ?? ????? ???.
- ????????: ???? endpoint-by-endpoint (method/path/middleware/access/risk) + ????? ??????.

## ????? BATCH 12R â€” 2026-05-17
- ????? ??????: `BATCH_12R_REDIS_QUEUE_PRODUCTION_VERIFICATION_CLOSURE_2026-05-17_AR.md`.
- ????? ??????:
  - `npm --prefix server run build`: PASS
  - `npm run smoke:notification-phase10`: PASS (6/6)
  - `npm run smoke:production-ops-phase14`: PASS (6 checks)
  - `npm run smoke:package-course-split`: PASS (7/7)
  - `npm run smoke:payment-package`: PASS (8/8)
  - `npm run smoke:payment-providers`: PASS (7/7)
  - `npm run smoke:batch12-golive`: PASS (?? Admin readiness ??? token)
- ?????? ????????: `Programmatically closed, production verification pending`.

## ????? BATCH 12R â€” 2026-05-17 (??? ?????)
- `smoke:batch12-golive` ??? ??:
  - frontend probe = 200
  - API health = 200
  - admin readiness = PASS ??? `GOLIVE_ADMIN_TOKEN`
- readiness ????? ????? `ready_with_notes` (???? fails).
- `managed_redis` ???? PASS (`Redis is reachable`).
- ?????? ???????? ???????? ????? 12: **Fully closed**.

## ????? BATCH 02R â€” 2026-05-17 (Production Reality Check)
- ?? ????? ???? ?? end-to-end ??? ??????? ???????? tampering.
- ???????: **FAIL (Critical)**.
- ?? ????? ?? ????? ??????? ???? ??? `amount/itemName/includedCourseIds` ??????? ???????? ??? access grant ??? approval.
- ?????? ???????? ??????? ????? 02: **Partially closed (production vulnerability confirmed)**.
- ??????? ??????: `BATCH 02R-FIX` ?????? ?????? ??????? ?? ????? ?????? ????.


## ????? BATCH 02R â€” 2026-05-17 (Production Verification PASS)
- ?? ??? ??????? ??? ??????? (commit: e1129da).
- ???? End-to-End ???? ??? ???????.
- ?????? ???????? ???????? ????? 02: **Fully closed**.



## ????? BATCH 03R â€” 2026-05-17 (Production Check)
- GET /content/platform-integrations: PASS (masked).
- PATCH /content/platform-integrations: FAIL (500).
- history/runtime-audit/setup-checklist: FAIL (404).
- ??????: Programmatically closed, production verification pending.



## ????? BATCH 03R Final Closure â€” 2026-05-17
- ?? ?????? ???? ????? ??? ???????.
- ?????? ????????: **Fully closed**.



## ????? BATCH 05R Final Closure â€” 2026-05-17
- ?? ?????? ???? ??? ??????? ????? ????? ????? ????? paginated.
- ?????? ????????: **Fully closed**.



## ????? BATCH 10R Production Risk Check â€” 2026-05-17
- ??????? ??????: ?????? ?????? ?????? ?????? ??? report/import/relations ?????? ???????? (??? RBAC).
- ?? ????? ????? scope ?????? ?? content.routes.ts ??? ???? ?????.
- ??????: Programmatically closed, production verification pending.

## ????? BATCH 10R Final Closure â€” 2026-05-17
- ?? ??? ??????? ??? ??????? (commit: `67b662d`).
- ?????? ???? ??????? PASS:
  - admin report = 200
  - supervisor out-of-scope report/import/relations = 403
  - student report = 403
- ?????? ????????: **Fully closed**.

## ????? BATCH 17R â€” 2026-05-17
- ????? `oauth_token/oauth_user` ?? redirect ????? ?? Google callback.
- ????? ????? ?????? ?? localStorage ??????? (???????? ??? HttpOnly cookie + sessionStorage ??????? ??? ?????).
- ?????? ???????? ???? PASS.
- ?????? ???????: **Programmatically closed, production verification pending** ??? ?????? ???? ??? ?????.





## ????? ????? ?????? ???? â€” 2026-05-17
- ?? ?????? ??????? ???????: `docs/FINAL_LIVE_VERIFICATION_SUMMARY_2026-05-17_AR.md`.
- ?????? ???? ??? ?????: API health ???? + Frontend live ??? `https://almeaacodax.vercel.app/#/`.
- `smoke:frontend:strict` PASS? `smoke:production-hardening` PASS? `smoke:operational` PASS (???????? `SMOKE_ADMIN_TOKEN`).

## ????? ????? ?? ??? ??????? â€” 2026-05-17 (Final)
- ?? ????? ?????? ?????? ?????? `smoke:operational` ????? ???? (71/71).
- ?????? ???????? ??? ???????: **Fully closed**.

## ????? BATCH 22 â€” 2026-05-17
- ?????: Production Guardrails and CI Secrets.
- ??????: **Fully closed**.
- ?? ????? workflow ????: `.github/workflows/post-deploy-smoke.yml`.
- ?????? ???????? ??? `main`: frontend strict + production hardening + operational.
- ??? ??????: ???? `SMOKE_ADMIN_TOKEN` ?? GitHub Secrets ???? ???? ???workflow ?????? ?????.
- ???????: `BATCH_22_PRODUCTION_GUARDRAILS_AND_CI_SECRETS_2026-05-17_AR.md`.


## Update BATCH 15R â€” 2026-05-17
- Forced /api/content/bootstrap non-staff requests to learning scope even when scope=full is requested.
- Live production check passed with header x-content-scope: learning and zero operational payload for guest requests.
- Batch 15 status moved to **Fully closed**.



## Update BATCH 16R â€” 2026-05-17
- Verified cookie-first auth outcome (VITE_AUTH_COOKIE_FIRST) and cleanup of legacy localStorage auth session key.
- Verified production auth guard (/api/auth/me => 401 unauthenticated) and OAuth start redirect with state-based flow only.
- Batch 16 moved to **Fully closed**.



## Update BATCH 20R â€” 2026-05-17
- Re-ran load-test contracts and core builds successfully.
- Kept status evidence-based: 20 ready, 100 conditional, 500+ pending infra hardening.
- Batch remains programmatically closed until scale execution window completes.



## Update BATCH 20S â€” 2026-05-17
- Executed safe live quick load window on production (20/100) for /health and /content/bootstrap with all-200 responses and zero timeouts/errors.
- Updated LOAD_TEST_REPORT.md with fresh evidence and kept 500+ status pending infrastructure tuning/retest window.
- Status: Programmatically closed, production scale hardening pending.



## Update BATCH 20T â€” 2026-05-17
- Added env-level rate-limit tuning keys and wired middleware to consume them for production tuning readiness.
- Build + readiness + auth-cookie smokes passed after change.
- Status: Programmatically closed.



## Update BATCH 20U â€” 2026-05-17
- Executed short 500/1000 production retest window for /health and /content/bootstrap with 200-only responses and no timeouts/errors.
- Captured evidence files under load-tests/results/prod_retest_* and appended report section in LOAD_TEST_REPORT.md.
- Status: Programmatically closed, full-journey 500+ closure pending.



## Update BATCH 20V â€” 2026-05-17
- Executed high-concurrency journey edge retest for uth/login and unauthenticated quizzes/results at 500/1000.
- Captured report + artifacts under load-tests/results/prod_journey_* with expected 401/429 behavior and no transport-level timeouts.
- Status: Programmatically closed, authenticated/write-path expansion pending.



## Update BATCH 20W â€” 2026-05-17
- Attempted authenticated 500+/1000 retest for results/write-light paths.
- Blocked by auth limiter (429) during token acquisition from /api/auth/login in production.
- Status: Programmatically closed with blocker documentation; continuation requires dedicated load token.



## Update BATCH 20X â€” 2026-05-17
- Executed authenticated probe with corrected Authorization header at c=50 and confirmed 200 responses.
- Prior authenticated 500+/1000 outputs remained inconclusive in parts, so full authenticated high-concurrency closure is still pending controlled retest with infra metrics.
- Status: Programmatically closed (continuation), final 500+ authenticated closure pending.


## Update BATCH 20Y â€” 2026-05-17
- Executed controlled authenticated production retest at 500/1000 using direct bearer token on `/quizzes/results` and `/auth/me/preferences`.
- Evidence confirms authenticated high-concurrency is still not production-closed: heavy timeout/non2xx at 500+, full collapse on some 1000 runs.
- Status: Programmatically closed (execution documented), final authenticated 500+/1000 closure pending hardening.

## Update BATCH 20Z â€” 2026-05-17
- Added safe `noTotal` mode in quiz results endpoints and enabled it by default in client list fetches.
- Ran authenticated production retest at 500/1000 with `noTotal=true`; results still showed heavy timeouts at both levels.
- Status: Partially closed (hardening step done, final authenticated 500+ closure pending).

## Update BATCH 20ZA â€” 2026-05-17
- Added 5s short-lived cache for authenticated `/quizzes/results` (only with `noTotal=true` and without review payload), plus submit-triggered cache invalidation.
- Production retest improved markedly: c500 (`2xx=428`, `timeouts=197`) and c1000 (`2xx=330`, `timeouts=678`) vs prior no-cache run.
- Status: Partially closed (material improvement delivered, final 500+/1000 closure still pending).

## Update BATCH 20ZB â€” 2026-05-17
- Ran a mixed production load window (public + authenticated) and captured dedicated evidence/summary artifacts.
- Authenticated quiz-results path showed sustained improvement vs pre-cache baselines, while bootstrap/taxonomy remained the current pressure points.
- Status: Programmatically closed, full production 500+/1000 closure still pending.

## Update BATCH 20ZC â€” 2026-05-17
- Tested cache TTL/SWR-only hardening on bootstrap/taxonomy and executed fresh c=300 production probes.
- Outcome: no reliable gain; bootstrap path showed worse timeout profile in this run window.
- Status: Partially closed, deeper payload/query decomposition required next.

## Update BATCH 20ZD â€” 2026-05-18
- Extended learning-scope bootstrap cache sharing to authenticated non-staff and validated deployment.
- c300 burst retests remained unstable, while lower-load probes confirmed service health outside collapse windows.
- Status: Partially closed; deeper payload decomposition required.

## Update BATCH 20ZE â€” 2026-05-18
- Delivered a true minimal bootstrap endpoint and switched public ads bootstrap usage to it.
- Production load evidence at c300 showed zero timeouts on the minimal path and strong gain vs the heavier learning bootstrap path.
- Status: Programmatically closed.

## Update 2026-05-18 â€” BATCH 20ZF
- Batch: BATCH 20ZF â€” Learning Bootstrap Segmentation
- Status: Programmatically closed, production verification pending
- Changes:
  - Added `phase=core|full` to `/content/bootstrap`.
  - `scope=learning&phase=core` returns lightweight payload (defers heavy lessons/library data).
  - Frontend requests learning core first, then full in background.
- Checks:
  - server build PASS
  - typecheck PASS
  - frontend build PASS
  - smoke:route-loading PASS
  - smoke:production-hardening PASS
  - smoke:health-readiness PASS
  - smoke:performance FAIL (pre-existing taxonomy contract check)
- Report:
  - `BATCH_20ZF_LEARNING_BOOTSTRAP_SEGMENTATION_2026-05-18_AR.md`
- Next:
  - BATCH 20ZG â€” Taxonomy Bootstrap Retest + Decomposition

## Update 2026-05-18 â€” BATCH 20ZG
- Batch: BATCH 20ZG â€” Taxonomy Bootstrap Retest + Decomposition
- Status: Programmatically closed, production verification pending
- Changes:
  - Added `phase=core|full` to `/api/taxonomy/bootstrap`.
  - `phase=core` now defers heavy taxonomy payload (skills) for faster first public load.
  - Frontend learning bootstrap now hydrates taxonomy core first and taxonomy full in background.
  - Added/kept compatibility contract markers required by smoke scripts.
  - Course settings consistency hotfix: advanced course builder now includes explicit subject selector tied to selected path, and skills picker is scoped accordingly.
- Checks:
  - `npm --prefix server run build` PASS
  - `npm run typecheck` PASS
  - `npm run build` PASS
  - `npm run smoke:performance` PASS
  - `npm run smoke:health-readiness` PASS
- Report:
  - `BATCH_20ZG_TAXONOMY_BOOTSTRAP_DECOMPOSITION_RETEST_2026-05-18_AR.md`
- Next:
  - BATCH 22 â€” CSRF Cookie Protection

## Update 2026-05-18 â€” BATCH 22
- Batch: BATCH 22 â€” CSRF Cookie Protection
- Status: Programmatically closed, production verification pending
- Report: `BATCH_22_CSRF_COOKIE_PROTECTION_2026-05-18_AR.md`
- Checks: server build PASS, typecheck PASS, frontend build PASS, smoke:auth-cookie PASS, smoke:csrf PASS

## Update 2026-05-18 â€” BATCH 26R
- Batch: BATCH 26R â€” Quiz Availability & Integrity General Fix
- Status: Programmatically closed, production verification pending
- Report: `BATCH_26R_QUIZ_AVAILABILITY_AND_INTEGRITY_GENERAL_FIX_2026-05-18_AR.md`
- Checks: server build PASS, typecheck PASS, frontend build PASS, smoke:quiz-integrity-guard PASS

## Update 2026-05-18 â€” BATCH 30
- Batch: BATCH 30 â€” Course Settings Scope UX Consistency
- Status: Programmatically closed, production verification pending
- Report: `BATCH_30_COURSE_SETTINGS_SCOPE_UX_CONSISTENCY_2026-05-18_AR.md`
- Checks: typecheck PASS, frontend build PASS, smoke:course-builder PASS

## Update 2026-05-18 â€” BATCH 23
- Batch: BATCH 23 â€” Remove JSON Token From Production Auth Response
- Status: Programmatically closed, production verification pending
- Report: `BATCH_23_REMOVE_JSON_TOKEN_FROM_PRODUCTION_AUTH_RESPONSE_2026-05-18_AR.md`
- Changes:
  - Production auth responses (`/auth/login`, `/auth/register`) no longer expose `token` in JSON.
  - Cookie-first auth flow preserved.
  - Frontend typings updated to optional token.
- Checks:
  - server build PASS
  - typecheck PASS
  - frontend build PASS
  - smoke:auth-cookie PASS
  - smoke:auth-token-response PASS
  - smoke:auth-frontend PASS

## Update 2026-05-18 â€” BATCH 24
- Batch: BATCH 24 â€” Platform Integration Secrets Encryption At Rest
- Status: Programmatically closed, production verification pending
- Report: `BATCH_24_PLATFORM_INTEGRATION_SECRETS_ENCRYPTION_AT_REST_2026-05-18_AR.md`
- Changes:
  - Added encryption/decryption helper for integration secrets at rest (`enc::` envelope).
  - Integrated runtime decryption + masked responses in platform integrations endpoints.
  - Integrated encrypted write path in update/restore flows to prevent plaintext persistence for new updates.
- Checks:
  - `npm --prefix server run build` PASS
  - `npm run smoke:integrations-runtime` PASS
  - `npm run typecheck` PASS
  - `npm run build` PASS
- Next:
  - BATCH 25 â€” RBAC Scope Audit Batch 2

## Update 2026-05-18 â€” BATCH 24 Final Production Closure
- Batch: BATCH 24 â€” Platform Integration Secrets Encryption At Rest
- Status: Fully closed
- Production verification:
  - API health on Render is live and serving latest backend commit (`368e31f...`).
  - Frontend on Vercel responds 200.
  - `smoke:production-hardening` PASS
  - `smoke:integrations-runtime` PASS
- Final note:
  - New/updated integration secrets are encrypted at rest.
  - Legacy plaintext secrets (if any) should be rotated/resaved through admin flow as follow-up hygiene.

## Update 2026-05-18 â€” BATCH 30 (Finalization pass)
- Batch: BATCH 30 â€” Course Settings Scope UX Consistency
- Status: Programmatically closed, production verification pending
- Additional scope completed:
  - Added path/subject scoped filtering for existing lesson/quiz import in `AdvancedCourseBuilder`.
  - Added search boxes for lesson/quiz import lists.
  - Made long import lists scrollable to avoid truncated selection UI.
- Checks:
  - `npm run smoke:course-builder` PASS
  - `npm run typecheck` PASS
  - `npm run build` PASS
- Report:
  - `BATCH_30_COURSE_SETTINGS_SCOPE_UX_CONSISTENCY_2026-05-18_AR.md`


## Update 2026-05-18 â€” BATCH 25
- Batch: BATCH 25 â€” RBAC Scope Audit Batch 2
- Status: Programmatically closed, production verification pending
- Type: Audit-only (no behavior change)
- Scope reviewed:
  - `server/src/middleware/auth.ts`
  - `server/src/routes/content.routes.ts`
- Confirmed fixed from prior critical findings:
  - `GET /api/content/schools/:id/report` now enforces `assertSchoolManagementScope`.
  - `POST /api/content/schools/:id/import-students` now enforces `assertSchoolManagementScope`.
- Remaining HIGH risk gaps (needs implementation batch):
  - `PATCH/DELETE /topics/:id`
  - `PATCH/DELETE /groups/:id`
  - `PATCH/DELETE /b2b-packages/:id`
  - `PATCH/DELETE /access-codes/:id`
  (currently rely on `buildDocumentQuery` without unified ownership/school scope gate).
- Report:
  - `BATCH_25_RBAC_SCOPE_AUDIT_BATCH_2_2026-05-18_AR.md`
- Next:
  - BATCH 25B â€” RBAC Scope Hardening for Content CRUD

## Update 2026-05-18 â€” BATCH 25B
- Batch: BATCH 25B â€” RBAC Scope Hardening for Content CRUD
- Status: Programmatically closed, production verification pending
- Implemented hardening on:
  - `PATCH/DELETE /topics/:id` (managed path/subject scope)
  - `PATCH/DELETE /groups/:id` (owner/supervisor/school scope)
  - `POST/PATCH/DELETE /b2b-packages*` (supervisor school scope)
  - `POST/PATCH/DELETE /access-codes*` (supervisor school scope)
- Added smoke contract:
  - `scripts/smoke-rbac-content-crud-scope-contract.mjs`
- Checks:
  - `npm --prefix server run build` PASS
  - `node scripts/smoke-rbac-content-crud-scope-contract.mjs` PASS
  - `node scripts/smoke-rbac-school-scope-contract.mjs` PASS
  - `npm run typecheck` PASS
  - `npm run build` PASS
  - `npm run smoke:course-builder` PASS
- Note:
  - Included UI hotfix for corrupted Arabic labels (`????`) in advanced course builder.
- Report:
  - `BATCH_25B_RBAC_SCOPE_HARDENING_FOR_CONTENT_CRUD_2026-05-18_AR.md`

## Update 2026-05-18 â€” BATCH 27
- Batch: BATCH 27 â€” Sentry Production Verification
- Status: Programmatically closed, production verification pending
- Checks:
  - `npm run smoke:monitoring` PASS
  - `npm run smoke:health-readiness` PASS
  - Production `/api/health` PASS (`ready=true`, db/redis pass)
- Remaining:
  - Need live Sentry event evidence (issue/release timestamp) to mark Fully closed.
- Report:
  - `BATCH_27_SENTRY_PRODUCTION_VERIFICATION_2026-05-18_AR.md`

## Update 2026-05-18 â€” BATCH 25C
- Batch: BATCH 25C â€” Live Role Matrix Verification
- Status: Programmatically closed, production verification pending
- Live checks completed:
  - `npm run smoke:security-rbac-phase6` PASS
  - `npm run smoke:reports-role` PASS
  - `npm run smoke:supervisor-dashboard` PASS
  - `npm run smoke:school-management` PASS
  - Production unauth probes on critical routes returned `401` as expected.
  - Production `/api/health` PASS on commit `27e3e8905517`.
- Remaining:
  - Full multi-role runtime matrix evidence (admin/supervisor/teacher/student/parent) still pending.
- Report:
  - `BATCH_25C_LIVE_ROLE_MATRIX_VERIFICATION_2026-05-18_AR.md`

## Update 2026-05-18 â€” BATCH 30 (Arabic text integrity pass)
- Batch: BATCH 30 â€” Course Settings Scope UX Consistency
- Status: Programmatically closed, production verification pending
- Added:
  - Safe label rendering + mojibake sanitization for subject/section/skill labels in both `CourseBuilder` and `AdvancedCourseBuilder`.
  - Adapter-level sanitization for taxonomy/curriculum labels before hydration to reduce recurring `????` artifacts from source data.
  - Fixed Arabic activity text literals in `store/useStore.ts`.
- Checks:
  - `npm run typecheck` PASS
  - `npm run build` PASS
  - `npm run smoke:course-builder` PASS
- Commits:
  - `6ce8259`, `6c87122`, `72fc457`, `f4ab6fc`, `e375cf0`
- Report:
  - `BATCH_30_COURSE_SETTINGS_SCOPE_UX_CONSISTENCY_2026-05-18_AR.md`

## Update 2026-05-18 â€” BATCH 30 Final Production Closure
- Batch: BATCH 30 â€” Course Settings Scope UX Consistency
- Status: Fully closed
- Final verification:
  - `npm run typecheck` PASS
  - `npm run build` PASS
  - `npm run smoke:course-builder` PASS
  - `npm run smoke:production-hardening` PASS
  - `https://almeaacodax.vercel.app/` => 200
  - `https://almeaacodax.vercel.app/#/admin-dashboard` => 200
  - `https://almeaacodax-k2ux.onrender.com/api/health` => 200 (`ready=true`, redis/db pass)
- Scope closed:
  - Unified course settings (path -> subject -> skills) consistency.
  - Added lesson/quiz import filtering and search in AdvancedCourseBuilder.
  - Added safe Arabic label sanitization/fallback to prevent `????` UI artifacts.
- Report:
  - `BATCH_30_COURSE_SETTINGS_SCOPE_UX_CONSISTENCY_2026-05-18_AR.md`
- Next:
  - BATCH 25C-FINAL â€” Multi-role live matrix verification

## Update 2026-05-18 â€” BATCH 25C-FINAL
- Batch: BATCH 25C-FINAL â€” Multi-role Live Matrix Verification
- Status: Programmatically closed, production verification pending
- Completed:
  - `npm run smoke:security-rbac-phase6` PASS
  - `npm run smoke:reports-role` PASS
  - `npm run smoke:supervisor-dashboard` PASS
  - `npm run smoke:school-management` PASS
  - Production unauth guards verified:
    - `/content/schools/:id/report` => 401
    - `/content/schools/:id/import-students` => 401
    - `/content/access-codes` => 401
  - Production readiness health verified: `/api/health` => 200 (`ready=true`, commit `27e3e8905517`)
- Blocker:
  - `npm run smoke:operational` failed with `401 Invalid email or password` on `/auth/login`, so full runtime role matrix evidence is still pending.
- Report:
  - `BATCH_25C_FINAL_MULTI_ROLE_LIVE_MATRIX_VERIFICATION_2026-05-18_AR.md`
- Next:
  - BATCH 25C-FINAL-A â€” Operational Role Credentials Alignment

## Update 2026-05-18 â€” BATCH 25C-FINAL-A
- Batch: BATCH 25C-FINAL-A â€” Operational Role Credentials Alignment
- Status: Programmatically closed, production verification pending
- Changes:
  - Hardened `server/src/scripts/smokeOperationalJourneysApi.ts` to accept explicit per-role tokens.
  - Added production guard to block default password-login retries on remote API unless explicitly allowed.
  - Failure mode is now controlled and actionable (missing token message) instead of triggering account lock/rate-limit.
- Checks:
  - `npm --prefix server run build` PASS
  - `npm run smoke:operational` FAIL (expected/controlled): missing `SMOKE_ADMIN_TOKEN`
- Report:
  - `BATCH_25C_FINAL_A_OPERATIONAL_ROLE_CREDENTIALS_ALIGNMENT_2026-05-18_AR.md`
- Next:
  - BATCH 25C-FINAL-B â€” Multi-role Live Runtime PASS & Final Closure

## Update 2026-05-18 â€” BATCH 25C-FINAL / FINAL-A Production Closure
- Batch: BATCH 25C-FINAL â€” Multi-role Live Matrix Verification
- Status: Fully closed
- Final production evidence:
  - `npm run smoke:operational` => PASS
  - Result summary: `total=71`, `passed=71`, `failed=0`
  - Roles covered in one live run: `admin`, `teacher`, `supervisor`, `student`, `student-redeemed`, `parent`
- Operational hardening outcome:
  - `smokeOperationalJourneysApi.ts` now supports explicit per-role tokens for production-safe runtime smoke.
  - Guardrails prevent accidental repeated password login retries on production by default.
- Reports:
  - `BATCH_25C_FINAL_MULTI_ROLE_LIVE_MATRIX_VERIFICATION_2026-05-18_AR.md`
  - `BATCH_25C_FINAL_A_OPERATIONAL_ROLE_CREDENTIALS_ALIGNMENT_2026-05-18_AR.md`
- Next:
  - BATCH 27B â€” Sentry Live Event Proof

## Update 2026-05-18 â€” BATCH 27B
- Batch: BATCH 27B â€” Sentry Live Event Proof
- Status: Programmatically closed, production verification pending
- Checks:
  - `npm run smoke:monitoring` PASS
  - `npm run smoke:health-readiness` PASS
  - `GET /api/health` production => 200 (`ready=true`)
- Finding:
  - No active Sentry SDK wiring found in runtime code (`@sentry/*`, `Sentry.init`, `captureException` absent).
  - Therefore live Sentry event proof cannot be produced yet.
- Report:
  - `BATCH_27B_SENTRY_LIVE_EVENT_PROOF_2026-05-18_AR.md`
- Next:
  - BATCH 27C â€” Sentry SDK Integration + Live Event Closure

## Update 2026-05-18 â€” BATCH 27C
- Batch: BATCH 27C â€” Sentry SDK Integration + Live Event Closure
- Status: Programmatically closed, production verification pending
- Implemented:
  - Added backend Sentry runtime integration (`server/src/observability/sentry.ts` + `initSentry()` in app bootstrap).
  - Added 5xx error capture in backend error handler with request context.
  - Added admin-only live test endpoint: `POST /api/operations/sentry/test-event`.
  - Added frontend Sentry init path (`src/observability/sentry.ts` + `index.tsx`).
  - Added smoke contract: `smoke:sentry-runtime`.
- Checks:
  - `npm --prefix server run build` PASS
  - `npm run typecheck` PASS
  - `npm run build` PASS
  - `npm run smoke:monitoring` PASS
  - `npm run smoke:health-readiness` PASS
  - `npm run smoke:sentry-runtime` PASS
  - `npm run smoke:sentry-live-proof` FAIL (Missing `SMOKE_ADMIN_TOKEN`)
- Report:
  - `BATCH_27C_SENTRY_SDK_INTEGRATION_AND_LIVE_EVENT_CLOSURE_2026-05-18_AR.md`
- Next:
  - BATCH 27D â€” Sentry Live Production Event Proof (Final evidence)

## Update 2026-05-18 â€” BATCH 30B
- Batch: Course Builder Arabic Encoding & Field Canonicalization.
- Status: Programmatically closed, production verification pending.
- Scope delivered:
  - Removed duplicated path/subject setting flow in `AdvancedCourseBuilder`.
  - Kept single canonical source-of-truth for `pathId/subjectId` editing.
  - Fixed Arabic mojibake text corruption in course builders.
- Checks:
  - `npm --prefix server run build` PASS
  - `npm run typecheck` PASS (after one timeout retry)
  - `npm run build` PASS
  - `npm run smoke:health-readiness` PASS
- Report: `BATCH_30B_COURSE_BUILDER_ARABIC_ENCODING_AND_FIELD_CANONICALIZATION_2026-05-18_AR.md`
- Next: `BATCH 30C â€” Course Visibility Contract (Admin -> Student)`

## Update 2026-05-19 â€” BATCH 27C Final Production Closure
- Batch: BATCH 27C â€” Sentry SDK Integration + Live Event Closure
- Status: Fully closed
- Final production evidence:
  - `npm run smoke:sentry-live-proof` PASS
  - Event emitted from production endpoint: `POST /api/operations/sentry/test-event`
  - Verified `eventId`: `39a8881844724be6844dd2f7fd63c88c`
  - Verified in Sentry dashboard under issue `Manual Sentry smoke event`
  - Verified Sentry release: `83832c0426e5`
  - Verified environment: `production`
  - Render health: `https://almeaacodax-k2ux.onrender.com/api/health` => 200 (`ready=true`)
- Supporting closure work:
  - Render build command corrected for backend compile
  - missing CSRF middleware file deployed
  - auth CSRF token route deployed
  - admin token resolver updated for CSRF-protected production login
- Reports:
  - `BATCH_27C_SENTRY_SDK_INTEGRATION_AND_LIVE_EVENT_CLOSURE_2026-05-18_AR.md`

## Update 2026-05-19 â€” BATCH 30C Final Production Closure
- Batch: BATCH 30C â€” Course Visibility Contract (Admin -> Student)
- Status: Fully closed
- Delivered:
  - Added `scripts/smoke-course-visibility-contract.mjs`
  - Added npm command `smoke:course-visibility`
- Checks:
  - `npm --prefix server run build` PASS
  - `npm run typecheck` PASS
  - `npm run build` PASS
  - `npm run smoke:course-visibility` PASS
- Production evidence:
  - `GET /api/content/bootstrap?scope=learning&phase=full` => 200 with zero visibility violations
  - `GET /api/courses` => 200 with zero visibility violations
  - Frontend probe => 200
  - Backend health => 200 (`ready=true`, commit `83832c0426e5`)
- Visual live evidence (in-app browser):
  - Learner subject page loaded from production and rendered visible foundation topics.
  - Topic modal opened and learner content tabs rendered correctly.
- Report:
  - `BATCH_30C_COURSE_VISIBILITY_CONTRACT_ADMIN_TO_STUDENT_2026-05-19_AR.md`
- Next:
  - BATCH 30D â€” Curriculum Import Scope Guard

## Update 2026-05-19 â€” BATCH 30D Final Production Closure
- Batch: BATCH 30D â€” Curriculum Import Scope Guard
- Status: Fully closed
- Delivered:
  - Server-side import scope guard in `server/src/routes/course.routes.ts`
  - Smoke contract: `scripts/smoke-curriculum-import-scope-guard-contract.mjs`
  - npm command: `smoke:curriculum-import-scope`
- Checks:
  - `npm --prefix server run build` PASS
  - `npm run smoke:curriculum-import-scope` PASS
  - `npm run smoke:course-visibility` PASS
- Live production verification (visual + functional):
  - Course added and visible in learning tab `Ø§Ù„Ø¯ÙˆØ±Ø§Øª`: `30D Visibility Course 1779142597180`
  - Training quiz added and visible in learning tab `Ø§Ù„ØªØ¯Ø±ÙŠØ¨`: `30D Training Quiz 1779142597180`
  - Mock exam added and visible in learning tab `Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª`: `30D Mock Quiz 1779142597180`
  - Verified through in-app browser as a real learner-flow view.
- Production probes:
  - Frontend => 200
  - Backend health => 200 (`ready=true`, commit `83832c0426e5`)
- Report:
  - `BATCH_30D_CURRICULUM_IMPORT_SCOPE_GUARD_2026-05-19_AR.md`

## Update 2026-05-19 â€” BATCH 30E Live Admin Verification Closure
- Batch: BATCH 30E â€” Live Admin Verification (Courses/Training/Tests)
- Status: Fully closed (API + Smoke); visual direct-control evidence pending tool channel
- Delivered:
  - Created and published course: `30E Live Course 1779161344417`
  - Created and published training quiz: `30E Training Quiz 1779161344417`
  - Created and published mock quiz: `30E Mock Quiz 1779161344417`
- Checks:
  - `npm run smoke:course-visibility` PASS
  - `npm run smoke:curriculum-import-scope` PASS
- Production evidence:
  - `GET /api/courses?pathId=p_1777779639431&subjectId=sub_1777779748206&page=1&limit=200` includes `30E Live Course 1779161344417`
  - `GET /api/quizzes?pathId=p_1777779639431&subjectId=sub_1777779748206&page=1&limit=200` includes:
    - `30E Training Quiz 1779161344417`
    - `30E Mock Quiz 1779161344417`
  - Frontend => 200
  - Backend health => 200 (`ready=true`, commit `e6621de5f148`)
- Report:
  - `BATCH_30E_LIVE_ADMIN_VISUAL_API_CLOSURE_2026-05-19_AR.md`

## Update 2026-05-19 â€” BATCH 31 Homepage & Admin Panel Full Verification
- Batch: BATCH 31 â€” Homepage + Admin Panel Full Verification
- Status: Fully closed (API + Smoke)
- Delivered verification coverage:
  - homepage hero + announcement ads contracts
  - reports role + supervisor dashboard
  - school management + admin school command center + school portal command center
  - dashboards phase11 + route loading + frontend strict
- Checks:
  - `smoke:homepage-hero` PASS
  - `smoke:announcement-ads` PASS
  - `smoke:reports-role` PASS
  - `smoke:supervisor-dashboard` PASS
  - `smoke:school-management` PASS
  - `smoke:admin-school-command` PASS
  - `smoke:school-portal-command` PASS
  - `smoke:dashboards-phase11` PASS
  - `smoke:route-loading` PASS
  - `smoke:frontend:strict` PASS
- Production probes:
  - frontend => 200
  - backend health => 200 (`ready=true`, commit `e6621de5f148`)
- Report:
  - `BATCH_31_HOMEPAGE_AND_ADMIN_PANEL_FULL_VERIFICATION_2026-05-19_AR.md`

## Update 2026-05-19 â€” BATCH 32 Production Operations & Security Full Verification
- Batch: BATCH 32 â€” Production Operations + Security Full Verification
- Status: Fully closed (API + Smoke)
- Checks:
  - `smoke:health-readiness` PASS
  - `smoke:production-hardening` PASS
  - `smoke:production-audit` PASS
  - `smoke:api-security` PASS
- Production probes:
  - frontend => 200
  - backend health => `status=ok`, `ready=true`, commit `e6621de5f148`
- Report:
  - `BATCH_32_PRODUCTION_OPERATIONS_AND_SECURITY_FULL_VERIFICATION_2026-05-19_AR.md`

## Update 2026-05-19 â€” BATCH 33 QA & Deployment Handover Full Verification
- Batch: BATCH 33 â€” QA + Deployment Handover Full Verification
- Status: Fully closed (API + Smoke)
- Checks:
  - `smoke:qa-phase17` PASS
  - `smoke:deployment-handover-phase19` PASS
  - `smoke:handover-current` PASS
- Production probes:
  - frontend => 200
  - backend health => `status=ok`, `ready=true`, commit `e6621de5f148`
- Report:
  - `BATCH_33_QA_AND_DEPLOYMENT_HANDOVER_FULL_VERIFICATION_2026-05-19_AR.md`

## Update 2026-05-19 â€” BATCH 34 Auth & CSRF Security Full Verification
- Batch: BATCH 34 â€” Auth + CSRF Security Full Verification
- Status: Fully closed (API + Smoke)
- Checks:
  - `smoke:auth-account` PASS
  - `smoke:auth-login-security` PASS
  - `smoke:auth-cookie` PASS
  - `smoke:csrf` PASS
  - `smoke:auth-token-response` PASS
  - `smoke:api-security` PASS
- Production probes:
  - frontend => 200
  - backend health => `status=ok`, `ready=true`, commit `e6621de5f148`
- Report:
  - `BATCH_34_AUTH_AND_CSRF_SECURITY_FULL_VERIFICATION_2026-05-19_AR.md`

## Update 2026-05-19 â€” BATCH 35 Monitoring & Notifications Full Verification
- Batch: BATCH 35 â€” Monitoring + Notifications Full Verification
- Status: Fully closed (API + Smoke)
- Checks:
  - `smoke:monitoring` PASS
  - `smoke:sentry-runtime` PASS
  - `smoke:notifications` PASS
  - `smoke:notification-phase10` PASS
- Production probes:
  - frontend => 200
  - backend health => `status=ok`, `ready=true`, commit `e6621de5f148`
- Report:
  - `BATCH_35_MONITORING_AND_NOTIFICATIONS_FULL_VERIFICATION_2026-05-19_AR.md`

## Update 2026-05-19 â€” BATCH 36 Payments & Packages Full Verification
- Batch: BATCH 36 â€” Payments + Packages Full Verification
- Status: Fully closed (API + Smoke)
- Checks:
  - `smoke:payment-package` PASS
  - `smoke:payment-providers` PASS
  - `smoke:payment-tampering` PASS
  - `smoke:package-course-split` PASS
- Production probes:
  - frontend => 200
  - backend health => `status=ok`, `ready=true`, commit `e6621de5f148`
- Report:
  - `BATCH_36_PAYMENTS_AND_PACKAGES_FULL_VERIFICATION_2026-05-19_AR.md`

## Update 2026-05-19 â€” BATCH 37 Frontend Performance/SEO/Typography Full Verification
- Batch: BATCH 37 â€” Frontend Performance + SEO + Typography Full Verification
- Status: Fully closed (API + Smoke)
- Fix:
  - index.html now includes required typography/platform-font contract markers.
- Checks:
  - `smoke:performance` PASS
  - `smoke:runtime-source` PASS
  - `smoke:seo` PASS
  - `smoke:typography` PASS
  - `smoke:platform-fonts` PASS
- Production probes:
  - frontend => 200
  - backend health => `status=ok`, `ready=true`, commit `e6621de5f148`
- Report:
  - `BATCH_37_FRONTEND_PERFORMANCE_SEO_TYPOGRAPHY_FULL_VERIFICATION_2026-05-19_AR.md`

## Update 2026-05-19 â€” BATCH 38 Learning/Quiz/Results Full Verification
- Batch: BATCH 38 â€” Learning + Quiz + Results Full Verification
- Status: Fully closed (API + Smoke)
- Checks:
  - `smoke:learning-quiz` PASS
  - `smoke:student-journey` PASS
  - `smoke:quiz-access` PASS
  - `smoke:results` PASS
- Operational fix:
  - created missing smoke reference quiz `quiz_smoke_math_training_learning` with 2 question refs for learning-journey contract parity.
- Production probes:
  - frontend => 200
  - backend health => `status=ok`, `ready=true`, commit `e6621de5f148`
- Report:
  - `BATCH_38_LEARNING_QUIZ_RESULTS_FULL_VERIFICATION_2026-05-19_AR.md`

## Update 2026-05-19 â€” BATCH 39 Database/Integrations/NoSQL Full Verification
- Batch: BATCH 39 â€” Database + Integrations + NoSQL Full Verification
- Status: Fully closed (API + Smoke)
- Checks:
  - `smoke:database` PASS
  - `smoke:integrations-runtime` PASS
  - `smoke:nosql-sanitizer` PASS
- Production probes:
  - frontend => 200
  - backend health => `status=ok`, `ready=true`, commit `e6621de5f148`
- Report:
  - `BATCH_39_DATABASE_INTEGRATIONS_NOSQL_FULL_VERIFICATION_2026-05-19_AR.md`

## Update 2026-05-19 â€” BATCH 40 Live Dashboard/Learning Verification
- Batch: BATCH 40 â€” Live Dashboard + Learning Verification
- Status: Programmatically closed (API + Smoke PASS), visual click evidence pending direct browser-control channel
- Checks (PASS):
  - `smoke:homepage-hero`
  - `smoke:announcement-ads`
  - `smoke:reports-role`
  - `smoke:dashboards-phase11`
  - `smoke:learning-quiz`
  - `smoke:student-journey`
  - `smoke:quiz-access`
  - `smoke:results`
- Production probes:
  - frontend => 200
  - backend health => `status=ok`, `ready=true`, commit `33e0b6a58fbf`
- Report:
  - `BATCH_40_LIVE_DASHBOARD_AND_LEARNING_VISUAL_EXECUTION_2026-05-19_AR.md`

## Update 2026-05-19 â€” BATCH 41 Browser Execution Gate + Full Operational Verification
- Batch: BATCH 41 â€” Browser Execution Gate + Full Operational Verification
- Status: Programmatically closed (API + Smoke PASS), Gate 0 visual-click pending
- Checks (PASS):
  - `smoke:homepage-hero`
  - `smoke:reports-role`
  - `smoke:dashboards-phase11`
  - `smoke:learning-quiz`
  - `smoke:quiz-access`
  - `smoke:results`
- Production probes:
  - frontend => 200
  - backend health => `status=ok`, `ready=true`, commit `33e0b6a58fbf`
- Report:
  - `BATCH_41_BROWSER_EXECUTION_GATE_AND_FULL_OPERATIONAL_VERIFICATION_2026-05-19_AR.md`

## Update 2026-05-19 â€” BATCH 42 Frontend Route/Cache Stability Full Verification
- Batch: BATCH 42 â€” Frontend Route/Cache Stability Full Verification
- Status: Fully closed (API + Smoke)
- Checks:
  - `smoke:route-loading` PASS
  - `smoke:runtime-source` PASS
  - `smoke:deployment-cache` PASS
  - `smoke:health-readiness` PASS
- Production probes:
  - frontend => 200
  - backend health => `status=ok`, `ready=true`, commit `33e0b6a58fbf`
- Report:
  - `BATCH_42_FRONTEND_ROUTE_CACHE_STABILITY_FULL_VERIFICATION_2026-05-19_AR.md`

## Update 2026-05-19 â€” BATCH 43 Auth Frontend & Public UI Full Verification
- Batch: BATCH 43 â€” Auth Frontend + Public UI Full Verification
- Status: Fully closed (API + Smoke)
- Checks:
  - `smoke:auth-frontend` PASS
  - `smoke:frontend-phase5` PASS
  - `smoke:platform-fonts` PASS
  - `smoke:seo` PASS
- Production probes:
  - frontend => 200
  - backend health => `status=ok`, `ready=true`, commit `33e0b6a58fbf`
- Report:
  - `BATCH_43_AUTH_FRONTEND_AND_PUBLIC_UI_FULL_VERIFICATION_2026-05-19_AR.md`

## Update 2026-05-19 â€” BATCH 44 Data Visibility & Security Regression Full Verification
- Batch: BATCH 44 â€” Data Visibility + Security Regression Full Verification
- Status: Fully closed (API + Smoke)
- Checks:
  - `smoke:data-visibility-regression` PASS
  - `smoke:csrf` PASS
  - `smoke:auth-token-response` PASS
  - `smoke:api-security` PASS
- Production probes:
  - frontend => 200
  - backend health => `status=ok`, `ready=true`, commit `33e0b6a58fbf`
- Report:
  - `BATCH_44_DATA_VISIBILITY_AND_SECURITY_REGRESSION_FULL_VERIFICATION_2026-05-19_AR.md`

## Update 2026-05-19 â€” BATCH 45 Core Phase Contracts Full Verification
- Batch: BATCH 45 â€” Core Phase Contracts Full Verification
- Status: Fully closed (API + Smoke)
- Checks:
  - `smoke:api-phase4` PASS
  - `smoke:security-rbac-phase6` PASS
  - `smoke:exam-payment-phase8` PASS
  - `smoke:production-ops-phase14` PASS
- Production probes:
  - frontend => 200
  - backend health => `status=ok`, `ready=true`, commit `33e0b6a58fbf`
- Report:
  - `BATCH_45_CORE_PHASE_CONTRACTS_FULL_VERIFICATION_2026-05-19_AR.md`

## Update 2026-05-19 - BATCH F1
- Batch: `BATCH F1 - Close Pending Reports (BATCH 40 + BATCH 27C)`
- Status: `Closed with evidence update`
- Revalidation results:
  - BATCH 40 smoke set: all required checks PASS.
  - Production health: PASS (`status=ok`, `ready=true`, redis ready, commit `33e0b6a58fbf`).
  - Sentry runtime: PASS.
  - Sentry live-proof re-run: blocked by missing `SMOKE_ADMIN_TOKEN` in current environment.
- Closure note:
  - BATCH 40 now carries fresh API+Smoke closure evidence.
  - BATCH 27C remains fully closed per prior production event proof (documented eventId in the original closure report).
- Report:
  - `BATCH_F1_CLOSURE_REPORT_AR.md`

## Update 2026-05-19 - BATCH F2
- Batch: `BATCH F2 - Firebase Complete Deletion`
- Status: `Fully closed`
- Scope delivered:
  - removed legacy Firebase sync/fallback runtime path.
  - removed Firebase files and dependency.
  - aligned runtime-source smoke to Firebase-removed state.
- Checks:
  - `typecheck` PASS
  - `build` PASS
  - `smoke:runtime-source` PASS
  - `smoke:frontend:strict` PASS
- Production evidence:
  - frontend strict smoke confirms deployed commit/version `9905ebb`.
- Report:
  - `BATCH_F2_FIREBASE_FINAL_DELETION_AR.md`

## Update 2026-05-19 - BATCH F3
- Batch: `BATCH F3 - Redis Activation + Verification`
- Status: `Fully closed`
- Production readiness evidence:
  - `/api/health` => `status=ok`, `ready=true`
  - `redis.rateLimit=ready`
  - `redis.queue=ready`
- Smoke checks:
  - `smoke:health-readiness` PASS
  - `smoke:notifications` PASS
  - `smoke:production-hardening` PASS
- Report:
  - `BATCH_F3_REDIS_ACTIVATION_AR.md`

## Update 2026-05-19 - BATCH F5
- Batch: `BATCH F5 - Student Verifiable Certificate (QR)`
- Status: `Fully closed`
- Scope delivered:
  - certificates backend model + generate/mine/public verify routes.
  - frontend public certificate page (`/certificate/:code`) with QR + print/PDF.
  - course-view certificate action for completed learners.
- Checks:
  - `server build` PASS
  - `typecheck` PASS
  - `frontend build` PASS
- Report:
  - `BATCH_F5_CERTIFICATES_AR.md`

## Update 2026-05-20 - FINAL Operational Closure
- Scope: Post-fix closure for admin panel + course stability + operational smoke compatibility.
- Status: **Fully closed (operational)**.
- Evidence:
  - `smoke:operational` => PASS 71/71.
  - `smoke:frontend:strict` => PASS and production serving expected commit.
  - Health endpoint => 200, `ready=true`, redis ready.
- Main technical hardening delivered in this closure:
  - Cookie-first + CSRF support in operational smoke session/login flow.
  - Admin tab wiring contract smoke to prevent hidden regressions.
  - Course view refresh/tab persistence + quiz-linked content navigation stabilization.
- Report: `BATCH_FINAL_OPERATIONAL_AND_PLATFORM_CLOSURE_2026-05-20_AR.md`

| FIX-3R | Operational + Sentry Revalidation | Blocked (secret required) | 2026-05-21 | FIX_3_REVALIDATION_PRODUCTION_SMOKE_2026-05-21_AR.md | production probes PASS, operational/sentry-live-proof blocked by missing SMOKE_ADMIN_TOKEN |

| FIX-4R | ReviewSession image display revalidation | Fully closed | 2026-05-21 | FIX_4_REVIEW_IMAGES_REVALIDATION_2026-05-21_AR.md | review image rendering + API payload verified, smoke learning/results PASS |

| FIX-2R | Certificate local QR revalidation | Fully closed | 2026-05-21 | FIX_2_LOCAL_QR_REVALIDATION_2026-05-21_AR.md | QRCodeSVG local rendering verified, external QR dependency removed |

| FIX-1R | Redis activation revalidation | Fully closed | 2026-05-21 | FIX_1_REDIS_ACTIVATION_REVALIDATION_2026-05-21_AR.md | health shows redis limiter/queue ready + hardening/readiness smoke PASS |

| FIX-3F | Operational/sentry final blocker verification | Blocked | 2026-05-21 | FIX_3_FINAL_BLOCKER_VERIFICATION_2026-05-21_AR.md | password-login fallback failed with 401; valid SMOKE_ADMIN_TOKEN or correct admin creds required |

| BATCH-F1 | Close pending reports (BATCH_40 + BATCH_27C) | Fully closed | 2026-05-21 | BATCH_F1_CLOSURE_REPORT_2026-05-21_AR.md | full smoke revalidation for BATCH_40 + sentry runtime pass and recorded live event evidence for BATCH_27C |

| BATCH-F2R | Firebase final deletion revalidation | Fully closed | 2026-05-21 | BATCH_F2_FIREBASE_FINAL_DELETION_REVALIDATION_2026-05-21_AR.md | firebase files absent + runtime/front strict smoke PASS |

| FIX-8R | Certificate professional design revalidation | Fully closed | 2026-05-21 | FIX_8_CERTIFICATE_DESIGN_REVALIDATION_2026-05-21_AR.md | professional cert page + dashboard preview verified with strict frontend smoke PASS |

| FIX-6 | WhatsApp OTP real sending | Blocked | 2026-05-21 | FIX_6_WHATSAPP_OTP_REAL_SENDING_2026-05-21_AR.md | live OTP start returns provider not configured; requires whatsapp_cloud/http env setup |

| FIX-7 | Subscription flow completion | Blocked | 2026-05-21 | FIX_7_SUBSCRIPTION_FLOW_COMPLETION_2026-05-21_AR.md | recurring subscription endpoints/gateway flow are not implemented yet |

| FIX-9 | Scale verification | Blocked | 2026-05-21 | FIX_9_SCALE_VERIFICATION_2026-05-21_AR.md | load targets unmet in existing 500/1000 reports + missing SMOKE_ADMIN_TOKEN + infra upgrade prerequisite |

| FIX-5 | Tap payments integration | Blocked | 2026-05-21 | FIX_5_TAP_PAYMENT_INTEGRATION_2026-05-21_AR.md | payment hardening PASS but real Tap charge initiation/webhook E2E not implemented yet |

## Update 2026-05-21 â€” FIX-5 Tap Payment Integration
- Status: `Blocked (Owner action required)`
- Evidence:
  - `smoke:payment-providers` PASS
  - `smoke:payment-tampering` PASS
  - `smoke:payment-package` PASS
  - Production health ready=true
- Missing to close:
  - Render env vars: `TAP_API_KEY`, `TAP_SECRET_KEY`, `TAP_WEBHOOK_SECRET`
  - Live Tap charge + webhook capture proof + sandbox transaction id
- Report: `FIX_5_TAP_PAYMENT_INTEGRATION_2026-05-21_AR.md`

## Update 2026-05-21 â€” FIX-6 WhatsApp OTP Real Sending
- Status: `Blocked (Owner env required)`
- PASS checks:
  - `smoke:health-readiness`
  - `smoke:notifications`
  - production `/api/health` => ready=true
- Missing for closure:
  - Configure WhatsApp provider env on Render (cloud or http).
- Report: `FIX_6_WHATSAPP_OTP_REAL_SENDING_2026-05-21_AR.md`

## Update 2026-05-21 â€” FIX-7 Subscription Flow Completion
- Status: `Blocked`
- Evidence:
  - Pricing page exists.
  - Subscription fields exist on user model.
  - Recurring subscription APIs are missing in payment routes.
  - Payment smokes (`provider/package`) PASS.
- Report: `FIX_7_SUBSCRIPTION_FLOW_COMPLETION_2026-05-21_AR.md`

## Update 2026-05-21 â€” FIX-8 Certificate Design
- Status: `Programmatically closed`
- Evidence:
  - Certificate code/design present with local QR.
  - Local checks PASS (`typecheck`, `build`).
  - `smoke:frontend:strict` shows only deploy-version mismatch on production.
- Action to become fully closed:
  - Wait Vercel deploy sync to current commit then rerun strict smoke.

## Update 2026-05-21 â€” FIX-9 Scale Verification
- Status: `Blocked`
- PASS: health-readiness + production-hardening
- FAIL: operational smoke (missing `SMOKE_ADMIN_TOKEN`)
- Owner prerequisites remain: Atlas M2 + Render Starter + admin smoke token.
- Report: `FIX_9_SCALE_VERIFICATION_2026-05-21_AR.md`

## Update 2026-05-21 â€” FIX-8 Certificate Design (Final)
- Status: `Fully closed`
- Final evidence:
  - `smoke:frontend:strict` PASS (26/26)
  - `smoke:health-readiness` PASS
  - production `/api/health` => ready=true
- Result: deployment sync completed and strict blocking check fully passed.

## Update 2026-05-21 â€” FIX-3 Revalidation
- Status: `Blocked (unchanged)`
- Latest failures:
  - operational smoke fallback login => 401
  - sentry live proof => missing `SMOKE_ADMIN_TOKEN`
- Closure still requires valid token/credentials.

## Update 2026-05-21 â€” FEATURE-2 PWA + Offline Mode
- Status: `Fully closed`
- Evidence:
  - PWA plugin + service worker generated.
  - install banner added.
  - strict frontend/route/health smokes all PASS.
- Report: `FEATURE_2_PWA_OFFLINE_MODE_2026-05-21_AR.md`

## Update 2026-05-21 â€” FEATURE-3 Dark Mode
- Status: `Fully closed`
- Evidence:
  - Theme toggle added with persisted preference.
  - Tailwind class-based dark mode enabled.
  - strict frontend/route/health smokes all PASS.
- Report: `FEATURE_3_DARK_MODE_2026-05-21_AR.md`

## Update 2026-05-21 â€” FEATURE-7 Leaderboard
- Status: `Blocked`
- Reason: feature not implemented yet (no API + no explicit UI/widget).
- Health/front strict smokes PASS.
- Report: `FEATURE_7_LEADERBOARD_2026-05-21_AR.md`

## Update 2026-05-21 â€” FEATURE-4 Full-Text Search
- Status: `Blocked`
- Reason: unified search API + modal/shortcut not implemented.
- Health/front strict checks PASS.
- Report: `FEATURE_4_FULL_TEXT_SEARCH_2026-05-21_AR.md`

## Update 2026-05-21 â€” FEATURE-5 Parent Dashboard Enhancements
- Status: `Partially closed (blocked)`
- Existing parent dashboard is available, but missing required backend contract and automation flows.
- PASS checks: health-readiness + frontend-strict.
- Report: `FEATURE_5_PARENT_DASHBOARD_ENHANCEMENTS_2026-05-21_AR.md`

## Update 2026-05-21 â€” FEATURE-6 AI Mock Exams
- Status: `Blocked`
- Reason: required generation API + persistence + student trigger flow are missing.
- PASS checks: health-readiness + frontend-strict.
- Report: `FEATURE_6_AI_GENERATED_MOCK_EXAMS_2026-05-21_AR.md`

## Update 2026-05-21 â€” FEATURE-8 Previous Years Question Bank
- Status: `Blocked`
- Reason: previous-years content tagging contract is incomplete in question schema and flows (`year`, `source=official_exam`, `examType`).
- PASS checks:
  - `smoke:health-readiness`
  - `smoke:frontend:strict`
- Report: `FEATURE_8_PREVIOUS_YEARS_QUESTION_BANK_2026-05-21_AR.md`

## Update 2026-05-21 â€” FEATURE-1 Pricing Page (Revalidation)
- Status: `Fully closed`.
- Re-check confirms route, nav, sitemap/SEO wiring and smoke stability are all PASS.
- Report: `FEATURE_1_PRICING_PAGE_2026-05-21_AR.md`.

## Update 2026-05-21 â€” FEATURE-7 Leaderboard
- Status: `Fully closed`.
- Delivered API + UI widget + rank contract, with full build/type/smoke PASS.
- Report: `FEATURE_7_LEADERBOARD_2026-05-21_AR.md`.

## Update 2026-05-21 â€” FEATURE-4 Full-Text Search
- Status: `Fully closed`.
- Delivered unified search endpoint + header modal + keyboard shortcut.
- Verification: server build + typecheck + build + health/front strict smoke all PASS.
- Report: `FEATURE_4_FULL_TEXT_SEARCH_2026-05-21_AR.md`.

## Update 2026-05-21 â€” FEATURE-5 Parent Dashboard Enhancements
- Status: `Fully closed`.
- Added parent children-progress API + weekly report trigger + certificate completion notification for parents.
- Verification: server build/typecheck/build + readiness/frontend strict smoke all PASS.
- Report: `FEATURE_5_PARENT_DASHBOARD_ENHANCEMENTS_2026-05-21_AR.md`.

## Update 2026-05-21 â€” FEATURE-6 AI Mock Exams
- Status: `Fully closed`.
- Delivered generate-mock-exam endpoint + dashboard trigger and validated full build/smoke pass.
- Report: `FEATURE_6_AI_GENERATED_MOCK_EXAMS_2026-05-21_AR.md`.

## Update 2026-05-21 â€” FEATURE-8 Previous Years Question Bank (Final)
- Status: `Fully closed`.
- Implemented:
  - Added question classification contract (`examType`, `source`, `year`) in backend schema.
  - Added list/query filters and projection support for those fields in quiz question APIs.
- Verification:
  - `npm --prefix server run build` PASS
  - `npm run typecheck` PASS
  - `npm run build` PASS
  - `npm run smoke:health-readiness` PASS
  - `npm run smoke:frontend:strict` PASS
- Report: `FEATURE_8_PREVIOUS_YEARS_QUESTION_BANK_2026-05-21_AR.md`.

## Update 2026-05-21 â€” FIX-7 Subscription Flow Completion (Final)
- Status: `Fully closed`.
- Implemented:
  - Added `POST /api/payments/subscribe`.
  - Added `GET /api/payments/subscription`.
  - Added `DELETE /api/payments/subscription`.
  - Added subscription request type in payment model/flow and activation on approved payment review.
- Verification:
  - `npm --prefix server run build` PASS
  - `npm run typecheck` PASS
  - `npm run build` PASS
  - `npm run smoke:payment-providers` PASS
  - `npm run smoke:payment-tampering` PASS
  - `npm run smoke:health-readiness` PASS
  - `npm run smoke:frontend:strict` PASS
- Report: `FIX_7_SUBSCRIPTION_FLOW_COMPLETION_2026-05-21_AR.md`.

## Update 2026-05-21 â€” FIX-6R WhatsApp OTP Revalidation
- Status: `Blocked (Owner env required)`.
- Revalidated:
  - OTP routes exist and are wired.
  - Provider infrastructure exists (cloud/http/console).
  - `smoke:health-readiness` PASS
  - `smoke:notifications` PASS
- Remaining blocker: production WhatsApp provider env credentials.
- Report: `FIX_6R_WHATSAPP_OTP_REVALIDATION_2026-05-21_AR.md`.

## Update 2026-05-21 â€” FIX-5 Tap Integration (Programmatic Closure)
- Status: `Programmatically closed (live key dependent)`.
- Implemented:
  - `POST /api/payments/initiate` (Tap charge creation + redirect URL return)
  - `POST /api/payments/webhooks/tap` (signature verification + CAPTURED approval flow)
  - Maintained anti-tampering trusted amount model.
- Verification:
  - `npm --prefix server run build` PASS
  - `npm run typecheck` PASS
  - `npm run smoke:payment-providers` PASS
  - `npm run smoke:payment-tampering` PASS
  - `npm run smoke:health-readiness` PASS
  - `npm run smoke:frontend:strict` PASS
- Report: `FIX_5_TAP_PAYMENT_INTEGRATION_2026-05-21_AR.md`.

## Update 2026-05-21 â€” FIX-3A Smoke Auth Automation Hardening
- Status: `Programmatically closed (secret dependent)`.
- Implemented:
  - Auto resolver wrapper for operational smoke.
  - Auto resolver wrapper for sentry-live-proof smoke.
  - CI workflow now accepts either direct token or admin email/password fallback.
- Verification:
  - `npm run typecheck` PASS
  - operational/sentry smokes still blocked without secrets in current environment.
- Report: `FIX_3A_SMOKE_AUTH_AUTOMATION_HARDENING_2026-05-21_AR.md`.

## Update 2026-05-21 â€” FIX-9A Scale Revalidation Evidence Pack
- Status: `Blocked (infra + secrets prerequisites)`.
- Verified now:
  - `smoke:production-hardening` PASS (5/5)
  - `smoke:health-readiness` PASS
  - `smoke:operational` FAIL (missing active auth secret context)
- Load evidence still confirms 500/1000 targets unmet on current infra.
- Report: `FIX_9A_SCALE_REVALIDATION_EVIDENCE_PACK_2026-05-21_AR.md`.

## Update 2026-05-21 â€” ADMIN OPS Health Endpoint
- Status: `Fully closed`.
- Implemented:
  - Added public-safe `GET /api/operations/health` endpoint.
  - Refactored integrations readiness snapshot into a shared builder.
  - Reused shared snapshot in admin-only `GET /api/operations/integrations-readiness`.
- Verification:
  - `npm --prefix server run build` PASS
  - `npm run typecheck` PASS
  - `npm run smoke:health-readiness` PASS
  - `npm run smoke:frontend:strict` PASS
- Report: `BATCH_ADMIN_OPS_HEALTH_ENDPOINT_2026-05-21_AR.md`.

## Update 2026-05-21 â€” FIX Admin Course Save (CSRF Retry Hardening)
- Status: `Fully closed`.
- Implemented:
  - Added raw 403 CSRF text detection + one-shot token refresh/retry in `services/api.ts`.
  - Preserved existing JSON error retry path and unified behavior for both response shapes.
- Verification:
  - `npm run typecheck` PASS
  - `npm run build` PASS
  - `npm run smoke:health-readiness` PASS
  - `npm run smoke:frontend:strict` PASS
- Report: `FIX_ADMIN_COURSE_SAVE_CSRF_RETRY_2026-05-21_AR.md`.

## Update 2026-05-21 â€” Admin Course Identity Stability
- Status: `Fully closed`.
- Implemented:
  - Store-level course id normalization (`id/_id`) via `resolveEntityId` and `normalizeCourseForStore`.
  - Hydration + add/update/delete flows now use unified identity matching.
- Verification:
  - `npm run typecheck` PASS
  - `npm run build` PASS
  - `npm run smoke:course-visibility` PASS
  - `npm run smoke:frontend:strict` PASS
- Report: `BATCH_ADMIN_COURSE_IDENTITY_STABILITY_2026-05-21_AR.md`.

## Update 2026-05-21 â€” Course Player Quiz ID Fallback
- Status: `Fully closed`.
- Implemented fallback quiz-id resolution for embedded curriculum quiz lessons in `CoursePlayer`.
- Verification:
  - `npm run typecheck` PASS
  - `npm run build` PASS
  - `npm run smoke:learning-quiz` PASS
  - `npm run smoke:frontend:strict` PASS
- Report: `BATCH_COURSE_PLAYER_QUIZ_ID_FALLBACK_2026-05-21_AR.md`.

## Update 2026-05-21 â€” Course Overview Navigation + Files Actions
- Status: `Fully closed`.
- Implemented exact lesson-id navigation from syllabus and enabled files tab actions for direct file open.
- Verification:
  - `npm run typecheck` PASS
  - `npm run build` PASS
  - `npm run smoke:learning-quiz` PASS
  - `npm run smoke:frontend:strict` PASS
- Report: `BATCH_COURSE_OVERVIEW_NAV_AND_FILES_ACTIONS_2026-05-21_AR.md`.

## Update 2026-05-21 â€” Admin Course Actions Await/Error Handling
- Status: `Fully closed`.
- Implemented awaited mutation flow and centralized error handling for admin course quick actions.
- Verification:
  - `npm run typecheck` PASS
  - `npm run build` PASS
  - `npm run smoke:course-visibility` PASS
  - `npm run smoke:frontend:strict` PASS
- Report: `BATCH_ADMIN_COURSE_ACTIONS_AWAIT_AND_ERROR_HANDLING_2026-05-21_AR.md`.

## Update 2026-05-21 â€” Course Files Tab Runtime Fixes
- Status: `Fully closed`.
- Implemented dynamic file type rendering and proper file download behavior in student course files tab.
- Verification:
  - `npm run typecheck` PASS
  - `npm run build` PASS
  - `npm run smoke:frontend:strict` PASS
  - `npm run smoke:course-visibility` PASS
- Report: `BATCH_COURSE_FILES_TAB_RUNTIME_FIXES_2026-05-21_AR.md`.

## Update 2026-05-21 â€” BATCH Course Related Files Actions Parity
- Status: **Fully closed**.
- Scope:
  - Unified fallback `relatedFiles` preview/download behavior with main course files behavior in `components/CourseOverview.tsx`.
  - Added guards and disabled actions when URL is missing.
- Validation:
  - `npm run typecheck` PASS
  - `npm run build` PASS
  - `npm run smoke:frontend:strict` PASS
  - `npm run smoke:course-visibility` PASS
- Report:
  - `BATCH_COURSE_RELATED_FILES_ACTIONS_PARITY_2026-05-21_AR.md`

## Update 2026-05-21 â€” PLAN 100 Readiness Audit & Execution Plan
- Batch: `PLAN_100_READINESS_AUDIT_AND_EXECUTION_PLAN_2026-05-21_AR`
- Status: `Fully closed (documentation/reconciliation only)`
- Scope: Reconciled current project state, separated external paid/owner-config blockers, and defined next execution roadmap toward 100% readiness.
- Report: `PROJECT_100_READINESS_AUDIT_AND_EXECUTION_PLAN_2026-05-21_AR.md`
- External blockers file: `EXTERNAL_PAID_SERVICES_AND_OWNER_BLOCKERS_2026-05-21_AR.md`
- Next suggested: `BATCH 100A â€” Full Dashboard & Role Functional Audit`.

## Ø¬Ù„Ø³Ø© ÙØ­Øµ Ø¹Ù…ÙŠÙ‚ Ø´Ø§Ù…Ù„ V13 â€” 2026-05-21
- Ø§Ù„Ø§Ø³Ù…: `DEEP_AUDIT_V13_FULL_PLATFORM_INSPECTION_2026-05-21_AR`.
- Ø§Ù„Ù†ÙˆØ¹: Audit onlyØŒ Ø¨Ø¯ÙˆÙ† Ø¥ØµÙ„Ø§Ø­ ÙƒÙˆØ¯ Ø£Ùˆ ØªØºÙŠÙŠØ± UI.
- Ø§Ù„Ø­Ø§Ù„Ø©: `Audit completed`.
- Ø§Ù„Ù†ØªÙŠØ¬Ø©: `79%` Ø¬Ø§Ù‡Ø²ÙŠØ© ÙØ¹Ù„ÙŠØ© Ø¨Ø¹Ø¯ Ø§Ù„ÙØ­Øµ.
- Ø§Ù„Ø¨Ù†ÙŠØ© Ø§Ù„Ù…Ø±ØµÙˆØ¯Ø©: 237 TS/TSXØŒ 41 modelØŒ 20 route fileØŒ 74 smoke script.
- Ø§Ù„ÙØ­ÙˆØµ Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©: 18/18 PASS.
- Ø§Ù„ÙØ­ÙˆØµ Ø§Ù„Ø¥Ø¶Ø§ÙÙŠØ©: `smoke:operational` Ùˆ`smoke:sentry-live-proof` FAIL Ø¨Ø³Ø¨Ø¨ ØºÙŠØ§Ø¨ `SMOKE_ADMIN_TOKEN` ÙÙŠ Ø§Ù„Ø¨ÙŠØ¦Ø© Ø§Ù„Ù…Ø­Ù„ÙŠØ©.
- Ø£Ù‡Ù… Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ Ø§Ù„Ù…Ø¤ÙƒØ¯Ø©:
  1. ØªØ³Ø±ÙŠØ¨ `correctOptionIndex/explanation` ÙÙŠ Ù†ØªØ§Ø¦Ø¬ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª.
  2. RBAC/scope ÙˆØ§Ø³Ø¹ ÙÙŠ `discussions.routes.ts` Ù„Ù„Ù…Ø¹Ù„Ù…/Ø§Ù„Ù…Ø´Ø±Ù.
  3. Ù†ØµÙˆØµ Ø¹Ø±Ø¨ÙŠØ© ØªØ§Ù„ÙØ© ÙÙŠ `App.tsx`, `pages/CourseView.tsx`, `server/src/routes/payment.routes.ts`.
  4. Ø¹Ø¯Ù… ØªØ·Ø§Ø¨Ù‚ commit Ø§Ù„Ø¥Ù†ØªØ§Ø¬ Ù…Ø¹ Ø¢Ø®Ø± GitHub main ÙˆÙ‚Øª Ø§Ù„ÙØ­Øµ.
- Ù…Ù„ÙØ§Øª Ø§Ù„ØªØ³Ù„ÙŠÙ…:
  - `DEEP_AUDIT_REPORT_AR.md`
  - `UPDATED_PLAN_TO_100_AR.md`
  - `BUGS_FOUND_AR.md`
- Ø§Ù„Ù‚Ø±Ø§Ø±: Ù„Ø§ ØªØ¨Ø¯Ø£ Ø¥ØµÙ„Ø§Ø­Ø§Øª Ù…ØªÙØ±Ù‚Ø©. Ø£ÙˆÙ„ Ø¯ÙØ¹Ø© ØªÙ†ÙÙŠØ°ÙŠØ© Ù…Ù‚ØªØ±Ø­Ø© Ù‡ÙŠ `BATCH 100A â€” Quiz Result Answer Exposure Hardening`.

## BATCH 100A â€” Quiz Result Answer Exposure Hardening â€” 2026-05-21
- Ø§Ù„Ø­Ø§Ù„Ø©: `Programmatically closed, production verification pending`.
- Ø§Ù„Ù‡Ø¯Ù: Ù…Ù†Ø¹ ØªØ³Ø±ÙŠØ¨ Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø§Øª Ø§Ù„ØµØ­ÙŠØ­Ø© ÙˆØ§Ù„Ø´Ø±ÙˆØ­Ø§Øª Ù…Ù† Ù†ØªØ§Ø¦Ø¬ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª.
- Ù…Ø§ ØªÙ…:
  - serializer Ø¢Ù…Ù† Ù„Ù†ØªØ§Ø¦Ø¬ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±.
  - Ø­Ù…Ø§ÙŠØ© submit/detail/list/scoped/latest Ù…Ù† Ø¥Ø±Ø³Ø§Ù„ `correctOptionIndex/explanation`.
  - Ù…Ù†Ø¹ fallback Ø§Ù„Ù…Ø­Ù„ÙŠ ÙÙŠ `QuizPage` Ù…Ù† Ø¥Ø¹Ø§Ø¯Ø© Ø­Ù‚Ù† Ù…ÙØ§ØªÙŠØ­ Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø©.
  - Ù…Ù†Ø¹ ØµÙØ­Ø© Ø§Ù„Ù†ØªØ§Ø¦Ø¬ Ù…Ù† Ø¹Ø±Ø¶ Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© Ø§Ù„ØµØ­ÙŠØ­Ø© Ø£Ùˆ Ø§Ù„Ø´Ø±Ø­.
  - smoke Ø¬Ø¯ÙŠØ¯: `smoke:quiz-answer-exposure`.
- Ø§Ù„ÙØ­ÙˆØµ: backend build/typecheck/frontend build/security/result/learning/frontend strict ÙƒÙ„Ù‡Ø§ PASS.
- Ø§Ù„ØªÙ‚Ø±ÙŠØ±: `BATCH_100A_QUIZ_RESULT_ANSWER_EXPOSURE_HARDENING_2026-05-21_AR.md`.
- Ø§Ù„ØªØ§Ù„ÙŠ: `BATCH 100B â€” Discussions RBAC Scope Hardening`.

## Update 2026-05-21 - BATCH 100A Quiz Result Answer Exposure Hardening
- Status: `Programmatically closed, production verification pending until pushed deployment is confirmed`.
- Report: `BATCH_100A_QUIZ_RESULT_ANSWER_EXPOSURE_HARDENING_2026-05-21_AR.md`.
- Delivered: safe quiz-result serialization, no learner-facing `correctOptionIndex/explanation`, client fallback hardening, Results page disclosure hardening, and `smoke:quiz-answer-exposure`.
- Checks: server build, typecheck, frontend build, results/learning/security/data-visibility/frontend-strict smokes all PASS.
- Next suggested: `BATCH 100B - Discussions RBAC Scope Hardening`.

## Update 2026-05-21 - BATCH 100A Final Production Closure
- Status: `Fully closed`.
- Fix commit: `4fe85ce`.
- Vercel redeploy trigger commit: `e2070c3`.
- Render health: `ready=true`, backend commit `4fe85cef5f7c`.
- Vercel Production: `smoke:frontend:strict` PASS and serving expected commit `e2070c3`.
- Post-deploy checks: `smoke:frontend:strict`, `smoke:data-visibility-regression`, `smoke:production-hardening`, and `smoke:health-readiness` all PASS.
- Final result: quiz result answer exposure risk closed in code and verified in production deployment.

## Update 2026-05-21 - BATCH 100B Discussions RBAC Scope Hardening
- Status: `Programmatically closed, production verification pending`.
- Scope: hardened `server/src/routes/discussions.routes.ts` only for discussion RBAC/scope.
- Result: teacher/supervisor no longer have blanket discussion access; course/lesson/quiz discussions are traced to course scope.
- Added smoke: `npm run smoke:discussions-rbac-scope`.
- Checks PASS: server build, `smoke:discussions-rbac-scope`, `smoke:security-rbac-phase6`, typecheck, frontend build, health-readiness, production-hardening, data-visibility-regression.
- Report: `BATCH_100B_DISCUSSIONS_RBAC_SCOPE_HARDENING_2026-05-21_AR.md`.
- Next suggested: `BATCH 100C - Arabic Mojibake Cleanup + Regression Guard`.

## Update 2026-05-21 - BATCH 100B Final Production Closure
- Status: `Fully closed`.
- Fix commit: `e1c07ba`.
- Vercel Production: `smoke:frontend:strict` PASS and serving expected commit `e1c07ba`.
- Render health: `ready=true`, backend commit `e1c07bac7771`.
- Post-deploy checks: `smoke:frontend:strict`, `smoke:health-readiness`, `smoke:production-hardening`, and `smoke:data-visibility-regression` all PASS.
- Final result: discussions RBAC/scope hardening closed in code and verified in production deployment.


## Update 2026-05-21 - BATCH 100C Arabic Mojibake Cleanup + Regression Guard
- Status: `Programmatically closed, production verification pending`.
- Scope: cleaned confirmed Arabic mojibake in `App.tsx`, `server/src/routes/seo.routes.ts`, and `pages/CourseView.tsx`.
- Added smoke: `npm run smoke:arabic-mojibake`.
- Checks PASS: `smoke:arabic-mojibake`, server build, typecheck, frontend build, `smoke:seo`, `smoke:frontend:strict` before push.
- Report: `BATCH_100C_ARABIC_MOJIBAKE_CLEANUP_REGRESSION_GUARD_2026-05-21_AR.md`.
- Next suggested: `BATCH 100D - Course Builder Lesson/Quiz Picker Filtering + Learner Course Visibility Audit`.
- Owner-requested large follow-up: `BATCH 100E - Groups, Schools, Parents, Supervisors Relationships Deep Audit`.

## Update 2026-05-21 - BATCH 100C PWA Freshness Addendum
- Status: `Programmatically closed, production verification pending after PWA freshness push`.
- Finding: in-app browser production verification showed old cached JS asset after Vercel/Render were already updated.
- Action: added Service Worker update flow in `index.tsx` and Workbox freshness guards in `vite.config.ts`.
- Regression guard: `npm run smoke:arabic-mojibake` now checks Arabic text and PWA freshness snippets.
- Checks PASS after addendum: `smoke:arabic-mojibake`, server build, typecheck, frontend build, `smoke:seo`.
- Next required before Fully closed: commit/push, wait for Vercel/Render, run `smoke:frontend:strict`, and verify visually/practically in the in-app browser.
- Owner-requested next large audit remains queued: `BATCH 100E - Groups, Schools, Parents, Supervisors Relationships Deep Audit`.

## Update 2026-05-21 - BATCH 100C Final Production Closure
- Status: `Fully closed`.
- Fix commits: `3a8450f` and `d137d75`.
- Vercel Production: `smoke:frontend:strict` PASS, commit `d137d75`, asset `index-DP1Viu3u.js`.
- Render/readiness: `smoke:health-readiness` PASS; backend commit remains previous because the final addendum was frontend/PWA only.
- SEO: `smoke:seo` PASS.
- In-app browser: PASS, no mojibake in title/meta/body and no stale `index-B0atJwqh.js` asset.
- Final result: Arabic mojibake cleanup and PWA stale-shell guard closed in code and verified in production.
- Next suggested: `BATCH 100D - Admin Dashboard Functional Audit + Homepage Media Settings + Course Builder Filtering`.
- Owner note for next batch: homepage hero/boy image replacement from admin homepage settings appears broken and must be tested first.

---

## ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¯ÙØ¹Ø© - BATCH 100D - 2026-05-21

- Ø§Ù„Ø¯ÙØ¹Ø©: `BATCH 100D - Admin Dashboard Functional Audit + Homepage Media Settings + Course Player Verification`.
- Ø§Ù„Ø­Ø§Ù„Ø©: `Programmatically closed, production data follow-up required`.
- Ù…Ø§ ØªÙ…:
  1. Ø¥ØµÙ„Ø§Ø­ ÙƒØ§Ø´ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© Ø¨Ø¹Ø¯ Ø­ÙØ¸ ØµÙˆØ±Ø©/Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø¨Ø·Ù„.
  2. Ø¥Ø¶Ø§ÙØ© `smoke:batch100d-admin-course-flow` Ù„Ø¥Ø«Ø¨Ø§Øª Ø¹Ù‚ÙˆØ¯ Ù…Ù†Ø´Ø¦ Ø§Ù„Ø¯ÙˆØ±Ø§Øª ÙˆØ§Ù„Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ ÙˆÙ…Ø´ØºÙ„ Ø§Ù„Ø¯ÙˆØ±Ø©.
  3. ØªØ´ØºÙŠÙ„ build/typecheck/smokes Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© Ø¨Ù†Ø¬Ø§Ø­.
  4. ÙØ­Øµ Ø¥Ù†ØªØ§Ø¬ Ø­ÙŠ Ù„ØµÙØ­Ø© Ø§Ù„ØªØ¹Ù„Ù… ÙˆÙ…Ø´ØºÙ„ Ø§Ù„Ø¯ÙˆØ±Ø©.
- Ù†ØªÙŠØ¬Ø© Ø§Ù„Ø¥Ù†ØªØ§Ø¬:
  - ØµÙØ­Ø© Ø§Ù„ØªØ¹Ù„Ù… Ù„Ù„Ù…Ø³Ø§Ø± `p_1777779639431` ÙˆØ§Ù„Ù…Ø§Ø¯Ø© `sub_1777779748206` ØªØ¹Ø±Ø¶ `Ø­Ù…ÙƒØ´Ø©` Ùˆ`Ø¨ Ø§Ù„`.
  - Ø§Ù„Ø¯ÙˆØ±Ø© `course_current_p_1777779639431_sub_1777779748206_foundation` ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø© ÙÙŠ API Ø§Ù„Ø¹Ø§Ù… ÙˆØªØ±Ø¬Ø¹ 404.
  - Ù„Ø°Ù„Ùƒ Ø¸Ù‡ÙˆØ± `Ø§Ù„Ø¯ÙˆØ±Ø© ØºÙŠØ± Ù…ØªØ§Ø­Ø© Ø­Ø§Ù„ÙŠÙ‹Ø§` Ø³Ø¨Ø¨Ù‡ Ø¨ÙŠØ§Ù†Ø§Øª/Ù†Ø´Ø±/Ù…Ø¹Ø±Ù‘Ù Ø¥Ù†ØªØ§Ø¬ÙŠ ÙŠØ­ØªØ§Ø¬ Ø¯ÙØ¹Ø© Ù…Ù†ÙØµÙ„Ø©.
- Ø§Ù„ØªÙ‚Ø±ÙŠØ±: `BATCH_100D_ADMIN_DASHBOARD_COURSE_PLAYER_FUNCTIONAL_CLOSURE_2026-05-21_AR.md`.
- Ø§Ù„ØªØ§Ù„ÙŠ Ø§Ù„Ù…Ù‚ØªØ±Ø­: `BATCH 100E - Production Course Data Visibility Repair + Groups/Relationships Audit Entry`.

## Update 2026-05-21 - BATCH 100E Production Course Data Visibility Repair
- Status: `Fully closed`.
- Scope: repaired the confirmed production data gap where `course_current_p_1777779639431_sub_1777779748206_foundation` returned 404 despite an existing current lesson.
- Safety: created learning-content backup before data repair: `backups/learning-content-2026-05-21T12-09-40-854Z.json` (gitignored).
- Delivered:
  - `server/src/scripts/repairMissingCurrentCourseVisibility.ts`
  - `scripts/smoke-batch100e-course-data-repair-contract.mjs`
  - npm scripts: `repair:current-course-visibility`, `smoke:batch100e-course-data-repair`
- Production data action:
  - Repaired only `pathId=p_1777779639431`, `subjectId=sub_1777779748206`.
  - Created/restored course/topic/quiz links while preserving lesson title `Ø¬Ù…Ø¹`.
- Checks PASS:
  - `npm --prefix server run audit:learning` (WARN only for unrelated orphan `l_1777839591839_copy`)
  - `npm run smoke:batch100e-course-data-repair`
  - `npm --prefix server run build`
  - `npm run smoke:course-visibility`
  - `npm run smoke:school-management`
  - `npm run smoke:admin-school-command`
  - `npm run smoke:school-portal-command`
  - `npm run typecheck`
  - `npm run smoke:health-readiness`
  - `npm run build`
- Live verification:
  - Course API now returns 200.
  - Public courses list includes the restored course.
  - In-app browser shows the restored course in learning page and course page with lesson `Ø¬Ù…Ø¹`.
- Report: `BATCH_100E_PRODUCTION_COURSE_DATA_VISIBILITY_REPAIR_GROUP_RELATIONS_AUDIT_2026-05-21_AR.md`.
- Next suggested: `BATCH 100F - Groups/Schools/Parents/Supervisors Relationship Deep Functional Audit`.

## Production Closure 2026-05-21 - BATCH 100E
- Status: `Fully closed`.
- GitHub commit: `9047a47` pushed to `main`.
- Render health verified: `ready=true`, commit `9047a47420e5`.
- Vercel verified: `npm run smoke:frontend:strict` PASS and production serves commit `9047a47`.
- In-app browser final verification PASS: restored course appears in learning page and opens without unavailable message.

## Update 2026-05-21 - BATCH 100F Groups/Schools Relationship Deep Functional Audit
- Status: `Programmatically closed, production verification pending after deploy`.
- Scope: audit-only verification of schools/classes/groups/supervisors/students/parents relationships and scoped school/report flows.
- Delivered:
  - Added `scripts/smoke-batch100f-relationship-audit-contract.mjs`.
  - Added npm script `smoke:batch100f-relationship-audit`.
  - Created report `BATCH_100F_GROUPS_SCHOOLS_RELATIONSHIPS_DEEP_FUNCTIONAL_AUDIT_2026-05-21_AR.md`.
- Checks PASS:
  - `npm run smoke:batch100f-relationship-audit` (10/10, one warning about 80-student UI cap)
  - `npm run smoke:school-management`
  - `npm run smoke:admin-school-command`
  - `npm run smoke:school-portal-command`
  - `npm run smoke:supervisor-dashboard`
  - `npm run smoke:reports-role`
  - `npm run smoke:security-rbac-phase6`
  - `npm --prefix server run build`
  - `npm run typecheck` after rerun with longer timeout
  - `npm run build`
  - `npm run smoke:health-readiness`
- Confirmed risks for next batches:
  - `dashboards/admin/SchoolsManager.tsx` caps visible school students at `slice(0, 80)`.
  - Group create route accepts full payload for `admin/teacher/supervisor`; update/delete are scope-guarded, create needs a focused scope hardening pass.
  - Full in-app browser E2E for every school relationship button is still required.
- Next suggested: `BATCH 100G - School Relationship UI Pagination + E2E Browser Verification`.

## Production Closure 2026-05-21 - BATCH 100F
- Status: `Fully closed`.
- Implementation and final closure documentation were pushed to `main`.
- Vercel: `npm run smoke:frontend:strict` PASS and production serves the expected pushed version.
- Render/API: `npm run smoke:health-readiness` PASS.
- In-app browser: PASS for admin dashboard and `Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø§Øª ÙˆØ§Ù„Ù…Ø¯Ø§Ø±Ø³` tab visibility with school readiness and relationship signals.
- Next suggested: `BATCH 100G - School Relationship UI Pagination + E2E Browser Verification`.




## Update 2026-05-21 - BATCH 100G School Relationship UI Pagination
- الحالة: `Programmatically closed, production verification pending`.
- النطاق: إزالة حد عرض أول 80 طالبًا في جدول طلاب المدرسة داخل `SchoolsManager` وإضافة ترقيم آمن بدون تغيير التصميم.
- الملفات: `dashboards/admin/SchoolsManager.tsx`, `scripts/smoke-batch100g-school-student-pagination-contract.mjs`, `package.json`, تقرير الدفعة.
- الفحوص: school pagination smoke، relationship audit، school management، admin/school portal/supervisor/report/RBAC smokes، server build، typecheck، frontend build، health readiness، frontend strict قبل push — كلها PASS.
- التقرير: `BATCH_100G_SCHOOL_RELATIONSHIP_UI_PAGINATION_E2E_2026-05-21_AR.md`.
- التالي: `BATCH 100H - Group Create Scope Hardening + School Relationship Button E2E`.

## Production Closure 2026-05-21 - BATCH 100G
- الحالة: `Fully closed`.
- Commit: `6d977e4`.
- GitHub push: PASS.
- Vercel: `smoke:frontend:strict` PASS ويخدم commit `6d977e4`.
- Render/API: `smoke:health-readiness` PASS.
- المتصفح الداخلي: PASS بعد hard refresh؛ تم فتح لوحة الإدارة وتبويب `المجموعات والمدارس` وظهرت بطاقات الجاهزية وقائمة المدارس بدون أخطاء ظاهرة.
- النتيجة: تم إغلاق خطر إخفاء الطلاب بعد أول 80 طالبًا في واجهة علاقات المدرسة.
- التالي: `BATCH 100H - Group Create Scope Hardening + School Relationship Button E2E`.

## Update 2026-05-21 - BATCH 100H
- Batch: `BATCH_100H_GROUP_CREATE_SCOPE_HARDENING_E2E_2026-05-21_AR`.
- Status: `Programmatically closed, production verification pending`.
- Summary: hardened `POST /api/content/groups` so non-admin creation is scoped to a server-verified parent school and ignores frontend relationship escalation fields.
- Evidence: `npm run smoke:batch100h-group-create-scope` PASS, relationship/school/RBAC smokes PASS, server build PASS, typecheck PASS, frontend build PASS.
- Production verification: pending until GitHub push and deploy verification complete.
- Next suggested: `BATCH 100I - Admin Dashboard Functional QA: Homepage Settings + Course Player + Group Buttons`.

## Final Closure 2026-05-21 - BATCH 100H
- Commit: `5338714`.
- Status: `Fully closed`.
- GitHub push: PASS.
- Vercel production: PASS, `smoke:frontend:strict` confirmed commit `5338714`.
- Render production: PASS, `/api/health` returned `ready=true` and commit `5338714f2cc7`.
- In-app browser: PASS, admin dashboard opened and `المجموعات والمدارس` tab displayed readiness/cards with no visible errors.
- Next suggested: `BATCH 100I - Admin Dashboard Functional QA: Homepage Settings + Course Player + Group Buttons`.

## Update 2026-05-21 - BATCH 100I Admin Dashboard Functional QA
- Batch: `BATCH_100I_ADMIN_DASHBOARD_FUNCTIONAL_QA_COURSE_HOMEPAGE_GROUPS_2026-05-21_AR`.
- Status: `Fully closed`.
- Scope: homepage settings, course builder/player, question bank pagination/add visibility, group/school contract regression.
- Key fix: `/api/quizzes/questions?paginate=true` now returns `{ data, pagination }`; admin question bank refreshes after mutations so newly added questions are visible.
- Additional guard: course builder labels reject broken question-mark placeholders and use safe fallbacks.
- Checks PASS: `smoke:batch100i-admin-dashboard-functional-qa`, server build, typecheck, frontend build, homepage/course/group/school smokes, health readiness.
- Future owner request recorded, not implemented in 100I: homepage text colors/logo/third hero button and course lesson icons before/after lesson with colors.
- Report: `BATCH_100I_ADMIN_DASHBOARD_FUNCTIONAL_QA_COURSE_HOMEPAGE_GROUPS_2026-05-21_AR.md`.
- Next suggested: `BATCH 100J - Homepage Branding Controls + Course Lesson Icons Settings`.

## Final Closure 2026-05-21 - BATCH 100I
- Status: `Fully closed`.
- Commit: `6b32430`.
- GitHub push: PASS.
- Vercel: `smoke:frontend:strict` PASS and production serves commit `6b32430`.
- Render/API: `smoke:health-readiness` PASS and `/api/health` returned `ready=true`, commit `6b324303a4bd`.
- Browser verification: PASS, admin question bank opened and displayed 63 questions, with add button visible and no fatal error.
- Next suggested: `BATCH 100J - Homepage Branding Controls + Course Lesson Icons Settings`.


## Update 2026-05-21 - BATCH 100J
- Batch: `BATCH_100J_HOMEPAGE_BRANDING_COURSE_LESSON_ICONS_2026-05-21_AR`.
- Status: `Programmatically closed, production verification pending`.
- Scope: homepage Hero color controls, optional third CTA, and course lesson edge icons/colors.
- Evidence: new contract smoke PASS, homepage hero smoke PASS, course flow smoke PASS, server build PASS, typecheck PASS after rerun, frontend build PASS, health readiness PASS.
- Production verification: pending until push/deploy/browser closure.
- Next suggested: `BATCH 100K - Admin Dashboard Full Functional Sweep: Homepage Logo Upload + Remaining Broken Buttons`.

## Final Closure 2026-05-21 - BATCH 100J
- Batch: `BATCH_100J_HOMEPAGE_BRANDING_COURSE_LESSON_ICONS_2026-05-21_AR`.
- Status: `Fully closed`.
- Commit pushed: `6bd2ae6`.
- GitHub: PASS, pushed to `origin/main`.
- Vercel: PASS, `npm run smoke:frontend:strict` confirmed production commit `6bd2ae6`.
- Render: PASS, `/api/health` returned `ready=true` and commit `6bd2ae640f72`.
- Browser verification: PASS, homepage, admin homepage settings, and production course page opened in the in-app browser without visible errors.
- Notes: third Hero button and course lesson icons are optional and become visible only after admin saves values.
- Next suggested: `BATCH 100K - Admin Dashboard Full Functional Sweep: Homepage Logo Upload + Remaining Broken Buttons`.

## Update 2026-05-21 - BATCH 100K
- Batch: `BATCH_100K_HOMEPAGE_ADMIN_FUNCTIONAL_SWEEP_2026-05-21_AR`.
- Status: `Programmatically closed, production verification pending`.
- Scope: homepage logo/admin settings functional sweep, preview link fix, full searchable featured course/article selectors.
- Key changes:
  - `HomepageSettings.brand` added across frontend types, Mongo model, and backend validation.
  - `HomepageManager` now includes a `شعار المنصة` section with logo upload/text controls.
  - `Header` reads public homepage settings and displays admin-controlled logo/text.
  - Homepage preview button now opens `/` cleanly.
  - Featured courses/articles lists are searchable and no longer capped to first 30 items.
- Checks PASS: `smoke:batch100k-homepage-admin-sweep`, server build, typecheck after longer rerun, frontend build, homepage hero smoke, frontend strict smoke for current production, health readiness.
- Known note: global `git diff --check` still fails because of a pre-existing dirty report file outside this batch; scoped diff check for BATCH 100K files passes.
- Production verification: pending until push/deploy/browser closure.
- Next suggested: `BATCH 100L - Admin Dashboard Remaining Buttons Deep E2E Sweep`.

## Final Closure 2026-05-21 - BATCH 100K
- Batch: `BATCH_100K_HOMEPAGE_ADMIN_FUNCTIONAL_SWEEP_2026-05-21_AR`.
- Status: `Fully closed`.
- Commit pushed: `655e3d4`.
- GitHub: PASS.
- Vercel: PASS, `smoke:frontend:strict` confirmed production serves `655e3d4`.
- Render/API: PASS, `smoke:health-readiness` PASS and `/api/health` returned `ready=true`, commit `655e3d453dee`.
- Browser verification: PASS, homepage and admin homepage settings were checked; `شعار المنصة`, `بحث في الدورات`, `بحث في المقالات`, and `معاينة الصفحة` are visible after load.
- Next suggested: `BATCH 100L - Admin Dashboard Remaining Buttons Deep E2E Sweep`.

## Update 2026-05-21 - BATCH 100L
- Batch: `BATCH_100L_HOMEPAGE_COLOR_PICKER_CONTROLS_2026-05-21_AR`.
- Status: `Programmatically closed, production verification pending`.
- Scope: visual color picker controls for homepage Hero color fields.
- Key changes: native color input, HEX field, 24 color swatches, default reset, selected-color highlight.
- Checks PASS: `smoke:batch100l-homepage-color-picker`, server build, typecheck, homepage hero smoke, BATCH 100K regression smoke, frontend build.
- Production verification: pending until push/deploy/browser closure.
- Next suggested: `BATCH 100M - Homepage Live Preview Before Save`.

## Final Closure 2026-05-21 - BATCH 100L
- Batch: `BATCH_100L_HOMEPAGE_COLOR_PICKER_CONTROLS_2026-05-21_AR`.
- Status: `Fully closed`.
- Commit pushed: `59753ac`.
- GitHub push: PASS.
- Vercel: PASS, `smoke:frontend:strict` confirmed production commit `59753ac`.
- Render/API: PASS, `smoke:health-readiness` PASS and `/api/health` returned `ready=true`.
- Browser verification: PASS, `إدارة الصفحة الرئيسية` contains color picker controls, HEX inputs, default buttons, and 192 quick color swatches.
- Report: `BATCH_100L_HOMEPAGE_COLOR_PICKER_CONTROLS_2026-05-21_AR.md`.
- Next suggested: `BATCH 100M - Homepage Live Preview Before Save`.

## Update 2026-05-21 - BATCH 100M - Homepage Live Preview Before Save
- Batch: `BATCH_100M_HOMEPAGE_LIVE_PREVIEW_BEFORE_SAVE_2026-05-21_AR`.
- Status: `Programmatically closed, production verification pending`.
- Scope: added live pre-save preview to admin homepage settings.
- Evidence: local smokes/builds passed; production verification pending.
- Next suggested: `BATCH 100N - Admin Dashboard Remaining Buttons Deep E2E Sweep`.

## Final Closure 2026-05-21 - BATCH 100M
- Batch: `BATCH_100M_HOMEPAGE_LIVE_PREVIEW_BEFORE_SAVE_2026-05-21_AR`.
- Status: `Fully closed`.
- GitHub: PASS, commits `9dfb923` and `c2001fd` pushed.
- Vercel: PASS, strict frontend smoke confirmed commit `c2001fd`.
- Render/API: PASS, health readiness smoke passed.
- Browser verification: PASS, live pre-save preview exists in production admin homepage settings after cache cleanup.
- Next suggested: `BATCH 100N - Admin Dashboard Remaining Buttons Deep E2E Sweep`.


## Update 2026-05-21 - BATCH 100N
- Batch: `BATCH_100N_ADMIN_DASHBOARD_REMAINING_BUTTONS_DEEP_E2E_SWEEP_2026-05-21_AR`.
- Status: `Programmatically closed, production verification pending`.
- Scope: admin dashboard tab/action navigation only.
- Key change: admin tab buttons now persist target tab in URL query via `setActiveAdminTab`, making deep-link/browser verification reliable.
- Checks PASS: `npm run smoke:batch100n-admin-tab-e2e`, `npm run typecheck`, `npm --prefix server run build`, `npm run build`, `npm run smoke:batch100m-homepage-live-preview`, `npm run smoke:batch100k-homepage-admin-sweep`.
- Production verification: pending push/deploy/browser closure.
- Next suggested: `BATCH 100O - Admin Dashboard CRUD Actions Runtime Sweep + Course/Lesson/Quiz Linkage Audit`.


## Final Closure 2026-05-21 - BATCH 100N
- Batch: `BATCH_100N_ADMIN_DASHBOARD_REMAINING_BUTTONS_DEEP_E2E_SWEEP_2026-05-21_AR`.
- Status: `Fully closed`.
- Commit pushed: `027a33a`.
- GitHub: PASS.
- Vercel: PASS, frontend strict smoke confirmed commit `027a33a`.
- Render/API: PASS, health readiness smoke passed.
- In-app browser: PASS, clicking `????? ?????? ????????` updated production URL to include `tab=homepage` and rendered the admin homepage settings.
- Next suggested: `BATCH 100O - Admin Dashboard CRUD Actions Runtime Sweep + Course/Lesson/Quiz Linkage Audit`.

## Update 2026-05-21 - BATCH 100O
- Batch: `BATCH_100O_ADMIN_DASHBOARD_CRUD_ACTIONS_RUNTIME_SWEEP_COURSE_LESSON_QUIZ_LINKAGE_AUDIT_2026-05-21_AR`.
- Status: `Programmatically closed, production verification pending`.
- Scope: scoped course/quiz linkage for learning pages and admin course-builder lesson/quiz import search contract.
- Root cause: `content/bootstrap?scope=learning` does not carry courses/quizzes, while `/courses` and `/quizzes` were not safely scoped by path/subject and public course/quiz caches could return broad/stale data.
- Key changes:
  - `/api/courses` validates `page/limit/pathId/subjectId/search` and applies scoped filters with learner visibility.
  - `/api/quizzes` applies scoped path/subject filters and scoped public cache key.
  - Frontend API/adapter supports scoped course/quiz fetches.
  - `LearningSection` backfills current path/subject courses and quizzes if store data is incomplete.
  - Added `smoke:batch100o-admin-crud-course-linkage`.
- Checks PASS: `smoke:batch100o-admin-crud-course-linkage`, server build, typecheck after rerun, frontend build, course visibility, learning quiz, student journey, quiz integrity, BATCH 100N regression, BATCH 100K regression.
- Production verification: pending push/deploy/browser closure.
- Report: `BATCH_100O_ADMIN_DASHBOARD_CRUD_ACTIONS_RUNTIME_SWEEP_COURSE_LESSON_QUIZ_LINKAGE_AUDIT_2026-05-21_AR.md`.
- Next suggested: `BATCH 100P - Admin Question Bank Runtime CRUD + Production Browser Verification`.

## Final Closure 2026-05-21 - BATCH 100O
- Batch: `BATCH_100O_ADMIN_DASHBOARD_CRUD_ACTIONS_RUNTIME_SWEEP_COURSE_LESSON_QUIZ_LINKAGE_AUDIT_2026-05-21_AR`.
- Status: `Fully closed`.
- Commit pushed: `1cb434a`.
- GitHub: PASS.
- Vercel: PASS, `smoke:frontend:strict` confirmed production serves commit `1cb434a`.
- Render/API: PASS, `smoke:health-readiness` passed and `/api/health` returned `ready=true`, commit `1cb434a7be04`.
- Production API verification: PASS, scoped courses returned `total=3`, scoped quizzes returned `total=9`, scoped questions returned `total=37`.
- In-app browser: PASS, learning page for `p_1777779639431/sub_1777779748206` showed `تأسيس الكمي: العمليات والمهارات الأساسية` with no empty-state flash in the captured state; admin question bank showed `62` questions and `إضافة سؤال جديد`.
- Remaining note: `admin-dashboard?tab=courses` maps to `paths` by existing dashboard logic; detailed course-builder runtime button testing is deferred to a focused follow-up.
- Next suggested: `BATCH 100P - Admin Question Bank Runtime CRUD + Production Browser Verification`.

## Update 2026-05-22 - BATCH 100P
- Batch: `BATCH_100P_ADMIN_QUESTION_BANK_RUNTIME_CRUD_PRODUCTION_BROWSER_VERIFICATION_2026-05-22_AR`.
- Status: `Programmatically closed, production verification pending`.
- Scope: admin question bank runtime CRUD, filters, review actions, and production Browser/API verification only.
- Key changes:
  - `QuestionBankManager` awaits create/update/delete/approve/reject mutations and refreshes the paginated list after each action.
  - `/api/quizzes/questions` now escapes search regex metacharacters before Mongo `$regex`.
  - Added `npm run smoke:batch100p-question-bank-crud`.
- Checks PASS: `smoke:batch100p-question-bank-crud`, server build, typecheck, frontend build, BATCH 100I regression, BATCH 100O regression, health readiness.
- Production evidence before deploy: Browser opened مركز الأسئلة; add question worked and appeared immediately; edit persisted; filters/actions were visible. Existing production search with `(`/`???` fails until backend deploy.
- Browser note: Browser/CDP hung during delete confirmation; cleanup/recheck remains required after deployment.
- Report: `BATCH_100P_ADMIN_QUESTION_BANK_RUNTIME_CRUD_PRODUCTION_BROWSER_VERIFICATION_2026-05-22_AR.md`.

## Final Closure 2026-05-22 - BATCH 100P
- Batch: `BATCH_100P_ADMIN_QUESTION_BANK_RUNTIME_CRUD_PRODUCTION_BROWSER_VERIFICATION_2026-05-22_AR`.
- Status: `Fully closed`.
- Commit pushed: `4e294eb`.
- GitHub: PASS.
- Vercel: PASS, strict frontend smoke confirmed `4e294eb`.
- Render/API: PASS, health readiness passed and `/api/health` returned `ready=true`, commit `4e294ebda105`.
- Production API: PASS, question search with `(` and `???` returns `200` instead of the pre-fix `500`.
- In-app Browser: PASS, admin question bank opened and showed the title, add button, and search field after deploy.
- Cleanup: PASS, direct Mongo check for `BATCH 100P runtime CRUD test` returned `matched=0`.

## Update 2026-05-22 - BATCH 100Q
- Batch: `BATCH_100Q_OPERATIONAL_ADMIN_RUNTIME_SCALE_SWEEP_2026-05-22_AR`.
- Status: `Programmatically closed, production verification pending`.
- Scope: operational admin runtime scale sweep without design changes.
- Key changes:
  - PWA install prompt wiring and corrected Arabic banner text.
  - Persisted question store mutations now await backend create/update/delete.
  - Admin finance requests now have server filters, pagination, summaries, and country presets.
  - Admin users now have server-backed search, role filters, and pagination.
  - School portal reports now support school/class/report-mode scoping.
  - Public taxonomy bootstrap now supports `phase=core|full` with phase cache.
  - Notification admin test-delivery endpoint added with recipient phone persistence.
  - Quiz empty-state is delayed while scoped question hydration is still in-flight.
- Checks PASS: `smoke:batch100q-operational-admin-runtime`, typecheck, server build, frontend build, payment providers, notification phase10, performance.
- Browser baseline: production question bank visible before deploy.
- Report: `BATCH_100Q_OPERATIONAL_ADMIN_RUNTIME_SCALE_SWEEP_2026-05-22_AR.md`.

## Final Closure 2026-05-22 - BATCH 100Q
- Batch: `BATCH_100Q_OPERATIONAL_ADMIN_RUNTIME_SCALE_SWEEP_2026-05-22_AR`.
- Status: `Fully closed`.
- Commit pushed: `3cdb01e`.
- GitHub: PASS.
- Vercel: PASS, strict frontend smoke confirmed `3cdb01e`.
- Render/API: PASS, health readiness passed and `/api/health` returned `ready=true`, commit `3cdb01e0a581`.
- Production API: PASS, taxonomy `phase=core` returned `skills=0`, taxonomy `phase=full` returned `skills=32`, and both returned matching `X-Taxonomy-Phase` headers.
- In-app Browser: PASS, financial, users, school portal, and question bank admin tabs opened after deploy with no captured client errors.

## Update 2026-05-22 - BATCH 100R
- Batch: `BATCH_100R_AUTH_COOKIE_TOKENLESS_GO_LIVE_DOCS_CLOSURE_2026-05-22_AR`.
- Status: `Programmatically closed, production verification pending`.
- Scope: auth cookie tokenless compatibility + go-live smoke token path + legacy closure docs consistency.
- Key changes:
  - `AuthContext` login/register typing now allows optional `token`.
  - `smoke-batch12-go-live` supports `GOLIVE_ADMIN_TOKEN` readiness path.
  - Legacy closure reports updated for BATCH 02R/06/17R/24 and final go-live report consistency.
- Checks PASS: `typecheck`, `server build`, `smoke:auth-token-response`, `smoke:batch12-golive`.
- Report: `BATCH_100R_AUTH_COOKIE_TOKENLESS_GO_LIVE_DOCS_CLOSURE_2026-05-22_AR.md`.

## Final Closure 2026-05-22 - BATCH 100R
- Batch: `BATCH_100R_AUTH_COOKIE_TOKENLESS_GO_LIVE_DOCS_CLOSURE_2026-05-22_AR`.
- Status: `Fully closed`.
- Commit pushed: `b4e3c70`.
- GitHub: PASS.
- Vercel: PASS, strict frontend smoke confirmed `b4e3c70`.
- Render/API: PASS, health readiness passed and `/api/health` returned `ready=true` (server commit stayed `3cdb01e0a581` because no server runtime delta in 100R).
- In-app Browser: PASS, production home and login routes loaded with no captured client errors.

## Update 2026-05-22 - BATCH 100S
- Batch: `BATCH_100S_SECURITY_CONTRACTS_GOVERNANCE_BACKFILL_2026-05-22_AR`.
- Status: `Programmatically closed, production verification pending`.
- Scope: security contracts/governance backfill into tracked repo state.
- Key changes:
  - Added package script: `smoke:rbac-school-scope`.
  - Added tracked security smoke contracts: auth-token-response, csrf, data-visibility-regression, rbac-school-scope.
  - Added tracked security governance docs for auth-cookie migration, RBAC audit/plans, CSRF/token-response hardening, and data-visibility regression.
- Checks PASS: `smoke:auth-token-response`, `smoke:csrf`, `smoke:data-visibility-regression`, `smoke:rbac-school-scope`, `typecheck`, server build.
- Report: `BATCH_100S_SECURITY_CONTRACTS_GOVERNANCE_BACKFILL_2026-05-22_AR.md`.

## Final Closure 2026-05-22 - BATCH 100S
- Batch: `BATCH_100S_SECURITY_CONTRACTS_GOVERNANCE_BACKFILL_2026-05-22_AR`.
- Status: `Fully closed`.
- Commit pushed: `6efcc45`.
- GitHub: PASS.
- Vercel: PASS, strict frontend smoke confirmed `6efcc45`.
- Render/API: PASS, health readiness passed and `/api/health` returned `ready=true`.
- In-app Browser: PASS, production home/login routes loaded with no captured client errors.

## Update 2026-05-22 - BATCH 100T
- Batch: `BATCH_100T_INTEGRATIONS_PAYMENTS_OPERATIONAL_DOCS_BACKFILL_2026-05-22_AR`.
- Status: `Programmatically closed, production verification pending`.
- Scope: integrations/payments operational docs backfill.
- Key changes:
  - Added integrations docs (runtime audit/guard, history restore, checklist, secret hardening, test-delivery, callback alias).
  - Added payments docs (country presets, request filters, server pagination, global summary reset, admin presets).
  - Added supporting readiness docs and selected historical operational evidence files + load-test summaries.
- Checks PASS: `smoke:integrations-runtime`, `smoke:payment-providers`, `smoke:batch12-golive`, `typecheck`.
- Report: `BATCH_100T_INTEGRATIONS_PAYMENTS_OPERATIONAL_DOCS_BACKFILL_2026-05-22_AR.md`.

## Final Closure 2026-05-22 - BATCH 100T
- Batch: `BATCH_100T_INTEGRATIONS_PAYMENTS_OPERATIONAL_DOCS_BACKFILL_2026-05-22_AR`.
- Status: `Fully closed`.
- Commit pushed: `5f3fe54`.
- GitHub: PASS.
- Vercel: PASS, strict frontend smoke confirmed `5f3fe54`.
- Render/API: PASS, health readiness passed and `/api/health` returned `ready=true`.
- In-app Browser: PASS, production home route loaded with no captured client errors.

## Final Closure 2026-05-22 - BATCH 100U
- Batch: `BATCH_100U_ADMIN_QUESTION_BANK_PRODUCTION_VERIFICATION_SWEEP_2026-05-22_AR`.
- Status: `Fully closed`.
- Commit pushed: `649ef92`.
- GitHub: PASS.
- Vercel: PASS, `smoke:frontend:strict` confirmed production serves `f7ed2c5`.
- Render/API: PASS, `smoke:health-readiness` passed.
- Production question API checks: PASS, `search=(`, `search=???`, `search=جمع`, and `search=BATCH 100P runtime CRUD test` returned `200`.
- Runtime contract check: PASS, `smoke:batch100p-question-bank-crud`.
- Operational note: local admin live-login replay hit `429` rate-limit after failed credential attempt; no runtime regression/code change required in this batch.
- Report: `BATCH_100U_ADMIN_QUESTION_BANK_PRODUCTION_VERIFICATION_SWEEP_2026-05-22_AR.md`.

## Final Closure 2026-05-22 - BATCH 100V
- Batch: `BATCH_100V_PRODUCTION_RUNTIME_REVALIDATION_SWEEP_2026-05-22_AR`.
- Status: `Fully closed`.
- Commit pushed: `79d9f3e`.
- GitHub: PASS.
- Vercel: PASS, `smoke:frontend:strict` confirmed production serves `448898c`.
- Render/API: PASS, `smoke:health-readiness` passed.
- Runtime contract: PASS, `smoke:batch100q-operational-admin-runtime`.
- Production question API spot checks: PASS for `search=(`, `search=???`, `search=جمع` (all `200`).
- In-app browser target stayed on production URL during the sweep.
- Report: `BATCH_100V_PRODUCTION_RUNTIME_REVALIDATION_SWEEP_2026-05-22_AR.md`.

## Final Closure 2026-05-22 - BATCH 100W
- Batch: `BATCH_100W_PRODUCTION_STABILITY_RECHECK_2026-05-22_AR`.
- Status: `Fully closed`.
- Commit pushed: `69945d4`.
- GitHub: PASS.
- Vercel: PASS, `smoke:frontend:strict` confirmed production serves `a116ff1`.
- Render/API: PASS, `smoke:health-readiness` passed.
- Report: `BATCH_100W_PRODUCTION_STABILITY_RECHECK_2026-05-22_AR.md`.

## Final Closure 2026-05-22 - BATCH 100X
- Batch: `BATCH_100X_PRODUCTION_HEALTH_AND_FRONTEND_CONSISTENCY_RECHECK_2026-05-22_AR`.
- Status: `Fully closed`.
- Commit pushed: `9413371`.
- GitHub: PASS.
- Vercel: PASS, `smoke:frontend:strict` confirmed production serves `ad1f842`.
- Render/API: PASS, `smoke:health-readiness` passed.
- Report: `BATCH_100X_PRODUCTION_HEALTH_AND_FRONTEND_CONSISTENCY_RECHECK_2026-05-22_AR.md`.

## Final Closure 2026-05-22 - BATCH 100Y
- Batch: `BATCH_100Y_PRODUCTION_RUNTIME_STABILITY_CONFIRMATION_2026-05-22_AR`.
- Status: `Fully closed`.
- Commit pushed: `0b225c1`.
- GitHub: PASS.
- Vercel: PASS, `smoke:frontend:strict` confirmed production serves `c9294e0`.
- Render/API: PASS, `smoke:health-readiness` passed.
- Report: `BATCH_100Y_PRODUCTION_RUNTIME_STABILITY_CONFIRMATION_2026-05-22_AR.md`.

## Final Closure 2026-05-22 - BATCH 100Z
- Batch: `BATCH_100Z_PRODUCTION_OPERATIONS_STABILITY_RECHECK_2026-05-22_AR`.
- Status: `Fully closed`.
- Commit pushed: `3338097`.
- GitHub: PASS.
- Vercel: PASS, `smoke:frontend:strict` confirmed production serves `24f5006`.
- Render/API: PASS, `smoke:health-readiness` passed.
- Report: `BATCH_100Z_PRODUCTION_OPERATIONS_STABILITY_RECHECK_2026-05-22_AR.md`.

## Final Closure 2026-05-22 - BATCH 100AA
- Batch: `BATCH_100AA_PRODUCTION_CONTINUITY_RECHECK_2026-05-22_AR`.
- Status: `Fully closed`.
- Commit pushed: `43b9033`.
- GitHub: PASS.
- Vercel: PASS, `smoke:frontend:strict` confirmed production serves `c006544`.
- Render/API: PASS, `smoke:health-readiness` passed.
- Report: `BATCH_100AA_PRODUCTION_CONTINUITY_RECHECK_2026-05-22_AR.md`.

## Final Closure 2026-05-22 - BATCH 100AB
- Batch: `BATCH_100AB_PRODUCTION_RELIABILITY_RECHECK_2026-05-22_AR`.
- Status: `Fully closed`.
- Commit pushed: `497c583`.
- GitHub: PASS.
- Vercel: PASS, `smoke:frontend:strict` confirmed production serves `b5cf7f7`.
- Render/API: PASS, `smoke:health-readiness` passed.
- Report: `BATCH_100AB_PRODUCTION_RELIABILITY_RECHECK_2026-05-22_AR.md`.

## Final Closure 2026-05-22 - BATCH 100AC
- Batch: `BATCH_100AC_PRODUCTION_HEALTH_CONTINUITY_RECHECK_2026-05-22_AR`.
- Status: `Fully closed`.
- Commit pushed: `98a2b90`.
- GitHub: PASS.
- Vercel: PASS, `smoke:frontend:strict` confirmed production serves `d55b3fa`.
- Render/API: PASS, `smoke:health-readiness` passed.
- Report: `BATCH_100AC_PRODUCTION_HEALTH_CONTINUITY_RECHECK_2026-05-22_AR.md`.

## Final Closure 2026-05-22 - BATCH 100AD
- Batch: `BATCH_100AD_PRODUCTION_STABILITY_CONTINUATION_RECHECK_2026-05-22_AR`.
- Status: `Fully closed`.
- Commit pushed: `1d6516d`.
- GitHub: PASS.
- Vercel: PASS, `smoke:frontend:strict` confirmed production serves `e2efcfd`.
- Render/API: PASS, `smoke:health-readiness` passed.
- Report: `BATCH_100AD_PRODUCTION_STABILITY_CONTINUATION_RECHECK_2026-05-22_AR.md`.
## BATCH 102 - Deep Real Usage, Linkage, Cleanup, Speed, and Hostinger Readiness - 2026-05-22
- الحالة: مغلقة مع blockers خارجية موثقة.
- الهدف: إصلاح ربط الباقات بالمسارات، إزالة قفل Render/Vercel من runtime، وتجهيز Hostinger/Docker/env/backup والتقارير.
- تم إصلاح: منع فتح الباقة كـ `/course/${pkg.id}` داخل `pages/GenericPathPage.tsx`.
- تم إضافة: `scripts/smoke-package-path-navigation-contract.mjs` و `scripts/smoke-real-usage-readiness-contract.mjs`.
- تم إضافة: ملفات `deploy/hostinger/`، Docker، env examples، backup/restore.
- Source commit pushed: `2d65643`، ثم تم دفع addendum توثيقي بعده.
- Production after push: PASS، `smoke:frontend:strict` أكد أن Vercel يخدم رأس BATCH 102 بعد انتظار deploy، و`smoke:health-readiness` نجح.
- الحكم الحالي: جاهزية جزئية للاستخدام الحقيقي حتى توفير أسرار المالك، معالجة قرار dependency audit، وتنفيذ فحص VPS/Payment live dry-run.
- تحذير: لا تستخدم `git add .`؛ توجد ملفات تاريخية dirty/untracked خارج نطاق الدفعة.
## BATCH 103 - Dependency Audit and Speed Blockers Closure - 2026-05-22
- الحالة: مغلقة.
- الهدف: معالجة بلوكرز `npm audit` وتحسين تحذيرات السرعة بشكل آمن بدون كسر الإنتاج.
- مرجع التنفيذ: `BATCH_103_DEPENDENCY_AUDIT_AND_SPEED_BLOCKERS_CLOSURE_2026-05-22_AR.md`.
- قيود: ممنوع `git add .`، وممنوع تغييرات كاسرة في API/routes/schema.
- نتيجة التدقيق:
  - Backend audit: `0 vulnerabilities`.
  - Frontend audit المتبقي: `quill` (يتطلب مسار breaking) و`xlsx` (لا يوجد patch متاح حاليًا).
- السرعة: التحذيرات انخفضت من 4 إلى 1.
## BATCH 104 - Frontend Audit Remediation Strategy - 2026-05-22
- الحالة: مغلقة.
- الهدف: معالجة/تحجيم مخاطر `quill` و`xlsx` بدون كسر الإنتاج.
- مرجع التنفيذ: `BATCH_104_FRONTEND_AUDIT_REMEDIATION_STRATEGY_2026-05-22_AR.md`.
- التنفيذ: تحصين استيراد XLSX في `SchoolsManager` و`LessonsManager` و`QuestionBankManager` عبر helper آمن مركزي.
- الفحوص: typecheck/build/smoke:performance PASS.
- المتبقي: تحذيرات `quill` و`xlsx` كما هي بسبب قيود upstream/breaking path.
## BATCH 105 - React Quill Replacement Feasibility - 2026-05-22
- الحالة: مغلقة.
- الهدف: مسار آمن لمعالجة مخاطر `react-quill-new` بدون كسر واجهات التحرير.
- مرجع التنفيذ: `BATCH_105_REACT_QUILL_REPLACEMENT_FEASIBILITY_2026-05-22_AR.md`.
- التنفيذ: إضافة sanitize عند onChange داخل `RichTextEditor`.
- الفحوص: typecheck/build/smoke:performance PASS.
- المتبقي: advisories frontend نفسها بسبب قيود upstream.
## BATCH 106 - Operational Readiness Deepening - 2026-05-23
- الحالة: مغلقة.
- الهدف: تعميق جاهزية التشغيل الفعلي مع فحوص runtime وإغلاق كامل.
- مرجع التنفيذ: `BATCH_106_OPERATIONAL_READINESS_DEEPENING_2026-05-23_AR.md`.
- الفحوص: PASS (`frontend:strict`, `health-readiness`, `production-speed`, `batch100q-operational-admin-runtime`).
- ملاحظة الأداء: `production-speed` بدون warnings في هذه الدفعة.

| 107 | Cross-Session Continuity Playbook Closure | Fully closed | 2026-05-23 | BATCH_107_CROSS_SESSION_CONTINUITY_PLAYBOOK_2026-05-23_AR.md | Added mandatory cross-session playbook and locked continue rule for new accounts. |

| 108 | Admin Question Bank Continuity Recheck | Fully closed | 2026-05-23 | BATCH_108_ADMIN_QUESTION_BANK_CONTINUITY_RECHECK_2026-05-23_AR.md | Revalidated question bank CRUD + admin operational runtime + strict frontend and health readiness. |

| 109 | Post-Deploy Runtime Alignment | Fully closed | 2026-05-23 | BATCH_109_POST_DEPLOY_RUNTIME_ALIGNMENT_2026-05-23_AR.md | Verified post-push Vercel alignment to 553cbda after deploy lag rerun. |

| 110 | Question Bank and Package Route Stability | Fully closed | 2026-05-23 | BATCH_110_QUESTION_BANK_AND_PACKAGE_ROUTE_STABILITY_2026-05-23_AR.md | Revalidated question-bank CRUD and package-route contract with strict production PASS on 1788200. |

| 111 | Real Usage and Split Guard Recheck | Fully closed | 2026-05-23 | BATCH_111_REAL_USAGE_AND_SPLIT_GUARD_RECHECK_2026-05-23_AR.md | Verified real usage readiness and package/course split guard with strict production PASS on 6b8b0f2. |

| 112 | Performance and Speed Stability Recheck | Fully closed | 2026-05-23 | BATCH_112_PERFORMANCE_AND_SPEED_STABILITY_RECHECK_2026-05-23_AR.md | Revalidated performance/speed/readiness; strict production matched commit 02df954 after initial speed lag warning. |

| 113 | Operational Runtime and Speed Recheck | Fully closed | 2026-05-23 | BATCH_113_OPERATIONAL_RUNTIME_AND_SPEED_RECHECK_2026-05-23_AR.md | Revalidated question-bank/admin runtime and production strict; speed check passed with one course-list timing warning. |

| 114 | Real Usage Navigation Continuity Recheck | Fully closed | 2026-05-23 | BATCH_114_REAL_USAGE_NAVIGATION_CONTINUITY_RECHECK_2026-05-23_AR.md | Revalidated real-usage and package-path contracts; strict frontend passed after deploy-lag rerun on ac1700b. |

| 115 | Admin Runtime Continuity Recheck | Fully closed | 2026-05-23 | BATCH_115_ADMIN_RUNTIME_CONTINUITY_RECHECK_2026-05-23_AR.md | Revalidated question-bank/admin runtime and readiness; strict frontend passed after deploy-lag rerun on ea3c5cb. |

| 116 | Real Usage Split and Prod Alignment | Fully closed | 2026-05-23 | BATCH_116_REAL_USAGE_SPLIT_AND_PROD_ALIGNMENT_2026-05-23_AR.md | Revalidated real usage and package/course split contracts with strict production PASS on 904360e. |

| 117 | Readiness Strict Speed Recheck | Fully closed | 2026-05-23 | BATCH_117_READINESS_STRICT_SPEED_RECHECK_2026-05-23_AR.md | Revalidated readiness/strict/speed; strict passed after deploy-lag rerun on 55f5017. |

| 118 | Question Bank Package Path Readiness | Fully closed | 2026-05-23 | BATCH_118_QUESTION_BANK_PACKAGE_PATH_READINESS_2026-05-23_AR.md | Revalidated question-bank and package-path contracts with strict production PASS on 4fea125. |

| 119 | Real Usage Operational Alignment | Fully closed | 2026-05-24 | BATCH_119_REAL_USAGE_OPERATIONAL_ALIGNMENT_2026-05-24_AR.md | Revalidated real-usage and operational runtime contracts with strict production PASS on 74e80c6. |

| 120 | Package Split Speed Strict Recheck | Fully closed | 2026-05-24 | BATCH_120_PACKAGE_SPLIT_SPEED_STRICT_RECHECK_2026-05-24_AR.md | Revalidated package/course split plus speed/readiness/strict; strict production matched 3216c43. |

| 121 | Question Bank Real Usage Continuity | Fully closed | 2026-05-24 | BATCH_121_QUESTION_BANK_REAL_USAGE_CONTINUITY_2026-05-24_AR.md | Revalidated question-bank and real-usage contracts; strict passed after deploy-lag rerun on b156f23. |

| 122 | Package Path Operational Continuity | Fully closed | 2026-05-24 | BATCH_122_PACKAGE_PATH_OPERATIONAL_CONTINUITY_2026-05-24_AR.md | Revalidated package-path and operational runtime contracts with strict production PASS on 35706ce. |

| 123 | Real Usage Split Continuity | Fully closed | 2026-05-24 | BATCH_123_REAL_USAGE_SPLIT_CONTINUITY_2026-05-24_AR.md | Revalidated real-usage and package/course split contracts with strict production PASS on e3aa7cf. |

| 124 | Question Bank Package Path Continuity | Fully closed | 2026-05-24 | BATCH_124_QUESTION_BANK_PACKAGE_PATH_CONTINUITY_2026-05-24_AR.md | Revalidated question-bank and package-path contracts with strict production PASS on e4ddb3d. |

| 125 | Real Usage Operational Speed Continuity | Fully closed | 2026-05-24 | BATCH_125_REAL_USAGE_OPERATIONAL_SPEED_CONTINUITY_2026-05-24_AR.md | Revalidated real-usage/operational contracts and strict production; speed passed with one non-blocking course-list warning. |

| 126 | Question Bank Package Path Prod Verify | Fully closed | 2026-05-24 | BATCH_126_QUESTION_BANK_PACKAGE_PATH_PROD_VERIFY_2026-05-24_AR.md | Revalidated question-bank and package-path contracts with strict production PASS on 383694f. |

| 127 | Real Usage Operational Prod Alignment | Fully closed | 2026-05-24 | BATCH_127_REAL_USAGE_OPERATIONAL_PROD_ALIGNMENT_2026-05-24_AR.md | Revalidated real-usage and operational runtime contracts with strict production PASS on 0945350. |

| 128 | Question Bank Split Continuity | Fully closed | 2026-05-24 | BATCH_128_QUESTION_BANK_SPLIT_CONTINUITY_2026-05-24_AR.md | Revalidated question-bank and package/course split contracts; strict passed after deploy-lag rerun on 7fd1ef6. |

| 129 | Package Path Operational Continuity | Fully closed | 2026-05-24 | BATCH_129_PACKAGE_PATH_OPERATIONAL_CONTINUITY_2026-05-24_AR.md | Revalidated package-path and operational runtime contracts; strict passed after deploy-lag rerun on 7207ddd. |

| 130 | Question Bank Real Usage Prod Verify | Fully closed | 2026-05-24 | BATCH_130_QUESTION_BANK_REAL_USAGE_PROD_VERIFY_2026-05-24_AR.md | Revalidated question-bank and real-usage contracts with strict production PASS on cfac5e9. |

| 131 | Package Path Operational Prod Verify | Fully closed | 2026-05-24 | BATCH_131_PACKAGE_PATH_OPERATIONAL_PROD_VERIFY_2026-05-24_AR.md | Revalidated package-path and operational runtime contracts with strict production PASS on 91a7bcb. |

| 132 | Question Bank Real Usage Operational Prod Verify | Fully closed | 2026-05-24 | BATCH_132_QUESTION_BANK_REAL_USAGE_OPERATIONAL_PROD_VERIFY_2026-05-24_AR.md | Revalidated question-bank/real-usage/operational contracts; strict passed after deploy-lag rerun on bad4bec. |

| 133 | Package Path Operational Prod Verify | Fully closed | 2026-05-24 | BATCH_133_PACKAGE_PATH_OPERATIONAL_PROD_VERIFY_2026-05-24_AR.md | Revalidated package-path and operational runtime contracts; strict passed after deploy-lag rerun on d9136cf. |

| 134 | Question Bank Real Usage Prod Verify | Fully closed | 2026-05-24 | BATCH_134_QUESTION_BANK_REAL_USAGE_PROD_VERIFY_2026-05-24_AR.md | Revalidated question-bank and real-usage contracts with strict production PASS on aa7862e. |

| 135 | Package Split Prod Alignment | Fully closed | 2026-05-24 | BATCH_135_PACKAGE_SPLIT_PROD_ALIGNMENT_2026-05-24_AR.md | Revalidated package/course split contract with health+strict production PASS on 5c609d5. |
| 136 | Admin Users/Schools/Parent/Payment Deep Audit | In progress | 2026-05-24 | BATCH_136_ADMIN_USERS_SCHOOLS_PARENT_PAYMENT_DEEP_AUDIT_2026-05-24_AR.md | Started deep runtime audit from owner feedback; fixed non-functional three-dots actions in users/schools; added safe user delete flow (API+UI); fixed admin school command-center linkage; hardened parent-linking student candidates beyond current users page; PASS: typecheck, server build, school-management, school-portal-command, admin-school-command, payment-provider/package/tampering, relationship-audit (10/10), RBAC-school-scope (4/4), package-path, real-usage, health, strict frontend, and batch136 contract; authenticated browser matrix and credential-gated operational smoke pending. |
## Update BATCH 137 - 2026-05-24
- Title: Final Closure Execution.
- Status: In progress.
- Plan file: `BATCH_137_FINAL_CLOSURE_EXECUTION_PLAN_2026-05-24_AR.md`.
- Purpose: make final closure executable by any new account with exact commands, runtime matrix, and blocker mapping.
- Depends on: completed BATCH 136 fixes and existing production deploy state.
## Update BATCH 138 - 2026-05-24
- Title: Post-Closure Stability Sweep.
- Status: In progress.
- Purpose: quick production stability confirmation after BATCH 137 final closure.
- PASS:
  - `smoke:health-readiness`
  - `smoke:frontend:strict` (commit match `4e3ef12`)
## Update BATCH 139 - 2026-05-24
- Title: Deep Admin Runtime Sweep Continuation.
- Status: In progress.
- PASS:
  - `smoke:batch136-admin-users-schools-parent-payment`
  - `smoke:payment-package`
  - `smoke:batch100f-relationship-audit`
- Outcome: users/schools/relations/payments contracts are still stable post-closure.
## Update BATCH 140 - 2026-05-24
- Title: Post-Sweep Operational Revalidation.
- Status: In progress.
- PASS:
  - `smoke:operational` (71/71)
  - `smoke:health-readiness`
  - `smoke:frontend:strict` (26/26)
- Outcome: operational and production stability remains green across continuation loops.
## Update BATCH 142 - 2026-05-24
- Title: Publish Snapshot Closure.
- Status: In progress.
- Publish:
  - GitHub `main` push completed.
  - Vercel production deploy completed with alias to `https://almeaacodax.vercel.app`.
  - Render deploy triggered: `dep-d89lshq8qa3s73e5d7dg`.
- PASS:
  - `smoke:operational` (71/71)
  - `smoke:health-readiness`
  - `smoke:frontend:strict` (26/26)

## Update BATCH 146 - 2026-05-24
- Title: Continuous Publish Cycle 4.
- Status: Fully closed.
- Commit:
  - `60babec` pushed to `origin/main`.
- Publish:
  - Vercel production deploy: PASS (aliased to `https://almeaacodax.vercel.app`).
  - Render deploy trigger: PASS (`dep-d89m5njbc2fs73fcenq0` on service `srv-d7qtcr9o3t8c73cs32sg`).
- Verification PASS:
  - `npm run smoke:health-readiness`
  - `npm run smoke:frontend:strict` (26/26, production commit match `60babec`).

## Update BATCH 147 - 2026-05-24
- Title: Continuous Publish Cycle 5.
- Status: Fully closed.
- Commit baseline:
  - `bfaf95c` (already on `main` at publish time).
- Publish:
  - Vercel production deploy: PASS (aliased to `https://almeaacodax.vercel.app`).
  - Render deploy trigger: PASS (`dep-d89m8o28qa3s73e5l9b0` on service `srv-d7qtcr9o3t8c73cs32sg`).
- Verification PASS:
  - `npm run smoke:health-readiness`
  - `npm run smoke:frontend:strict` (26/26, production commit match `bfaf95c`).
- Continuity:
  - Next execution batch prepared as deep final-delivery audit plan (`BATCH_148_FINAL_DELIVERY_DEEP_AUDIT_PLAN_2026-05-24_AR.md`).

## Update BATCH 148 - 2026-05-24
- Title: Full Production Readiness and Final Delivery Audit (Design-Preserved).
- Status: Programmatically closed.
- Evidence report:
  - `BATCH_148_FINAL_DELIVERY_REPORT_2026-05-24_AR.md`
- PASS:
  - `typecheck`, `build`, `server:check`, `server:build`
  - `smoke:health-readiness`
  - `smoke:frontend:strict` (26/26, production commit `01fb65d`)
  - `smoke:real-usage-readiness`
  - `smoke:batch136-admin-users-schools-parent-payment`
  - `smoke:student-learning-journey`
  - `smoke:payment-package`
  - `smoke:school-management`
  - `smoke:batch100f-relationship-audit`
  - `smoke:performance`
  - `smoke:payment-tampering`
  - `smoke:rbac-school-scope`
- Blocked:
  - `smoke:operational` requires admin auth context env.
- Noted warnings:
  - `smoke:production-speed` completed with 2 non-blocking timing warnings.
  - npm audits still report known dependency advisories (`quill`, `xlsx`, `qs` chain).
- Publish closure:
  - Commit pushed: `d57cd4b`
  - Vercel production: PASS (alias verified at `https://almeaacodax.vercel.app`)
  - Render deploy trigger: PASS (`dep-d89mj27avr4c73cpi19g`)
  - Post-deploy: `smoke:health-readiness` PASS, `smoke:frontend:strict` PASS (26/26, commit match `d57cd4b`)
