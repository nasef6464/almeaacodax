# Supervisor → Student Directed Assessment — Audience Save Closure

- Date: 2026-09-05
- Branch: `codex/supervisor-student-journey-hardening`
- PR: `#32`
- Base lineage: post-Gate-6 hardening only; Product Gates 1–6 remain closed and are not reopened by this defect fix.

## Bounded defect

A supervisor could select a target group in `UnifiedQuizBuilder` and save immediately before React state propagation completed. The persisted payload could therefore read the previous `targetGroupIds` value and lose the just-selected audience.

## Runtime fix

Runtime commit `5da6a56774cc8af80afe98b9249beac3dc0b2f6c` keeps the current target-group selection in a synchronous ref, updates that ref in the checkbox handler, and reads the ref in the save payload. No API URL, RBAC role, scoring rule, payment behavior, schema, production data, or migration is changed.

The existing supervisor dashboard contract now locks this behavior by requiring the synchronous ref update and save payload boundary.

## CI actor note

The runtime commit was emitted by the dedicated GitHub Actions repair runner. Pull-request checks attached to that bot-authored commit were classified `action_required` without executing jobs. This documentation commit intentionally changes no runtime behavior and exists to trigger normal PR verification on the exact integrated tree that contains runtime commit `5da6a567...`.

## Closure condition

Close this bounded defect only when the focused Supervisor → Student Directed Assessment E2E and applicable regression/hand-over checks execute successfully on the integrated head. Do not expand this run into unrelated Supervisor UX, new RBAC, or new assessment semantics.
