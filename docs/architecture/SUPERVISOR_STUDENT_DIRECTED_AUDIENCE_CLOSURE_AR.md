# Supervisor → Student Directed Assessment — Audience Save Closure

- Date: 2026-09-05
- Branch: `codex/supervisor-student-journey-hardening`
- PR: `#32`
- Base lineage: post-Gate-6 hardening only; Product Gates 1–6 remain closed and are not reopened by this defect fix.
- Bounded batch status: `VERIFIED`.

## Bounded defect

A supervisor could select a target group in `UnifiedQuizBuilder` and save immediately before React state propagation completed. The persisted payload could therefore read the previous `targetGroupIds` value and lose the just-selected audience.

## Runtime fix

Runtime commit `5da6a56774cc8af80afe98b9249beac3dc0b2f6c` keeps the current target-group selection in a synchronous ref, updates that ref in the checkbox handler, and reads the ref in the save payload. No API URL, RBAC role, scoring rule, payment behavior, schema, production data, or migration is changed.

The existing supervisor dashboard contract locks the synchronous ref update and save-payload boundary.

## CI / contract evidence

The runtime commit was emitted by the dedicated GitHub Actions repair runner, so PR-triggered checks attached directly to that bot-authored commit were classified `action_required` without executing jobs. A normal integrated head was therefore used for regression verification without changing runtime behavior.

- Integrated verification head `a5948fc58ea389393f6771ff89e74f3bcb45d97f` passed Platform V3 Phase + Handover run `33972628512`, Recovery run `33972628519`, Production Readiness run `33972628534`, and Public UI run `33972628532`.
- The focused E2E initially exposed two stale test-harness defects before product evaluation: the patch runner tried to reapply already-present changes, then the new request assertion referenced an undefined `assertStringSet` helper. Both were corrected in test-only files; no runtime behavior changed.
- Focused E2E run `33972628501` then executed on latest verified branch head `b47c6fea6a9a0dde96dd030483bb8e7588a3ab96`. Frontend/API typecheck, builds, fixture seed, API smoke, and app startup all passed.
- Most importantly for this bounded defect, the directed-assessment journey passed the explicit intercepted POST `/api/quizzes` request assertion requiring the just-selected group in `targetGroupIds`. If the immediate-save race still existed, the journey would have failed at that assertion.

## Learner launch / result-review harness closure

The apparent next learner-launch failure was investigated as a separate bounded batch and is `VERIFIED` as a stale E2E contract, not a runtime product defect.

- The learner catalog already rendered the directed assessment. The audit was clicking the outer `student-directed-test-${createdQuizId}` card, which is not the navigation control. Test-only commit `fd06b2c44bfa90953255e950558dc4edfc37952d` corrected the harness to click the card's actual `دخول الاختبار` / `إعادة الدخول` link and restored the pre-investigation runtime. No runtime/API/RBAC/scoring/data behavior changed.
- Run `33974966468` then progressed through learner launch, runner, autosave/resume, submission and result rendering, proving the earlier `quiz-title` timeout was caused by the stale click target. It exposed one further harness-only ambiguity on the results page: the generic `مراجعة الحلول` role query matched more than one button.
- Focused harness commit `a5d316e7d98211536941d5d7b6066d75ff257356` changed only `scripts/live-assessment-commercial-audit.mjs`, selecting the exact `مراجعة الحلول والأخطاء` CTA. The workflow job checked out the latest branch head after this commit was present.
- Focused E2E run `33975267930`, isolated journey job `101330909772`, completed successfully. Frontend/API typecheck, production builds, fixture seed, multi-role API smoke, directed assessment commercial journey, supervisor school command journey and source journey contract all passed. The directed journey now proves target discovery → real CTA navigation → runner → autosave/resume → submit → persisted result → exact review CTA on the same isolated fixture.
- On verification head `50479089bb10828f195bbe59fc9f07d50c75e0b5`, Phase + Handover `33974966474`, Production Readiness `33974966450`, Recovery `33974966463`, Public UI `33974966502`, and the learner harness repair `33974966442` passed. Refactor V2 Safety's baseline-quality job passed; its overall failure was limited to `Wait for Vercel preview to become ready`, not a build/typecheck/contract regression.

No speculative learner-entry runtime patch is retained. In particular, no new API read path, group-membership authority, schema change, or persistence behavior was introduced to make the test pass.

## Current handoff

This learner launch/result-review batch is closed. Do not reopen it from the older `quiz-title` timeout note. Continue PR `#32` only from the next independently proved product/commercial/security/operations gap in current Git/CI evidence. Do not infer a product defect from a stale selector without first proving the intended UI control and runtime behavior.

## Ownership impact

No ownership or data-access boundary changed. `MODULE_CATALOG.md`, `CHANGE_MAP.md`, and `DATA_ACCESS_MAP.md` therefore require no update for this batch.
