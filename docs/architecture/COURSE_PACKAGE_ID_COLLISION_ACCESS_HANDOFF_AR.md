# ALMEAA — Course package/content ID collision access handoff

- Date: 2026-09-07
- Branch: `codex/course-package-id-collision-access`
- PR: `#60`
- Base main: `9dc18eb35627d1165bd03ef9d9555e1818568922`
- Runtime commit: `1bbfb99500dc3b35f2749d7f2631819f184519d3`
- Status: `PARTIAL` pending terminal CI on the exact runtime commit.

## Proven gap

The frontend generic `checkAccess(contentId, true)` direct-content resolver accepted `subscription.purchasedPackages.includes(contentId)` as if a purchased package ID were a direct entitlement to an arbitrary premium content ID. Paid quiz/course surfaces already combine direct-content checks with the separate scoped package resolver, so a package/content ID collision could incorrectly unlock unrelated paid content in the learner UI.

## Smallest coherent fix

- Remove the purchased-package ID shortcut from generic direct-content access.
- Preserve global Premium access.
- Preserve confirmed `enrolledCourses` access.
- Preserve direct `purchasedCourses` access.
- Preserve package entitlement through the existing scoped `hasScopedPackageAccess(contentType, pathId, subjectId)` resolver.

## Boundaries

No API URL/method, backend RBAC, scoring, payment-provider semantics, persisted schema/data ownership, production data, global tenant ID, SaaS multi-tenancy, microservice, buyer-specific fork, or production cutover changes.

`MODULE_CATALOG.md`, `CHANGE_MAP.md`, and `DATA_ACCESS_MAP.md` remain unchanged because module ownership, query responsibility, persistence ownership, and migration state did not move.

## Verification state

Exact runtime `1bbfb99500dc3b35f2749d7f2631819f184519d3`:

- Vercel commit status: `SUCCESS`.
- Platform V3 Phase + Handover Gate: running at handoff time.
- Platform V3 Recovery Gate: running at handoff time.
- Refactor V2 Safety Gate: running at handoff time.
- Platform V3 Public UI Gate: running at handoff time.
- Course Free Enrollment UI Gate: running at handoff time.
- Backend Integration / Deep Pre-Merge / Live Role / Assessment / role-preview: skipped by existing workflow conditions for this bounded frontend-only slice.

Do not mark the PR ready or merge until the applicable exact-runtime workflows above reach terminal green results. If green, update this handoff/PR evidence, mark PR #60 ready, merge preserving history, verify the resulting production deployment/health when available, and continue only from the new `main`.
