# ALMEAA — Course package/content ID collision access handoff

- Date: 2026-09-07
- Branch: `codex/course-package-id-collision-access`
- PR: `#60`
- Base main at implementation: `9dc18eb35627d1165bd03ef9d9555e1818568922`
- Runtime commit: `1bbfb99500dc3b35f2749d7f2631819f184519d3`
- Status: `VERIFIED` for the bounded runtime slice; ready for integration.

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

- Vercel commit status: `SUCCESS` / deployment completed.
- GitHub Actions reported 10 workflow runs for the exact runtime SHA.
- At closure there were zero `failure`, zero `cancelled`, zero `queued`, and zero `in_progress` runs for that SHA.
- The applicable frontend/safety/public/course gates therefore reached terminal non-failing results; backend/deep/live-role/assessment role-preview jobs remain skipped by their existing path conditions for this bounded frontend-only slice.

## Integration note

`main` advanced after this PR was opened with School-focused commits. The current `main` still contains the unsafe package-ID shortcut, so the gap remains real and the PR remains necessary. Those intervening changes are in a separate product area and do not change this slice's API, RBAC, data, or entitlement resolver contract.

After merge, verify the resulting `main` deployment/health before starting another product gap.
