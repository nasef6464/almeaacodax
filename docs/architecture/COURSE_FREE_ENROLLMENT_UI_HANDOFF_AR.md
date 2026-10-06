# Course System — Free Enrollment UI Entitlement Handoff

## Status

`VERIFIED` — bounded Course System product/security batch.

## Proven gap

The canonical course-detail API already redacts enrolled-only content until the learner has a valid entitlement. The frontend still treated `price <= 0` as if it were entitlement: `CourseView` could unlock the player/lesson locks for a free course before canonical enrollment, `CoursePlayer` accepted zero price as access, and the overview exposed enrolled-paid files from price alone. This created a client-side access mismatch and could also expose locally cached fallback course content before the server confirmed enrollment.

## Delivered slice

- Free means no payment is required; it no longer means automatic enrollment entitlement.
- `CourseView` unlocks restricted course content only for confirmed enrollment/purchase/package access or staff, while explicit public-preview lessons remain playable.
- `CoursePlayer` no longer uses `price <= 0` as an access shortcut.
- Enrolled-paid course files remain locked until enrollment/other valid entitlement.
- Registered learners on free locked content are routed through the existing canonical free-enrollment action; guests are routed to login before any local enrollment mutation.
- Course detail refetches when confirmed `enrolledCourses` changes, so successful free enrollment receives the full server-authorized payload.
- Added a focused Course Free Enrollment UI Gate covering frontend typecheck and the course file/access entitlement contract.
- Synced the existing PR branch with latest `main` through merge commit `2e911414832421713db2ca66b174980a04296433`; no unrelated runtime behavior was reimplemented.

## Exact runtime verification

Runtime/verification head: `2e911414832421713db2ca66b174980a04296433`.

- Course Free Enrollment UI Gate — run `34021952647` — `SUCCESS`.
- Phase + Handover Gate — run `34021952629` — `SUCCESS`.
- Recovery Gate — run `34021952633` — `SUCCESS`.
- Production Readiness Gate — run `34021952634` — `SUCCESS`.
- Safety Gate — run `34021952640` — `SUCCESS`.
- Public UI Gate — run `34021952651` — `SUCCESS`.
- Vercel status on the exact runtime head — `SUCCESS`.

Backend Integration/Deep/role workflows were path-skipped because this bounded slice changes frontend entitlement presentation/guards only; the server API contract and backend runtime were not changed.

## Contract / architecture impact

No new route or API shape, no RBAC/auth role change, no scoring change, no payment-provider redesign, no persisted schema or production-data migration, no tenant model, no microservice, and no buyer-specific fork.

`MODULE_CATALOG.md`, `CHANGE_MAP.md`, and `DATA_ACCESS_MAP.md` remain unchanged because module ownership, responsibility location, persistence ownership, and data-query boundaries did not move.

## Closeout

PR `#46` is ready for normal merge preserving history after this docs-only evidence commit. After merge, verify the resulting deployment/health when available, create a fresh focused branch from new `main`, and continue with exactly one independently proved Course System commercial/security/operations gap. Do not reopen Gates 1–6 wholesale.
