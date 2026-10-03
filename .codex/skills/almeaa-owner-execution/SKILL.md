---
name: almeaa-owner-execution
description: Standing execution behavior for all ALMEAA work with the project owner. Apply before any implementation, continuation, closure, recovery, migration, testing, or content-bank task.
metadata:
  short-description: Owner execution rules for ALMEAA
---

# ALMEAA Owner Execution Skill

This skill is mandatory for every ALMEAA task. It defines HOW work must be executed, regardless of the specific module.

## 1. Resume from the real checkpoint
- Before doing new work, identify the latest real checkpoint from Git HEAD, active PR, Master Control, live database state, and only the directly relevant historical evidence.
- Never restart a task from memory alone.
- Never redo work that is already verified.
- If counts differ across reports, distinguish clearly between total inventory, historical bank, recovered subset, approved subset, and production-live count.

## 2. Recover before rebuilding
- Before rebuilding any bank, migration, feature, document, or workflow, search repository history, prior commits, backups, live DB metadata, manifests, and recovery artifacts for already-completed work.
- Reuse proven existing assets instead of recreating them manually.
- A historical artifact is evidence, not automatically production truth; verify it before reuse.

## 3. Source of truth first
- Use Git HEAD + active PR + Master Control + live runtime/database evidence as execution truth.
- Old plans, old chats, old reports, or recovery candidates are supporting evidence only unless explicitly reactivated.
- For source-controlled educational content, preserve the approved source boundary and provenance.

## 4. Execute in heavy batches
- Do not spend a work cycle on status checks only.
- After a short state check, complete the largest safe batch possible: normally 3–4 related operations or one substantial end-to-end slice.
- If one independent item is blocked, document it and continue immediately with other non-blocked work.

## 5. Solve root causes, not symptoms
- On CI/API/parsing/import/runtime/data failures, inspect the actual logs and failing code/data.
- Retry through multiple safe paths in the same work cycle before declaring a blocker.
- Fix the root cause without weakening gates, validation, security, or data-integrity contracts.

## 6. Protect user data and working state
- Never delete or overwrite production data, untracked local files, backups, historical results, or unrelated project work merely to make a check green.
- Use scoped writes, whitelists, dry runs, rollback evidence, and backups for migrations.
- Do not rewrite historical progress/results unless a proven repair requires it.

## 7. Preserve canonical data, avoid duplication
- One canonical record per question/content item whenever possible.
- Reuse by IDs/codes instead of duplicating images, question text, passages, or media.
- Deduplicate before import and keep provenance: source, page, question number, canonical ID, skill/subskill, answer key, and evidence status.

## 8. Test on the exact final code
- Use focused tests during implementation.
- Before merge, verify required CI on the exact final SHA.
- Do not merge while relevant required checks are failing.
- Do not claim production closure from local tests or CI alone.

## 9. Production certification is the closure gate
- A task is CLOSED only after the required production/runtime journey actually passes.
- For learner features, verify the real journey end to end: create/use content → student interaction → answer/result → review/retry → reports/skills/links as applicable.
- Never write CLOSED merely because code was merged.

## 10. Report numbers precisely
- Always label numbers by meaning, for example:
  - historical inventory
  - recovered candidates
  - source-observed
  - source-key-verified
  - canonical approved
  - production live
- Never present a subset as if it were the total.
- Never force an old target count when the final count must come from verified source data.

## 11. Keep the owner out of programming details unless needed
- The owner is managing the product, not acting as the programmer.
- Explain blockers in simple operational language: what failed, why it matters, what was done, and what remains.
- When owner action is required, provide one concrete step, not a developer lecture.

## 12. Continuity rule
At the end of every substantial work cycle, record:
- what was completed,
- exact counts where meaningful,
- branch / PR / SHA,
- tests and CI status,
- real blockers,
- remaining work,
- the next execution step.

The next cycle MUST begin from this checkpoint, not from a fresh rediscovery.

## 13. Fast-path rule for previously completed work
When strong evidence shows a previous system/bank/module was already completed:
1. locate the historical implementation,
2. locate its data/manifests/backups,
3. verify integrity,
4. reconcile it to the current model,
5. only manually rebuild the missing or untrusted delta.

Do not manually recreate hundreds of items if a verified historical bank can be safely recovered and reconciled.

## 14. VERBAL26 owner rule: no new training paths
- Do not create, auto-generate, approve, or rely on any new verbal training drill, training bank, or mock path unless the owner explicitly re-enables that scope.
- VERBAL26 work is about extracting and importing all textual questions from the two approved books, mapping them to the approved taxonomy, and preserving existing training assets only.
- If code contains a generator for new verbal drills/banks/mocks, remove that generation path from the active VERBAL26 execution route.
- Existing historical quizzes/training assets may be read for evidence, but must not be silently recreated or expanded.

## 15. Closure mindset
- Work toward closure, not activity.
- Do not open a new scope before the active scope is actually closed.
- If a scheduled task is dedicated to a closure goal, disable it automatically once the closure evidence is complete.
