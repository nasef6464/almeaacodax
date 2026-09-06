# ALMEAA — Free Course Content Entitlement Handoff

- Date: 2026-09-06
- Branch: `codex/course-free-content-entitlement`
- PR: `#43` (draft)
- Base merge point: `bf80a3cd805fb15201a02dceca6b1c6a3c08454c`
- Latest main at verification time: `0c7925365c451d0187acd7aaca3e6c83f5764853` (docs-only descendant of the base merge point)
- Final runtime commit for this batch: `ae31d14223fc5b4b8825efb5faacaaa75bd359ea`
- Status: `PARTIAL / BLOCKED-ENV` only on preview deployability; product/security acceptance is verified on the exact runtime commit.

## Proven product/security gap

A published zero-price course returned its full detail payload to anonymous and authenticated-but-unenrolled learners. That bypassed the existing lesson `accessControl: enrolled` and file `access: enrolled_paid` semantics even though Course Builder exposes those controls. The defect could leak enrolled-only lesson content, private video/file URLs, and interactive-question payloads before canonical enrollment.

## Smallest coherent runtime fix

The existing `GET /api/courses/:id` route no longer treats `price <= 0` as an automatic full-content entitlement. Staff still receive the full payload. Learners and anonymous callers continue through the already-existing course entitlement projection: public preview lessons/files remain visible, while enrolled-only lesson payload and enrolled-paid file URLs stay redacted until canonical enrollment/purchase/grant entitlement is present.

No route URL/method, RBAC role, scoring behavior, payment/provider semantics, persisted schema, production data, tenancy model, microservice, or buyer-specific fork changed.

## Acceptance evidence on exact runtime `ae31d14223fc5b4b8825efb5faacaaa75bd359ea`

- Platform V3 Phase + Handover Gate — run `34007449978`: `SUCCESS`.
- Platform V3 Backend Integration Gate — run `34007449966`: `SUCCESS`.
  - API typecheck/build: PASS.
  - existing backend integration suite: PASS.
  - existing Course commercial journey acceptance: PASS.
  - new free-course content-entitlement journey: PASS.
  - journey proves anonymous redaction, authenticated pre-enrollment redaction, successful free enrollment, full entitled payload after enrollment, enrollment idempotency, and no manufactured purchase ownership.
- Platform V3 Recovery Gate — run `34007449878`: `SUCCESS`.
- Refactor V2 Production Readiness Gate — run `34007449850`: `SUCCESS`.
- Refactor V2 Safety Gate — run `34007449858`: workflow `FAILURE`, but its `baseline-quality-gate` job is `SUCCESS` through frontend/API typecheck, production builds, immutable architecture, progressive boundaries, school/report/result/runtime/security contracts, and refactor review. The only failed job is the Vercel preview deployment gate.
- Vercel commit status on the runtime commit is `failure` with target `upgradeToPro=build-rate-limit`. The workflow log shows the gate read that external status and exited immediately; no product/build/test regression is evidenced.
- Deep Pre-Merge, Live Role, Public Smoke Roles Preview, and Assessment workflows are skipped by their existing conditions for this branch.

## CI-only workflow change

`.github/workflows/platform-v3-backend-integration-gate.yml` only adds this focused branch to the existing backend integration allow-list and adds the new isolated acceptance script to harness typecheck/execution. It does not change runtime behavior.

## Maps / ownership

`MODULE_CATALOG.md`, `CHANGE_MAP.md`, and `DATA_ACCESS_MAP.md` remain unchanged because module ownership, data ownership/query responsibility, persistence schema, and migration state did not move.

## Merge decision

Do **not** mark PR #43 ready or merge it while the required Safety workflow remains red solely because the exact runtime preview was rate-limited. Do not weaken the Safety/Vercel contract to make it green. On the next run, re-check the exact PR/runtime evidence. If a Vercel-ready preview becomes available for the same runtime tree and required CI is green, mark PR #43 ready, merge normally preserving history, verify resulting production deployment/health when available, then branch from the new `main` for exactly one next Course System gap.

## Next bounded action

Re-check Vercel/Safety evidence for this same batch first. Do not discover or implement another product gap until PR #43 is either safely merged or a real product regression is proven. Gates 1–6 remain closed.
