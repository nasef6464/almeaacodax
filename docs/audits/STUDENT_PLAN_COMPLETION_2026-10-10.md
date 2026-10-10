# Student plan completion — 2026-10-10

Status: PARTIAL — implementation and bounded local verification; exact-head CI and published proof pending.

Baseline: main `9626c640b44887e796ce4d7232d26704e5bb1b6b` (#505). This slice continues the existing enrolled/independent learner journey without replaying previous verified exams or changing trial history.

## Proved defects and changes

- `skipCompletedQuizzes` removed a quiz from the plan denominator after completion. The option now skips evidence dated before plan creation; completion during the plan stays credited. The UI describes that boundary.
- Library references had no persisted completion yet diluted progress and appeared overdue. Learning percentages/day counts now count unique lessons and quizzes only; references stay available and do not create overdue learning alerts.
- The next-action title and link could point to different tasks or completed work. One pending internal learning task now owns both; prefer today, then overdue, then upcoming. Completing available learning tasks links to reports and previous tests.
- Plan CRUD previously modified local state and showed success before server acknowledgement. Existing APIs now return a boolean outcome through the store; failed create/update/archive/delete preserve saved state. Pending controls prevent duplicate submissions, confirmed server values are used, and a response from an earlier actor is ignored.
- Extracted existing scheduling into `utils/studentPlanSchedule.ts`; completion alone no longer reorders tasks. Subject priority, phase rules, daily budget, and existing last-day overflow behavior are preserved.

No new endpoints, polling, AI calls, content banks, scoring/mastery/RBAC changes, history rewriting, or data migration. No measured bandwidth saving claim. The page uses existing loaded lesson/result evidence; it is not an immutable persisted task ledger, and old results outside the bounded loader are not certified.

## Verification boundary

`scripts/smoke-student-plan-completion-ui.mjs` renders the actual Plan page, next-action strip, and study-plan slice in a browser with isolated transport. It checks independent and enrolled students, completion credit/reference exclusion, completed-plan report link, pending/failure/retry behavior, server-confirmed values, archive/delete failure, actor changes, create success/failure, and desktop/mobile layout without JS errors. It is wired into the existing deep premerge gate.

Published proof and exact-head CI must be appended before closure. Full adaptive training, Qiyas policy, authoritative server timing, selective retakes, historical classification, and physical full-class load remain outside this slice. Owner clarified all prior results are trials, not a real learner migration blocker; none are deleted.
