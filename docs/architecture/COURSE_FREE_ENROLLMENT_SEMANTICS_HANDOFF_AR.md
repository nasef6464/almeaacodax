# ALMEAA — Course System free enrollment semantics handoff

- Date: 2026-09-06
- Branch: `codex/course-system-next-gap-2`
- PR: `#42`
- Base main: `e58e06ab96952c89c340c3405e91917f39637362`
- Final runtime commit: `651eb3cb92b470835ef745ed31468e06002afa2f`
- Final verification head: `89fe4f004f6f12d460e6be72e0cfe6791767f458` (`CI-only`; no runtime/product file changes after the runtime commit)
- Merge commit: `bf80a3cd805fb15201a02dceca6b1c6a3c08454c`
- Status: `VERIFIED` bounded Course System commercial/data-semantics batch.

## Proven gap

Free course enrollment was persisted on the server into `subscription.purchasedCourses`, and the synced frontend enrollment flow mirrored the same free enrollment into `purchasedCourses`. That conflated two different commercial meanings: learner enrollment and verified purchase entitlement. It could make downstream commerce/reporting logic interpret a free join as a purchase even though no paid transaction occurred.

## Smallest coherent fix

- Free course enrollment now persists in the already-existing `User.enrolledCourses` field.
- The frontend mirrors a confirmed synced free enrollment only into `enrolledCourses`; it no longer manufactures `subscription.purchasedCourses` state.
- Existing historical `subscription.purchasedCourses` entries remain readable for entitlement/idempotency compatibility; no production-data migration or cutover is required or authorized.
- Paid direct enrollment remains blocked by `COURSE_PURCHASE_REQUIRED` unless the learner already has a compatible persisted entitlement.
- `studentCount` still increments only on the first successful new free enrollment.
- The existing structural course smokes were corrected only where they encoded the obsolete free-enrollment-as-purchase behavior. Runtime behavior was not weakened to satisfy tests.

## Runtime and CI-only head separation

Runtime commit `651eb3cb92b470835ef745ed31468e06002afa2f` contains the complete product change and focused contract corrections.

The next commit, `89fe4f004f6f12d460e6be72e0cfe6791767f458`, changes only `.github/workflows/platform-v3-backend-integration-gate.yml` to allow `codex/course-system-next-gap-2` to execute the already-existing isolated Backend Integration job. It does not change application runtime, API behavior, data model, product semantics, or tests. The final CI evidence therefore validates the runtime tree represented by `651eb3cb92b470835ef745ed31468e06002afa2f` through the CI-only verification head.

## Exact verification evidence

Final verification head `89fe4f004f6f12d460e6be72e0cfe6791767f458`:

- Platform V3 Phase + Handover Gate — run `34006734027`: `SUCCESS`.
- Platform V3 Backend Integration Gate — run `34006734174`: `SUCCESS`; includes isolated Mongo/API integration and Course commercial journey acceptance.
- Platform V3 Recovery Gate — run `34006734048`: `SUCCESS`.
- Refactor V2 Safety Gate — run `34006734194`: `SUCCESS`.
- Refactor V2 Production Readiness Gate — run `34006734036`: `SUCCESS`.
- Platform V3 Public UI Gate — run `34006734087`: `SUCCESS`.
- Vercel commit status: `SUCCESS` on the final verification head.
- Deep Pre-Merge, Live Role, Public Smoke Roles Preview and Assessment workflows were skipped by their existing workflow conditions; no product/runtime change was introduced merely to force them to run.

The first runtime-head attempts included externally cancelled jobs. The cancellation log showed the production frontend build had completed successfully before GitHub reported `The operation was canceled`; rerunning the relevant jobs produced green results. No product regression was evidenced by those cancellations.

## Architecture and ownership impact

No route URL/method, RBAC role, scoring behavior, payment-provider approval semantics, persisted schema, production-data migration/cutover, ownership boundary, global `tenantId`, SaaS multi-tenancy, microservice, or buyer-specific core fork was introduced.

`MODULE_CATALOG.md`, `CHANGE_MAP.md`, and `DATA_ACCESS_MAP.md` remain unchanged because module ownership, data ownership/query responsibility, and migration state did not move.

## Next bounded action

Start from the resulting latest `main` on a fresh focused branch. Inspect exactly one next independent Course System product/commercial/security/operations gap. Do not reopen Product Gates 1–6 wholesale and do not begin a production-data migration/cutover or tenancy architecture change without separate owner authorization.
