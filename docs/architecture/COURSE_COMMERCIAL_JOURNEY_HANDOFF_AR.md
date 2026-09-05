# Course Commercial Journey — Verification & Handoff

## Status

- Batch: post-Gate-6 Course System commercial journey integrity.
- Branch: `codex/course-commercial-journey`.
- PR: `#39` — Courses: protect commercial entitlements and prove buyer journey.
- Verified runtime commit: `4664bda65e6e1ca19bb2402ffa4702a1aead13fd`.
- Scope is bounded to Course purchase entitlement, paid-payload protection, and its isolated acceptance evidence.
- Gates 1–6 remain closed; this batch does not reopen them.

## Proven product defects closed

1. A scoped course/package purchase could promote the user to global `subscription.plan = premium`, widening entitlement beyond the purchased content.
2. Public/unentitled course list/detail payloads could expose restricted paid lesson/file data even though the UI presented the content as locked.

## Runtime correction

- `server/src/services/accessGrantService.ts`: scoped course/package grants mirror only purchased package/course/enrollment identifiers. Global premium upgrades remain owned by the dedicated subscription purchase flow.
- `server/src/routes/course.routes.ts`: non-staff catalog/detail readers project a safe paid-course payload. Public preview material remains available; restricted content/video/file/meeting/recording/interactive-question data is withheld until entitlement. Staff and entitled learners retain the full authoring/learning payload.
- No route URL/method, RBAC role, scoring contract, persistence schema, tenant model, or production-data migration was changed.

## Acceptance harness correction

The first CI attempt exposed test-contract drift rather than a runtime regression:

- the new acceptance script exceeded 400 lines under `server/src/` and was therefore counted by the immutable architecture hotspot audit even though it is a CI harness; the harness was compacted below that structural threshold without changing product behavior;
- the fixture initially used a non-existent `integration-path`, while learner visibility correctly requires an active path or an unscoped course; the fixture now uses the existing unscoped visibility contract;
- lean Course payloads expose the canonical string `_id`, so assertions now resolve `id || _id` instead of assuming the Mongoose virtual `id` is present.

These are harness/contract corrections only. Runtime behavior was not weakened to make tests pass.

## Exact-runtime evidence

On runtime commit `4664bda65e6e1ca19bb2402ffa4702a1aead13fd`:

- Platform V3 Backend Integration Gate `33996369061`: **SUCCESS**.
  - API typecheck: PASS.
  - API production build: PASS.
  - Integration harness typecheck: PASS.
  - Real HTTP backend integration suite: PASS.
  - Course commercial journey acceptance: PASS.
- Platform V3 Phase + Handover Gate `33996369059`: **SUCCESS**.
- Refactor V2 Production Readiness Gate `33996369097`: **SUCCESS**.
- Platform V3 Recovery Gate `33996369052`: **SUCCESS**.
- Refactor V2 Safety baseline job `101387521313`: **SUCCESS**, including frontend/API typecheck + production builds, immutable architecture contract, progressive module boundaries, runtime source, auth security, API security, student learning journey, and the existing regression contracts.
- Vercel status on the exact runtime commit: **SUCCESS**.

The commercial acceptance proves teacher review-gated authoring, admin publishing, public learning/package catalog separation, preview preservation, paid payload redaction before entitlement, direct paid-enroll bypass rejection, free enrollment idempotency, server-authoritative payment pricing, approval-scoped direct-course access, package-included course access, and full payload delivery after entitlement.

## Commercial/security result

This batch closes a direct revenue and content-protection gap: purchasing one course/package can no longer silently become platform-wide premium access, and paid assets are no longer returned to an unentitled learner merely because the client UI hides them.

## Next bounded action

Do not broaden this batch further. After PR #39 is finalized/merged through the normal verified path, continue the documented Course System journey from the new `main` and inspect exactly one next product/commercial/operations gap. Preserve the current prohibitions on global tenant IDs, SaaS multi-tenancy, microservices, buyer-specific core forks, and production-data migrations/cutovers without explicit owner authorization.
