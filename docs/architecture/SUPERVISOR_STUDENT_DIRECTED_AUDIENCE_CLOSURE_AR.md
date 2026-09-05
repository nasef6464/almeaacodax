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

## Separate next gap — not part of this batch

The same focused E2E continued beyond the audience-save proof and later failed after the learner successfully discovered and clicked `student-directed-test-${createdQuizId}`: `quiz-title` did not become visible within 30 seconds. This is a distinct learner assessment launch/entry defect or contract mismatch. It is not evidence that the audience-save fix failed, because the learner catalog already contained the directed assessment and the request-payload audience assertion had passed earlier.

Do not broaden this closed batch into learner launch routing/session behavior. The next run may inspect that launch failure as a new bounded product/contract gap using the captured E2E evidence.

## Ownership impact

No ownership or data-access boundary changed. `MODULE_CATALOG.md`, `CHANGE_MAP.md`, and `DATA_ACCESS_MAP.md` therefore require no update for this batch.
