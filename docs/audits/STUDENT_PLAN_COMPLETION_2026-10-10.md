# Student plan completion — 2026-10-10

Status: PARTIAL — initial runtime merged; published verification found a persisted-read gap; correction under verification.

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

Published proof and exact-head CI must be appended before closure. Full adaptive training, Qiyas policy, authoritative server timing, selective retakes, historical classification, and physical full-class load remain outside this slice. Owner clarified all prior results are trials, not a real learner migration blocker; none are deleted.

## Published verification found a real persistence read gap

#506 exact `8da1edd3db8b8bb7717951a5a2a457f66fd43f86`:24SUCCESS/3conditionalSKIPPED/all3requiredPASS; protected merge `fa7fb287fd69e3cfe560363ada55c90802770412`. Matching frontend/Render/canonical/direct readiness, DB/Redis and all four main gates passed. Initial published trial wrote one free-course enrollment and one student plan; controlled503 save correctly preserved the form and did not report success. No lesson/quiz result was written yet.

The plan was saved, but learner bootstrap intentionally excludes plans from shared content, so a fresh login could not restore it. The follow-up adds a protected own-account `GET /content/study-plans` capped at200 active-first rows with private/no-store caching. Only the Plan page requests it once on entry (or explicit retry); it is never placed in the public browser/server content cache. Existing learner bootstrap must not overwrite private plans with its empty shared list. Pending/read-error state prevents creating a duplicate before existing plans are read; actor changes ignore old responses.

The correction extends actual-page tests to pending/read-failure/retry/server-hydration cases, and isolated backend integration to authenticated own reads, ignored forged owner query, outsider mutation rejection, fresh updated values, private headers and unchanged shared bootstrap. Existing mutation contracts, authentication roles and result semantics remain unchanged. This adds one small page-entry read, not polling or per-answer work. Required CI and final published lesson/progress proof remain pending.

Final browser regression:29 scenarios PASS, plus schedule-date stability; includes actual creation of a second plan with an independent creation boundary and successful confirmed removal in the isolated fixture. Pending reads do not show a misleading next action. Server typecheck/build and integration-harness typecheck PASS locally; frontend final build/typecheck and exact-head integration/published proof are recorded at delivery.

Architecture registration: the existing owner-authorized student journey recovery requires the protected own-plan read. Register exactly `contentStudyPlanRouter|GET|/study-plans` in the reviewed contract-extension list, keeping the immutable baseline and all other route signatures unchanged. Initial b47a9adf CI passed the isolated backend integration (including the new read/isolation tests) but correctly rejected the unregistered addition in three architecture-dependent jobs; final-head CI must pass after registration. No checks or budgets are weakened.
