# ALMEAA — Course System synced enrollment access handoff

- Date: 2026-09-06
- Branch: `codex/course-system-next-gap`
- PR: `#41`
- Base main: `fdce82560f6e8c929c62e1a8198d6c659b13ab45`
- Final runtime commit: `28d36267f356f7ecd08b64f1d9b66b21b13558f4`
- Status: `VERIFIED` bounded Course System security/product batch.

## Proven gap

PR #40 made free enrollment persistent through the canonical API, but a syncable authenticated learner was still added to frontend `enrolledCourses` before the server confirmed the mutation. Course surfaces consume `enrolledCourses` as an access signal, so a slow or rejected enrollment request could temporarily create a fail-open learner UI state.

## Smallest coherent fix

- Syncable sessions no longer receive local course access before `POST /api/courses/:id/enroll` confirms enrollment.
- The response must not report `enrolled: false` before access is mirrored into `enrolledCourses` and the existing session subscription projection.
- A slice-local `pendingCourseEnrollments` set deduplicates repeated in-flight enrollment clicks and is always released in `finally`.
- Non-sync/dev sessions keep the prior immediate local-only compatibility behavior.
- The existing course-flow structural smoke now asserts fail-closed synced enrollment instead of the obsolete optimistic-grant/rollback contract.

## Exact-runtime evidence

Runtime commit `28d36267f356f7ecd08b64f1d9b66b21b13558f4`:

- Platform V3 Phase + Handover Gate — run `34003940723`: `SUCCESS`.
- Platform V3 Recovery Gate — run `34003940697`: `SUCCESS`.
- Refactor V2 Safety Gate — run `34003940695`: `SUCCESS`; frontend/API typecheck and production builds completed successfully before the contract suite completed green.
- Platform V3 Public UI Gate — run `34003940714`: `SUCCESS`.
- Vercel commit status: `SUCCESS` on the exact runtime commit.
- Backend Integration, Deep Pre-Merge, Live Role, Public Smoke Roles Preview and Assessment workflows were skipped by their existing branch/workflow conditions; no workflow or runtime behavior was broadened merely to force them to execute.

## Contract and architecture impact

No backend route URL/method, RBAC role, scoring behavior, payment provider/approval semantics, persisted schema, data migration, ownership boundary, global tenant ID, SaaS multi-tenancy, microservice, buyer-specific core fork, or production cutover was introduced.

`MODULE_CATALOG.md`, `CHANGE_MAP.md`, and `DATA_ACCESS_MAP.md` remain unchanged because module ownership, data ownership, access-query responsibility and migration state did not move.

## Next bounded action

After PR #41 is finalized through the normal verified merge path, start from the resulting latest `main` on a fresh focused branch. Inspect exactly one next independent Course System product/commercial/security/operations gap. Do not reopen Product Gates 1–6 wholesale and do not broaden into production-data migration/cutover or a new tenancy architecture without separate owner authorization.
