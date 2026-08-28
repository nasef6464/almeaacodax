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
| P0-02 | Weekly report distributed scheduling | COMPLETED | queue، lock، idempotency، retry، no duplicate send |
| P0-03 | Bootstrap and unbounded reads | IN PROGRESS | scoped/paginated endpoints وpayload budget |
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

## P0-03A — Parent progress bounded reads

- Status: COMPLETED in `f14a9576` on `refactor/modular-platform-safe`.
- Changed: `GET /api/parent/children-progress` now uses Mongo aggregation for weekly study seconds and the latest result per child instead of loading all weekly and historical result documents into Node memory.
- Preserved: endpoint URL/method, auth and parent role guard, child scope, response fields (`children`, `summary`, `weeklyStudyMinutes`, `lastQuizScore`, `weakSkills`), and scoring/skill interpretation.
- Query/index alignment: uses the existing `QuizResult` `userId + createdAt` index shape; no schema or migration change.
- Added: `smoke:parent-progress-bounded` contract (4/4).
- Tests: parent bounded-read 4/4; student learning journey 7/7; reports role 20/20; school scope 4/4; notification realtime 4/4; weekly scheduler 4/4; typecheck/server check/server build/frontend build/repository audit/architecture gate PASS.
- Known limitation: this closes only the parent progress hotspot. Taxonomy/content bootstrap and operations status remain candidates for P0-03B; scale/load certification is not claimed.
- Next: inspect and bound the next bootstrap/status read without changing its response contract.

## P0-02 — Distributed weekly parent-report scheduling

- Status: COMPLETED in `0172947a` on `refactor/modular-platform-safe`.
- Changed: replaced the process-local hourly timer with a BullMQ Job Scheduler using `0 8 * * 0` and `Asia/Riyadh`; added a shared worker with concurrency 1 and retry/backoff; extracted report generation into an application service.
- Idempotency: derives the previous Sunday key at job execution time and uses the existing notification `campaignId` to skip a parent already delivered for that week. Partial failures remain visible to BullMQ retries; completed parents are skipped safely.
- Preserved: existing bootstrap facade, report calculation and Arabic notification content, parent recipient selection, notification APIs, persisted schema semantics, and all public/API/RBAC/payment/quiz contracts.
- Added: focused scheduler contract `smoke:weekly-parent-report`; graceful shutdown closes the report worker and queue.
- Tests: weekly scheduler contract PASS (4/4); typecheck PASS; server check PASS; server build PASS; frontend build PASS; repository audit PASS; architecture gate PASS; route/runtime/security/quiz-integrity smoke PASS.
- Known limitation: the scheduler requires the already-supported Redis/BullMQ production configuration; P0-03 still must bound high-volume parent/report reads, and no production load certification has been claimed.
- Next: P0-03 bootstrap and unbounded reads.

كل Batch له Commit منفصل ولا يجمع Structural وProduct وDB migration.
