# ALMEAA — Release Hardening Current State

## 2026-09-17 — Batch 1 current-baseline retry

- Canonical references: `ALMEAA_SYSTEM_MAP.md` then `RELEASE_HARDENING_EXECUTION_PLAN.md`.
- Baseline: `main @ ce04cad01efce8c13647b426218ff99ec842730a`.
- Active batch: **Batch 1 — P0 TypeScript / Build Baseline**.
- Reproduced failures on current head:
  - `components/MainLayout.tsx`: course-list options passed `kind` through an adapter signature that did not expose it.
  - `dashboards/admin/QuizzesManager.tsx`: repeated `URLSearchParams.get('quizView')` calls widened the initializer to `string`.
- Bounded implementation:
  - homepage hydration now requests the existing course list and locally excludes package-backed courses before hydrating public learning courses;
  - `URLSearchParams.get('quizView')` is typed to the three supported view literals so the existing manager route logic remains unchanged.
- No API/RBAC/schema/payment/assessment-authority change.
- Next exact action: run current PR CI and require frontend typecheck + production build to pass before returning to Batch 12 production-smoke work.
