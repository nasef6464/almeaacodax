# School assessment availability and selective retakes

Owner-approved continuation from published main `f040865c450dd5c23434ea55e5f8b8cf743c4211`, branch `codex/school-assessment-availability`. Status: PARTIAL until exact-head CI, protected merge, matched publication and bounded real journey evidence.

## Scope
- Optional ISO-with-offset `opensAt`/`closesAt` in the existing quiz definition. Legacy `dueDate` retains the server's original Date.parse boundary and inclusive closing instant. PATCH validates the merged definition. No assignment reader cutover.
- Definition reads omit hydrated questions outside the learner's window; start, session resume, progress and final submission enforce that same current window. Existing assignment and content authority remains required. This is availability enforcement, not certification that generic approved question banks are inaccessible before an exam.
- One bounded per-viewer grant lookup for directed quizzes only, using deterministic indexed `_id` keys. Public self-study without targets adds no grant query. No polling, queue, external service or subscription added.
- A grant has a student-specific window and an absolute maximum derived from saved attempts. Repeated grants before another saved outcome do not add attempts. Existing results, scores, global attempt settings and audiences are untouched. Built-in `_id` uniqueness protects concurrent first grants without depending on secondary-index creation.
- Supervisor actions distinguish audience/windows from selected-student reopening. Student tabs distinguish currently available, upcoming, expired and completed; selected retakes return to required work and retain the prior report link. A local timer updates opening/closing labels without server polling. ISO values survive the local datetime editor, and clearing both dates persists an explicit removal.

## Verification
- Initial frontend typecheck/build and server typecheck PASS. Focused actual React/browser fixture PASS on the revised availability tabs, local opening timer, old-report link alongside retake, datetime clearing and selected-recipient retry. Matching server/client date boundaries, invalid merged window and ISO round-trip PASS. Existing submission-window boundary contract 3/3 PASS.
- HTTP fixture added to the existing isolated-Mongo required integration gate: future start/submit rejection, invalid update, first outcome, closing, session/progress rejection, ineligible recipient and student role rejection, future retake, repeated/concurrent same-count grants, second outcome, third-attempt rejection and byte-equivalent old result.
- Final build/typecheck, isolated HTTP fixture, architecture and exact-head CI are pending. No production record has been changed by this slice; no production closure or total-bandwidth claim.

## Deferred
Physical classroom/tablet certification, complete browser bandwidth/billing, full mock/Qiyas certification and individual-school aggregate context remain the already documented open work. Email-provider setup remains owner-deferred.
