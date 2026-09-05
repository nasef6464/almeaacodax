# ALMEAA — Main Integration Checkpoint

- Date: 2026-09-05
- Project-owner integration policy: preserve completed delivery history with normal merges; do not squash the product delivery line.
- First completed integration: PR `#27` merged `codex/assessment-data-evolution` into `main` at merge commit `e93d649dbc007e5102fbb719f9ab5598dbb14633`.
- Product Gate 5 delivery branch: `codex/productconfig-gate5`.
- Product Gate 5 integration PR: `#28`.
- Gate 5 final verified runtime head before closure docs: `3e57e5ef418bbe1d9d65d6b707bb583472ac1a51`.
- Product Gate 6 integration is complete on `main` at merge commit `fc9eb74750eea8b23f57ddf85784bcc4012a1a30`.
- Product Gate 6 final release-candidate runtime: `7ce481422c3eafdf94f8fbfd1954aaf5b166d4ce`.
- Current continuation branch: `codex/post-gate6-release-readiness`, created from the Gate 6 merge commit.
- Current approved phase: post-Gate-6 release readiness only; do not reopen Gates 1–6 without a proved defect or explicit owner authorization.

> This checkpoint is authoritative for integration/continuation order. If an older execution-state paragraph still names Gate 4/5/6 as active, treat that paragraph as stale and follow current Git HEAD plus this checkpoint.

## Closed product gates

The following product gates are CLOSED / VERIFIED and must not be reopened merely because branches or integration points changed:

- Product Gate 1 — Assessment Commercial Module: CLOSED / VERIFIED Strong MVP.
- Product Gate 2 — Subject Learning Space: CLOSED / VERIFIED.
- Product Gate 3 — Sellable School MVP: CLOSED / VERIFIED Strong MVP.
- Product Gate 4 — Results & Reports / Results Intelligence: CLOSED / VERIFIED Strong MVP.
- Product Gate 5 — ProductConfig / White-label Foundation: CLOSED / VERIFIED Strong MVP.
- Product Gate 6 — Questions / Curriculum / Courses / Operations: CLOSED / VERIFIED Strong MVP.

Reopen a closed gate only for a proved runtime defect, failing acceptance evidence, security/data-integrity risk, packaging/deployment defect, or an explicitly approved product change.

## Gate 5 integration carries

Gate 5 adds the reusable white-label single-deployment foundation without changing the product into SaaS multi-tenancy:

- public secret-safe `GET /api/product-config` read boundary;
- composition from existing HomepageSettings, PlatformFontSettings and PlatformIntegrationSettings ownership;
- explicit Admin ownership paths for sellable branding/auth/registration/SEO/contact/provider settings;
- two independent customer variants from configuration only;
- versioned `CustomerInstanceManifest`;
- guarded dry-run/apply customer bootstrap;
- deterministic non-secret deployment package with config digest, verification and rollback instructions;
- customer packaging proof without database writes or secret leakage;
- no global `tenantId`;
- no customer-specific core forks;
- no microservices or central SaaS tenant layer.

Exact runtime head `3e57e5ef418bbe1d9d65d6b707bb583472ac1a51` passed the applicable Gate 5 closure workflows: Phase + Handover, Recovery, Production Readiness, Safety and Dependency Audit.

A real buyer production cutover / live rollback drill remains an operational customer-delivery acceptance exercise. It is not a reason to treat the ProductConfig foundation as open unless it reveals a real defect.

## Gate 6 integration carries

Gate 6 Questions / Curriculum / Courses / Operations is integrated into `main`. The merge commit records final RC `7ce481422c3eafdf94f8fbfd1954aaf5b166d4ce` as having passed Phase + Handover, Production Readiness and Recovery before integration.

Gate 6 closure does not authorize a broad architecture rewrite, a new tenancy model, or buyer-specific forks. Existing domain ownership, RBAC, scoring, payment and data semantics remain in force unless a later proved defect or separately approved goal requires a bounded change.

## Known non-blocking staging note

Google OAuth on Staging remains a separate staging-only follow-up because the backend callback is still bound to the production `CLIENT_URL`. Production Google OAuth behavior is not changed by this checkpoint. Do not solve this by allowing arbitrary callback origins or disabling deployment protection.

## Continuation rule after Gate 6 integration

1. Start release-readiness work from latest `main` only; the prepared branch is `codex/post-gate6-release-readiness`.
2. Do not continue product implementation on integrated Gate 5 or Gate 6 branches.
3. The next bounded goal is **post-Gate-6 release readiness**: prove one real commercial/security/operations gap at a time, close it with the smallest coherent slice, and preserve the verified product gates.
4. UI polish remains a separate visual-only line unless a UI defect directly blocks release acceptance.
5. Preserve the product model: reusable white-label single-deployment modular source platform; one deployment per buyer/customer, multiple schools allowed, no global `tenantId`, no SaaS multi-tenancy rewrite, no microservices, and no buyer-specific hardcoded branches.
6. Production data migration/cutover and real buyer cutover/rollback drills require separate explicit owner authorization.

## Release-readiness bounded batch — Socket.IO configured-origin parity

- Branch: `codex/release-readiness-next-gap`; PR `#35`.
- Runtime commit: `0a262f5f00276a4d7b89f28359d79ef26c67a23d`.
- Proven gap: REST CORS accepted explicit `CORS_ALLOWED_ORIGINS`, but Socket.IO accepted only `CLIENT_URL`.
- Fix: Socket.IO now uses the deduplicated explicit set `CLIENT_URL + CORS_ALLOWED_ORIGINS`; no wildcard or request-derived origin was introduced.
- Verification: Phase + Handover, Production Readiness, Safety and Recovery all completed successfully on the exact runtime commit; Vercel status is successful.
- Status: `VERIFIED`. No API/RBAC/scoring/payment/schema/data-ownership change. Gates 1–6 remain closed.
- Owner-approved next product focus after this release-readiness batch: bounded Course System journey review and improvement, starting with one proved course authoring/access defect at a time. This is an explicit product-change authorization, not a reopening of Gate 6 wholesale.

## Course System bounded batch — direct enrollment integrity

- Branch: `codex/course-access-integrity`; PR `#36`.
- Proven defect: the existing `POST /api/courses/:id/enroll` and `/join` handler could add a paid course to `subscription.purchasedCourses` without verified purchase entitlement and could increment `studentCount` repeatedly for the same user.
- Final runtime commit: `bfe9755d9048408d1ba4d0c9c6978089bafa5c34`.
- Fix: the existing canonical route rejects direct enrollment for paid courses with `COURSE_PURCHASE_REQUIRED`, returns idempotent success for already-enrolled users, increments `studentCount` only on a new free enrollment, and applies the existing learner-visibility boundary before enrollment.
- Structural correction: an initial extra guard-router implementation was rejected by the immutable architecture gate because it introduced duplicate HTTP route entries and an additional `/courses` mount. That structure was removed; the final runtime changes the existing route only and does not expand the HTTP/router contract.
- CI evidence: Phase + Handover, Recovery and Production Readiness are green on exact runtime commit `bfe9755d9048408d1ba4d0c9c6978089bafa5c34`. Safety baseline-quality is fully green, including frontend/API typecheck, production builds, immutable architecture, security and contract checks.
- Deployability evidence: Vercel later produced READY preview deployment `dpl_6uRuEeKzVHUrChCyqga7hNDDfN3F` from descendant `7b4533d7418170b7d569b21fd694e3c530642fe4`. The only commits between `bfe9755d...` and that deployed descendant modify this checkpoint document only, so the deployed runtime tree is the verified `bfe9755d...` runtime.
- Contract impact: no new route URL/method, payment-provider redesign, RBAC role change, scoring change, schema/data migration, tenant model, microservice, or production cutover.
- Map impact: `MODULE_CATALOG.md`, `CHANGE_MAP.md`, and `DATA_ACCESS_MAP.md` remain unchanged because module ownership, persistence ownership and data-query responsibility did not move.
- Status: `VERIFIED`; PR `#36` was merged to `main` at `977f39b5d886c0369f50a8af06d630ff10672f97`.

## Course System bounded batch — free enrollment persistence

- Branch: `codex/course-free-enrollment-persistence`; draft PR `#38`.
- Proven defect: learner `ابدأ مجاناً` used the local Zustand `enrollCourse` mutation only; it never called the canonical server enrollment route, so enrollment could disappear after refresh and never become authoritative server state.
- Final runtime commit under verification: `02e0205721f4dba7be0841ce61db33c0cb4f081c`.
- Fix: `coursesApi.enrollCourse(id)` calls existing `POST /api/courses/:id/enroll`; the enrollment slice keeps optimistic UX for syncable real users, persists through the API, mirrors successful server course access into current session state, and rolls back only the affected optimistic enrollment on failure. Dev/non-sync sessions preserve compatibility.
- Focused contract: `scripts/smoke-batch100d-admin-course-flow.mjs` now asserts canonical API mutation, server sync, authoritative access mirror and rollback behavior.
- CI evidence on exact runtime: Phase + Handover `33992943388` SUCCESS; Recovery `33992943284` SUCCESS; Public UI `33992943348` SUCCESS; Safety baseline-quality job `101378297059` SUCCESS including frontend/API typecheck, production builds, immutable architecture, security and student-journey contracts.
- External blocker: Safety workflow `33992943342` is red only because Vercel reports `build-rate-limit` for the exact runtime commit. The product/runtime checks are green; deployability is not yet proven for this head.
- Contract impact: no new route URL/method, payment-provider redesign, RBAC/scoring change, schema/data migration, ownership move, tenant model, microservice, buyer-specific core fork, or production cutover.
- Map impact: `MODULE_CATALOG.md`, `CHANGE_MAP.md`, and `DATA_ACCESS_MAP.md` remain unchanged because module ownership and data-access responsibility did not move.
- Status: `PARTIAL / BLOCKED-ENV`; PR `#38` remains draft and must not merge until Vercel deployability evidence clears on the unchanged runtime.
- Handoff: `docs/architecture/COURSE_FREE_ENROLLMENT_PERSISTENCE_HANDOFF_AR.md`.
- Next exact action: re-check Vercel/status only. If deployability succeeds, mark this batch VERIFIED, ready/merge PR `#38` preserving history, verify production deployment/health when available, then create a fresh branch from new `main` for the next independently proved Course System journey gap.

## Agent handoff rule

At the start of any future Codex/agent goal, read current Git HEAD, this checkpoint, and `docs/architecture/POST_GATE6_RELEASE_READINESS_START_NOTE.md` before interpreting older execution-state paragraphs. Current Git HEAD plus this checkpoint outrank stale notes that name already-integrated gates as active.
