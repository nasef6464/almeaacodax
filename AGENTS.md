# ALMEAA — Delivery Rules

**Documentation entry point:** before reading plans/reports broadly, read `docs/REFERENCE_CENTER/README_AR.md` and use `docs/REFERENCE_CENTER/REFERENCE_REGISTRY.json` to distinguish canonical/current references from historical evidence. Do not infer current state from an unregistered old `FINAL`, `MASTER`, `CURRENT`, `BATCH`, or handoff document.

For any Product Goal, Product Gate, commercial MVP, vertical slice, module completion, continuation, or closure, read and apply `.codex/skills/almeaa-goal-delivery/SKILL.md` before task work. It is the default delivery workflow for this repository.

Use Git HEAD and `docs/architecture/CODEX_EXECUTION_STATE.md` as execution truth. Before structural/domain work also read `docs/architecture/CURRENT_DIRECTORY_AND_MODULE_MAP.md` and `docs/architecture/DEEP_MODULARITY_AND_RESOURCE_AUDIT.md`; they distinguish current filesystem/runtime ownership from the target architecture and assign remaining debt to batches. `CHAT_EXECUTION_GOALS_AR.md` is the active product plan and `FINAL_MASTER_PLAN_V3_AR.md` is the product/architecture reference. Preserve unowned working-tree changes and never use `git add .`.

Product work must be focused, safe, and evidence-backed. Do not change public routes/API contracts, auth/RBAC, scoring, payments, persisted data semantics, or production data/cutover without explicit authorization. Use a modular monolith; do not introduce microservices or broad rewrites to make folders look cleaner.

From Batch 9 onward, finish worthwhile modular decomposition while the owning domain is already under inspection; do not defer a second wholesale refactor pass to Batch 14. Every closed goal requires proportionate tests, focused commit and push, required CI on the exact runtime commit, current execution state, affected maps when ownership/authority changed, and a concise completion report. Do not claim production-scale or production-cutover evidence from isolated CI.
