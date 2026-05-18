# PROJECT STATUS

- Project: ALMEAA CODAX
- Last Update: 2026-05-18
- Active Batch: BATCH 27C - Sentry SDK Integration + Live Event Closure
- Status: Programmatically closed, production verification pending

## Delivered In This Update
- Added real Sentry runtime integration in backend (`@sentry/node`) and frontend (`@sentry/react`).
- Wired backend error handler to report 5xx exceptions to Sentry with request context.
- Added admin-only test endpoint: `POST /api/operations/sentry/test-event`.
- Added runtime smoke contract: `npm run smoke:sentry-runtime`.

## Checks
- `npm --prefix server run build` PASS
- `npm run typecheck` PASS
- `npm run build` PASS
- `npm run smoke:monitoring` PASS
- `npm run smoke:health-readiness` PASS
- `npm run smoke:sentry-runtime` PASS
- `npm run smoke:sentry-live-proof` FAIL (Missing `SMOKE_ADMIN_TOKEN`)

## Production Verification
- Monitoring and health contracts are passing.
- Final live Sentry event proof in production is still pending (`eventId` must be captured from production and matched inside Sentry dashboard).
- Render health still reports older commit than latest GitHub push, so live proof must run after deploy sync.

## Next Suggested Step
- BATCH 27D — Sentry Live Production Event Proof (Final closure evidence)

## Update 2026-05-18 — Course Linkage Audit Entry
- Added dedicated audit: `COURSE_LINKAGE_AUDIT_2026-05-18_AR.md`.
- Confirmed course linkage gaps across admin settings, student learning listing, and course player path.
- Next focused execution sequence (single-batch closure mode):
  1. `BATCH 30B — Course Builder Arabic Encoding & Field Canonicalization`
  2. `BATCH 30C — Course Visibility Contract (Admin -> Student)`
  3. `BATCH 30D — Curriculum Import Scope Guard`
- No feature/UI redesign performed in this audit step.

## Update 2026-05-18 — BATCH 30B Course Builder Canonicalization
- Batch executed: `BATCH_30B_COURSE_BUILDER_ARABIC_ENCODING_AND_FIELD_CANONICALIZATION_2026-05-18_AR`.
- Removed duplicated path/subject editing flow inside `AdvancedCourseBuilder` and kept one canonical settings flow.
- Fixed Arabic mojibake text corruption in course builders to prevent `????` labels.
- Checks passed: server build, typecheck, frontend build, health-readiness smoke.
- Status: Programmatically closed, production verification pending.
- Next suggested: `BATCH 30C — Course Visibility Contract (Admin -> Student)`.
