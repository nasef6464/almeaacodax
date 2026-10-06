# ALMEAA — Course Free Enrollment Persistence — Current Main Handoff

- Date: 2026-09-06
- Branch: `codex/course-free-enrollment-persistence-main`
- PR: `#40`
- Parent main: `84cd112dfc272099b9a86cb43689dbd48e57e5f3`
- Verified runtime commit: `2ea04ab9ca46f69be3d32977ee51f328a139dcf6`

## Status

`VERIFIED` bounded Course System product slice. Gates 1–6 remain closed.

## Proven product gap

The learner-facing free-course enrollment action updated local Zustand `enrolledCourses` only. It did not call the existing canonical `POST /api/courses/:id/enroll` endpoint, so an apparently successful free enrollment could disappear after refresh and never become authoritative server state.

## Smallest coherent fix

- `services/apiGroups/coursesApi.ts` exposes `enrollCourse(id)` against the existing canonical POST route.
- `store/slices/accessEnrollmentSlice.ts` preserves optimistic UX for syncable users, persists through the API, mirrors successful canonical course access into session state, and rolls back only the affected optimistic enrollment on rejection/failure.
- Dev/non-sync sessions retain local-only compatibility.
- `scripts/smoke-batch100d-admin-course-flow.mjs` asserts canonical API mutation, server sync, authoritative mirror and rollback behavior.

## Exact-runtime evidence

On runtime commit `2ea04ab9ca46f69be3d32977ee51f328a139dcf6`:

- Platform V3 Phase + Handover Gate `34001358729`: **SUCCESS**.
- Platform V3 Recovery Gate `34001358738`: **SUCCESS**.
- Refactor V2 Safety Gate `34001358740`: **SUCCESS**.
  - frontend typecheck: PASS;
  - API typecheck: PASS;
  - frontend production build: PASS;
  - API production build: PASS;
  - immutable architecture contract: PASS;
  - progressive module boundaries: PASS;
  - security, runtime-source, student-learning and regression contracts: PASS.
- Platform V3 Public UI Gate `34001358759`: **SUCCESS**.
- Vercel status on the exact runtime commit: **SUCCESS**.

Backend Integration and Deep Pre-Merge workflows were skipped by their existing branch filters; no workflow/runtime change was made merely to force those structurally scoped gates to run. The product slice does not alter backend route behavior; it consumes the already-verified canonical enrollment route.

## Contract / architecture impact

No new route URL/method, payment-provider redesign, RBAC/scoring change, schema/data migration, ownership move, global `tenantId`, SaaS multi-tenancy, microservice, buyer-specific core fork, or production cutover.

`MODULE_CATALOG.md`, `CHANGE_MAP.md`, and `DATA_ACCESS_MAP.md` remain unchanged because module ownership, persistence ownership, and data-query responsibility did not move.

## Closure

This supersedes the earlier diverged draft PR `#38`, which carried the same runtime correction from an older `main` and was blocked only by an external Vercel build-rate limit. PR `#40` reapplies the bounded fix from the current integrated `main` and has exact-runtime deployability evidence.

After merge, continue from the new `main` and inspect exactly one next Course System product/commercial/operations gap. Do not reopen verified Gates 1–6 without a proved defect or explicit owner authorization.
