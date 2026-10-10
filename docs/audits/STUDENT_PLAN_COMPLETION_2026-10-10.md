# Student plan completion — 2026-10-10

Status: VERIFIED / CLOSED for this bounded plan completion and persistence slice. The wider student/school ecosystem remains PARTIAL.

Baseline: main `9626c640b44887e796ce4d7232d26704e5bb1b6b` (#505). This slice continues the existing enrolled/independent learner journey without replaying previous verified exams or changing trial history.

## Proved defects and changes

- `skipCompletedQuizzes` removed a quiz from the plan denominator after completion. The option now skips evidence dated before plan creation; completion during the plan stays credited. The UI describes that boundary.
- Library references had no persisted completion yet diluted progress and appeared overdue. Learning percentages/day counts now count unique lessons and quizzes only; references stay available and do not create overdue learning alerts.
- The next-action title and link could point to different tasks or completed work. One pending internal learning task now owns both; prefer today, then overdue, then upcoming. Completing available learning tasks links to reports and previous tests.
- Plan CRUD previously modified local state and showed success before server acknowledgement. Existing APIs now return a boolean outcome through the store; failed create/update/archive/delete preserve saved state. Pending controls prevent duplicate submissions, confirmed server values are used, and a response from an earlier actor is ignored.
- Extracted existing scheduling into `utils/studentPlanSchedule.ts`; completion alone no longer reorders tasks. Subject priority, phase rules, daily budget, and existing last-day overflow behavior are preserved.

Initial #506 introduced no new endpoints, polling, AI calls, content banks, scoring/mastery/RBAC changes, history rewriting, or data migration. No measured bandwidth saving claim. The page uses existing loaded lesson/result evidence; it is not an immutable persisted task ledger, and old results outside the bounded loader are not certified.

## Verification boundary

`scripts/smoke-student-plan-completion-ui.mjs` renders the actual Plan page, next-action strip, and study-plan slice in a browser with isolated transport. It checks independent and enrolled students, completion credit/reference exclusion, completed-plan report link, pending/failure/retry behavior, server-confirmed values, archive/delete failure, actor changes, create success/failure, and desktop/mobile layout without JS errors. It is wired into the existing deep premerge gate.

Final published proof and exact-head CI are recorded below. Full adaptive training, Qiyas policy, authoritative server timing, selective retakes, historical classification, and physical full-class load remain outside this slice. Owner clarified all prior results are trials, not a real learner migration blocker; none are deleted.

## Published verification found a real persistence read gap

#506 exact `8da1edd3db8b8bb7717951a5a2a457f66fd43f86`:24SUCCESS/3conditionalSKIPPED/all3requiredPASS; protected merge `fa7fb287fd69e3cfe560363ada55c90802770412`. Matching frontend/Render/canonical/direct readiness, DB/Redis and all four main gates passed. Initial published trial wrote one free-course enrollment and one student plan; controlled503 save correctly preserved the form and did not report success. No lesson/quiz result was written yet.

The plan was saved, but learner bootstrap intentionally excludes plans from shared content, so a fresh login could not restore it. The follow-up adds a protected own-account `GET /content/study-plans` capped at200 active-first rows with private/no-store caching. Only the Plan page requests it once on entry (or explicit retry); it is never placed in the public browser/server content cache. Existing learner bootstrap must not overwrite private plans with its empty shared list. Pending/read-error state prevents creating a duplicate before existing plans are read; actor changes ignore old responses.

The correction extends actual-page tests to pending/read-failure/retry/server-hydration cases, and isolated backend integration to authenticated own reads, ignored forged owner query, outsider mutation rejection, fresh updated values, private headers and unchanged shared bootstrap. Existing mutation contracts, authentication roles and result semantics remain unchanged. This adds one small page-entry read, not polling or per-answer work. Required CI and final published lesson/progress proof now pass as recorded below.

Final browser regression:29 scenarios PASS, plus schedule-date stability; includes actual creation of a second plan with an independent creation boundary and successful confirmed removal in the isolated fixture. Pending reads do not show a misleading next action. Server typecheck/build and integration-harness typecheck PASS locally; frontend final build/typecheck and exact-head integration/published proof are recorded at delivery.

Architecture registration: the existing owner-authorized student journey recovery requires the protected own-plan read. Register exactly `contentStudyPlanRouter|GET|/study-plans` in the reviewed contract-extension list, keeping the immutable baseline and all other route signatures unchanged. Initial b47a9adf CI passed the isolated backend integration (including the new read/isolation tests) but correctly rejected the unregistered addition in three architecture-dependent jobs; final-head CI passed after registration. No checks or budgets are weakened.

## Final delivery and published proof

#507 exact `6fbd1fce5d5de0baaa61e423c9be2466f85af982`:18SUCCESS/3conditionalSKIPPED/all3requiredPASS, including real isolated Mongo integration and the deep browser gate. Protected merge `f4f1a1a2cfb605f97f83a3359c3a6245a5c3affc`. Frontend, Render, canonical/direct readiness all match this merge; database and both Redis checks PASS. All four main workflows SUCCESS (38035408761/38035408765/38035408766/38035408775). Local frontend/server typecheck/build, integration-harness typecheck,14journey contracts and performance/footprint checks passed. Actual-page regression:29 scenarios plus separate schedule-date stability PASS.

Published proof:6unique bounded checks PASS,3each for independent and school-enrolled trial students: controlled503 preserves the form without false success or server write; actual UI plan creation remains readable privately; actual direct lesson completion remains after fresh login, preserves all prior lesson IDs, and restores the saved plan at100% with its report action. Desktop1280/mobile390 show no horizontal overflow, zero JavaScript page errors, and the mobile progress card was visually inspected. The independent persisted read is492decoded JSON bytes/1335ms; enrolled489bytes/617ms. These are individual API response-body observations, not total bandwidth or a latency/load certification. A repeated independent read after the harness was corrected is deduplicated from the six-check count.

The harness initially asserted a next link before async catalogue hydration completed; waiting for the real expected link resolved this without runtime changes. Earlier guest initialization/settings-toggle/hidden-toast failures are harness diagnostics, not additional product defects or passed scenarios. Exactly2free-course trial enrollments,2new trial plans and2actual UI lesson-completion saves were used across the entire published slice. Zero quiz submissions/resubmissions, historical grade rewrites, deletions, bank generation or migration. Controlled503 responses never reached the production server. Existing independent enrollment/plan were reused after the private-read correction.

Resource boundary: one authenticated own-plan read per Plan entry or explicit retry, capped at200rows, private/no-store; no polling, per-answer requests or AI execution. Shared public content caching stays separate. This closes plan persistence, truthful CRUD, available-task progress and next-action behavior only. Full adaptive training, complete catalogue/history coverage, Qiyas policy, server-authoritative timing, selective retakes and physical full-class load remain NOT_PROVEN here. Existing loaded evidence is bounded; scheduling is not an immutable persisted task ledger. Older results remain trial history per owner instruction.

Next approved work follows remaining student training and assessment-management gaps from Master Control; do not replay this verified plan slice.
