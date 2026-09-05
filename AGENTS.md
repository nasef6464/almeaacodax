# ALMEAA — Delivery Rules

For any Product Goal, Product Gate, commercial MVP, vertical slice, module completion, continuation, or closure, read and apply `.codex/skills/almeaa-goal-delivery/SKILL.md` before task work. It is the default delivery workflow for this repository.

Use Git HEAD and `docs/architecture/CODEX_EXECUTION_STATE.md` as current truth; `CHAT_EXECUTION_GOALS_AR.md` is the active product plan and `FINAL_MASTER_PLAN_V3_AR.md` is the product/architecture reference. Preserve unowned working-tree changes and never use `git add .`.

Product work must be focused, safe, and evidence-backed. Do not change public routes/API contracts, auth/RBAC, scoring, payments, persisted data semantics, or production data/cutover without explicit authorization. Use a modular monolith; do not introduce microservices or broad rewrites to make folders look cleaner.

Every closed goal requires proportionate tests, focused commit and push, required CI on the exact runtime commit, current execution state, affected maps only when their ownership actually changed, and a concise completion report. Do not claim production-scale or production-cutover evidence from isolated CI.
