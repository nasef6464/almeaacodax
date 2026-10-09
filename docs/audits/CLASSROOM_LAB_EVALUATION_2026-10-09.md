# Teacher-led laboratory assessment — 2026-10-09

Status: PARTIAL, production certification blocked by the existing suspended Redis resource.
Baseline main `7b0c085bcd12` (#484 request coalescing merged after 18 successful/3 skipped checks; all required exact-head checks PASS on `344d7eb975d6`).

## Owner journey and existing assets

The owner teaches outside the application, sends five prepared questions to tablet users, watches activity centrally, ends the class and retains student participation and skill evidence. Existing teacher/class authorization, prepared templates, approved school question bank, 5/10-question batches, student final submission, immediate batch summaries and frozen session reports are reused.

## Bounded implementation

- New sessions record cumulative `sentQuestionIds` and `sentHistoryComplete` in the existing session document. Publication/append records each sent question once; batch completion can clear the current published selection without losing the report denominator. The existing 100-question/document growth budgets remain enforced. The owner explicitly requested these saved per-student session reports; no migration of historical data is included.
- Pure school application helper groups responses once and builds per-student participation, answered/correct/wrong/unanswered counts and skill evidence from sent questions. No response means null accuracy, rather than a failed score. Prepared unsent questions are excluded. Existing overall scores and question/batch summaries are unchanged.
- New student evidence is stored in the existing staff-only immutable report snapshot. Ended reports are reused. Old snapshots remain unchanged and show that per-student detail is unavailable. A legacy active session without complete send history is marked incomplete; only provable sent/answered questions enter its new student detail.
- Teacher and archive views show student outcomes and expandable skill rows. Existing staff authorization guards the additive `aggregate?view=report`; finalized snapshots are returned directly without rescanning response collections. Student requests remain forbidden. Teacher history supports opt-in `view=summary` to exclude student arrays at Mongo projection and the archive opens only one detailed report on demand; default callers retain their behavior.
- Live aggregate supplies current activity submission counts/names from projected participant records, using the existing bounded five-minute name cache. The teacher shows finalized activity submission separately from active-question response counts. Student events remain metadata-only and staff analytics remain protected.
- The bank loads when the teacher opens selection or chooses a one-click5/10 send, caches success for the selected school, deduplicates pending reads and resets across school changes. Opening a class solely for teaching does not fetch the bank. A failed read is retryable; stale school responses cannot replace the current school bank.

## Evidence and limitations

- Deterministic student report cases: completed/partial/no answers/not joined, correct vs missing, skill evidence, draft exclusion, duplicate safety, empty send history and bounded 50-student/100-skill snapshot PASS. Report insights contract PASS; classroom journey58/58 and hardening35/35 PASS.
- Frontend/API typechecks and frontend build PASS. Controlled Playwright component replay with the real stylesheet PASS: four participation states, null accuracy, expandable skill names, 1280/375 viewport overflow and old-report empty state. This uses fixture data and does not certify live teacher/student authentication.
- Isolated integration adds final submission/live staff counts, student denial, full cumulative report after two ended batches, on-demand snapshot equality, compact history omission and frozen student evidence after roster change. These must pass exact-head CI before merge.
- First head6f72b743: classroom hardening/immutable reports and full-stack isolated journeys PASS; three quality workflows failed the unchanged83 runtime-hotspot budget because panel, teacher route and test runner crossed400 lines. Bank loading, pure batch lifecycle and student-evidence assertions are extracted to focused modules; the budget is not raised. Final exact-head rerun is required.
- Post-extraction local architecture/boundary gates PASS at83 runtime hotspots. Controlled bank-hook replay PASS: zero initial reads,20 concurrent intents share one request, cached reuse, school reset, failed read retry and stale-school suppression. Component replay remains fixture evidence, not production classroom certification.
- Exact-head CI remains a delivery gate; production teacher/student/supervisor and real tablet/20-browser certification remain blocked pending Redis restoration. Fixture/API tests are not physical classroom certification.
- No AI call is required for activity scoring or report generation. No billing/plan changes, production educational writes, historical rewrites, new service or permissions widening.
