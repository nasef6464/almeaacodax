# PLAN 9 — Independent Global Certification Evidence

Date: 2026-09-28
Baseline: main@242971907730e5d41820eef97ae86ed856f7687a

## Scope

This certification executes every global check that is independent of unresolved owner/external blockers.
It does **not** issue a final market-readiness green while required earlier blockers remain open.

## Current production identity

- GitHub main: `242971907730e5d41820eef97ae86ed856f7687a`
- Vercel production: READY on the same SHA.
- Render `almeaacodax-codex`: live deploy `dep-dat4or8u01pc73fk0` on the same SHA.
- `/api/health`: 200, ready=true, database connected, Redis pass, zero critical failures/warnings.
- `/api/health/scale-ready`: 200, scaleReady=true; live Redis rate-limit/queue latency observed at 2ms each.

## Existing exact-head global suites

Deep Pre-Merge E2E already executes:
- frontend/API typecheck and production builds;
- operational multi-role API journey;
- bounded isolated read-scale validation;
- public desktop/mobile UI;
- all role pages desktop/mobile;
- question editor CRUD;
- normal/directed assessment commercial journey;
- mock assessment resume/retry;
- Student Learning Space;
- results/report actions;
- Learning Space manager;
- supervisor/school command UI;
- school-from-scratch CRUD/relations;
- barcode public-test admin/anonymous journey.

Safety, Recovery, Production Readiness and Phase/Handover remain separate required gates.

## New PLAN 9 quality lab

`scripts/live-plan9-public-quality-audit.mjs` runs Chromium on representative public routes in desktop and mobile viewports and records:
- FCP;
- LCP;
- CLS;
- mobile horizontal overflow;
- Arabic `lang` + RTL direction;
- unlabeled buttons/form controls;
- image alt-attribute coverage;
- observed HTTP 5xx.

These are **lab measurements**, not field Core Web Vitals. They are intentionally labeled as such.

## Privacy/data lifecycle

The repository contains an application-owned `deleteUserLifecycle` orchestration path and focused regression guard.
It revokes active school/parent/teaching/access authority, clears legacy relationship mirrors, anonymizes AI/client-event/notification identity, then deletes the user record without blanket deleting durable academic/payment/audit evidence.

Exact legal/business retention durations remain an owner/legal policy decision and are not invented by PLAN 9.

## Rollback evidence

Current Vercel production deployment is marked rollback-candidate and prior production releases remain available.
Render retains the current live deploy plus previous deactivated release deploys with exact commit identity.
PLAN 9 does not perform a destructive production rollback merely to demonstrate that the providers expose rollback candidates.

## Blocking items preventing final market-readiness label

### PLAN 7 — AI live provider
`BLOCKED — USER ACTION REQUIRED`
One real free/trial provider quota pool must be configured through encrypted AI Control Center; paid use remains disabled.

### #235 — scheduled DR
Issue #235 remains open:
- no real scheduled full MongoDB backup;
- no real scheduled R2/media backup;
- no independent off-site copy proof;
- no isolated full Mongo/R2 restore drill with measured RPO/RTO.

This is an external/runtime operations blocker, not something PLAN 9 may paper over.

## Final-label rule

Until the required blockers above are resolved or explicitly re-scoped by the owner, PLAN 9 can certify independent suites but must not label the platform `PRODUCTION READY`.
