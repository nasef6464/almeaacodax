# ALMEAA — Course Free Enrollment Persistence Handoff

- Date: 2026-09-06
- Branch: `codex/course-free-enrollment-persistence`
- Draft PR: `#38`
- Final runtime commit under verification: `02e0205721f4dba7be0841ce61db33c0cb4f081c`
- Parent main at batch start: `977f39b5d886c0369f50a8af06d630ff10672f97`

## Proven product gap

The learner-facing free-course action (`ابدأ مجاناً`) called the Zustand `enrollCourse` action, but that action only added the course ID to local `enrolledCourses`. It did not call the canonical `POST /api/courses/:id/enroll` endpoint. A successful-looking free enrollment could therefore be browser-local, disappear after refresh/session hydration, and never become authoritative server state.

## Smallest coherent fix

- `services/apiGroups/coursesApi.ts` now exposes `enrollCourse(id)` against the existing canonical POST route.
- `store/slices/accessEnrollmentSlice.ts` keeps the current optimistic UX, but for real syncable users it persists enrollment through the API.
- On success, the returned canonical course ID is mirrored into the current session's `enrolledCourses` and `subscription.purchasedCourses`, matching the existing server enrollment state.
- On failure/rejection, only the affected optimistic course enrollment is rolled back.
- Dev/non-sync sessions retain local-only compatibility.
- `scripts/smoke-batch100d-admin-course-flow.mjs` now asserts the API mutation, server sync, authoritative mirror and rollback contract.

## Verification on exact runtime commit

- Platform V3 Phase + Handover `33992943388`: `SUCCESS`.
- Platform V3 Recovery `33992943284`: `SUCCESS`.
- Platform V3 Public UI `33992943348`: `SUCCESS`.
- Refactor V2 Safety baseline-quality job `101378297059`: `SUCCESS`, including frontend/API typecheck, production builds, immutable architecture, security and student-journey contracts.
- Refactor V2 Safety workflow `33992943342`: overall `FAILURE` only because the Vercel status for the exact runtime commit is `failure` with target `upgradeToPro=build-rate-limit`.

## Contract / architecture impact

No new public route URL/method, no payment-provider change, no RBAC/scoring change, no schema/data migration, no ownership move, no global `tenantId`, no SaaS multi-tenancy, no microservice, no buyer-specific core fork, and no production data cutover.

`MODULE_CATALOG.md`, `CHANGE_MAP.md`, and `DATA_ACCESS_MAP.md` remain unchanged because ownership and data-access responsibility did not move.

## Status

`PARTIAL / BLOCKED-ENV`.

The product/runtime slice is green on the exact runtime commit. Merge is blocked only by the external Vercel build-rate limit; PR `#38` must remain draft until Vercel gives deployability evidence for the unchanged runtime and Safety can be treated as fully green.

## Next exact action

Re-check Vercel and the exact runtime status only. If the external rate limit clears and deployability is successful, mark this batch `VERIFIED`, update PR `#38`, mark ready, merge preserving history, verify production deployment/health when available, then create a fresh branch from new `main` for the next independently proved Course System journey gap.
