---
name: almeaa-goal-delivery
description: Deliver ALMEAA Product Goals, Product Gates, module closures, commercial MVPs, and vertical slices through a focused, evidence-backed delivery workflow. Use for goal continuation and closure; not for unrelated one-off fixes.
metadata:
  short-description: Focused ALMEAA product-goal delivery
---

# ALMEAA Goal Delivery

Use this workflow automatically for an ALMEAA Product Goal, Product Gate, feature/module completion, commercial MVP, vertical slice, goal continuation, or goal closure.

## Start once

Read Git HEAD, `git status`, only relevant recent commits, `docs/architecture/CODEX_EXECUTION_STATE.md`, the current goal, and directly affected maps/routes/callers/models/loaders/tests. Do a goal-scoped assessment—not a repository-wide audit.

State concisely: `CURRENT STATE`, `VERIFIED`, `REAL GAPS`, `BLOCKERS`, `STRONG MVP`, `DEFERRED`, and one minimal execution plan. Re-open discovery only for a proved failing test, runtime defect, Strong-MVP blocker, or security/data-integrity risk.

## Delivery rules

- Use existing working behavior before building anything new. Do not redo `VERIFIED` work without an impact reason.
- Execute related changes as one vertical slice. Do not create batches for trivial details.
- A non-blocking improvement is `DEFERRED` / Future Improvement; do not implement it in the active goal.
- Use targeted checks during implementation. Run final CI/gates only when the bounded goal is near closure; do not chase speculative issues while CI is live.
- Preserve public API, authentication/RBAC, scoring, payments, data compatibility, and production data/cutover unless the goal explicitly authorizes a change.
- Stage exact files only; never use `git add .`. Commit and push focused work. Runtime changes need CI on that exact code commit; a following docs-only evidence commit may use `[skip ci]`.

Read [delivery invariants](references/delivery-invariants.md) before changing a product area with architectural, data, or closure implications.

## Close automatically

When Strong MVP is actually proved: run the final proportional verification, inspect diff/status, commit, push, verify CI, update `CODEX_EXECUTION_STATE.md`, and update only maps affected by a real ownership/access/migration change. Produce a concise completion report using `VERIFIED`, `PARTIAL`, `NOT PROVEN`, `BLOCKED`, and `DEFERRED`, then identify the next approved goal. Do not search for new work after the closure criteria are met.
