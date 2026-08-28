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
| P0-01 | Notification event fan-out | COMPLETED | نفس SSE contract، isolation tests، Redis path |
| P0-02 | Weekly report distributed scheduling | NEXT | queue، lock، idempotency، retry، no duplicate send |
| P0-03 | Bootstrap and unbounded reads | PLANNED | scoped/paginated endpoints وpayload budget |
| P1-01 | PWA API cache classification | PLANNED | allowlist public/safe فقط |
| P1-02 | Assessment backend boundary map | PLANNED | ownership/contracts قبل extraction |
| P1-03 | Student result-to-skill loop | PLANNED | evidence-backed recommendation/content links |

## P0-00 — PWA/authenticated API cache safety

- Status: COMPLETED on `refactor/modular-platform-safe`, code commit `81aaee59`.
- Changed: removed broad Workbox runtime caching for `/api/*` from `vite.config.ts`.
- Preserved: HTML navigation cache, immutable assets, explicit public application cache in `services/api.ts`, URLs/API behavior, and authenticated request flow.
- Added: deployment cache contract assertions preventing broad API cache regression.
- Tests: typecheck PASS; frontend build PASS; `smoke:deployment-cache` PASS; `smoke:route-loading` PASS; `smoke:runtime-source` PASS; architecture gate PASS.
- Next: P0-01 notification fan-out inspection.

## P0-01 — Notification realtime fan-out

- Status: COMPLETED in `3150eb67` on `refactor/modular-platform-safe`.
- Changed: added a notification realtime bridge with per-process listeners and optional Redis pub/sub; persisted in-app deliveries publish events after `insertMany`; SSE keeps the existing endpoint and event names while doing one initial unread count instead of Mongo polling per connection.
- Preserved: `/api/notifications/stream`, `connected`/`notification`/`unread_count` events, notification delivery persistence, auth flow, notification read/update routes, and local fallback when Redis is unavailable.
- Added: focused source contract `smoke:notification-realtime` and lifecycle startup/shutdown wiring.
- Tests: `smoke:notification-realtime` PASS (4/4); `smoke:notifications` PASS; `typecheck` PASS; `server:check` PASS; `server:build` PASS; `build` PASS; `architecture-gate` PASS; `smoke:route-loading` PASS; `smoke:runtime-source` PASS.
- Known limitation: realtime delivery is not load-certified yet; Redis availability and multi-instance behavior require staging/load verification in a later gate.
- Next: P0-02 weekly report distributed scheduling.

كل Batch له Commit منفصل ولا يجمع Structural وProduct وDB migration.
