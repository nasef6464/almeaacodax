# ALMEAA — Refactor Execution Ledger

## قواعد التسليم

`Inspect → Baseline → One concern → Focused tests → Builds/gates → Document → Commit → Push`

## المنجز قبل هذه الخطة

- API groups: auth, payments, learning support, taxonomy/content.
- School store/API typing stabilization.
- Paths: readiness helper وdisplay presentation وURL-state helper.
- Results score presentation وDashboard path progress projection.
- Runtime cycles/import safety: 0/0 في HEAD الحالي.

## الدفعات القادمة

| Batch | النطاق | الحالة | شرط الخروج |
|---|---|---|---|
| P0-01 | Notification event fan-out | PLANNED | نفس SSE contract، isolation tests، Redis path |
| P0-02 | Weekly report distributed scheduling | PLANNED | queue، lock، idempotency، retry، no duplicate send |
| P0-03 | Bootstrap and unbounded reads | PLANNED | scoped/paginated endpoints وpayload budget |
| P1-01 | PWA API cache classification | PLANNED | allowlist public/safe فقط |
| P1-02 | Assessment backend boundary map | PLANNED | ownership/contracts قبل extraction |
| P1-03 | Student result-to-skill loop | PLANNED | evidence-backed recommendation/content links |

## P0-00 — PWA/authenticated API cache safety

- Status: COMPLETED on `refactor/modular-platform-safe`, pending commit/push.
- Changed: removed broad Workbox runtime caching for `/api/*` from `vite.config.ts`.
- Preserved: HTML navigation cache, immutable assets, explicit public application cache in `services/api.ts`, URLs/API behavior, and authenticated request flow.
- Added: deployment cache contract assertions preventing broad API cache regression.
- Tests: typecheck PASS; frontend build PASS; `smoke:deployment-cache` PASS; `smoke:route-loading` PASS; `smoke:runtime-source` PASS; architecture gate PASS.
- Next: P0-01 notification fan-out inspection.

كل Batch له Commit منفصل ولا يجمع Structural وProduct وDB migration.
