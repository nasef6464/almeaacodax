# ALMEAA — Delivery Rules

**Execution entry point:** read `docs/MASTER_CONTROL/README_AR.md` first. The only active cross-project execution roadmap is `docs/MASTER_CONTROL/ALMEAA_GRAND_MASTER_PLAN_AR.md`; current state is `docs/MASTER_CONTROL/CURRENT_EXECUTION_STATUS_AR.md`. Older FINAL/MASTER/CURRENT/BATCH/handoff plans are supporting or historical unless Master Control explicitly reactivates them.

**Documentation map:** use `docs/REFERENCE_CENTER/README_AR.md` and `docs/REFERENCE_CENTER/REFERENCE_REGISTRY.json` to find the active domain reference. Do not infer current state from an old plan name.

For any Product Goal, Product Gate, commercial MVP, vertical slice, module completion, continuation, or closure, read and apply `.codex/skills/almeaa-goal-delivery/SKILL.md` before task work.

Use Git HEAD + Master Control as execution truth. Before structural/domain work also read `docs/architecture/CURRENT_DIRECTORY_AND_MODULE_MAP.md` and `docs/architecture/DEEP_MODULARITY_AND_RESOURCE_AUDIT.md`. `FINAL_MASTER_PLAN_V3_AR.md` remains a product/architecture reference, not the active execution sequence.

Delivery governance:
- `main` is protected by repository ruleset and receives changes through PRs.
- Required checks must pass before merge.
- Non-main Vercel Preview Branch Tracking is disabled; do not create manual previews unless the active plan explicitly requires one.
- Preserve production/main deployments and data.
- Preserve unowned working-tree changes and never use `git add .`.

Product work must be focused, safe, and evidence-backed. Do not change public routes/API contracts, auth/RBAC, scoring, payments, persisted data semantics, or production data/cutover without explicit authorization. Use a modular monolith; do not introduce microservices or broad rewrites merely to make folders look cleaner.

Do not merge stale/diverged branches wholesale. Compare them with current `main`, classify merged/superseded/gap, and reapply only the proven missing behavior on a fresh/current branch.

Every closed task requires proportionate tests, focused commit/PR, required CI on the exact head commit, current execution-state update, affected architecture/reference maps when ownership changed, and concise evidence. Do not claim production-scale, restore readiness, AI live certification, or production cutover from isolated CI.
