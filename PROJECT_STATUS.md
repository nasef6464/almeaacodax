# PROJECT STATUS

- Project: ALMEAA CODAX
- Last Update: 2026-05-19
- Active Batch: None (awaiting owner direction)
- Status: BATCH 27C fully closed; production Sentry live proof verified

## Delivered In This Update
- Added real Sentry runtime integration in backend (`@sentry/node`) and frontend (`@sentry/react`).
- Wired backend error handler to report 5xx exceptions to Sentry with request context.
- Added admin-only live test endpoint: `POST /api/operations/sentry/test-event`.
- Added runtime smoke contract: `npm run smoke:sentry-runtime`.
- Completed production closure workflow for the live Sentry event proof.

## Checks
- `npm --prefix server run build` PASS
- `npm run typecheck` PASS
- `npm run build` PASS
- `npm run smoke:monitoring` PASS
- `npm run smoke:health-readiness` PASS
- `npm run smoke:sentry-runtime` PASS
- `npm run smoke:sentry-live-proof` PASS

## Production Verification
- Render production health verified at `https://almeaacodax-k2ux.onrender.com/api/health` => `200 OK`
- Backend commit on live health: `83832c0426e5`
- Readiness: `ready=true`
- Live Sentry issue verified in dashboard: `Manual Sentry smoke event`
- Verified `eventId`: `39a8881844724be6844dd2f7fd63c88c`
- Verified release in Sentry: `83832c0426e5`
- Verified environment in Sentry: `production`

## Final Closure Notes
- Batch closed: `BATCH 27C - Sentry SDK Integration + Live Event Closure`
- Final status: `Fully closed`
- Supporting operational fixes included:
  - correcting the Render build command so backend build artifacts are produced in production
  - adding the missing backend CSRF middleware to Git/deploy
  - exposing the auth CSRF token route needed by production-safe smoke flows
  - updating `scripts/resolve-smoke-admin-token.mjs` to support CSRF-protected production login
- Relevant deployed commits during closure: `a9ef33c`, `83832c0`, `ca63731`
- GitHub push: PASS
- Render deployment: PASS
- Sentry dashboard verification: PASS

## Next Suggested Step
- Await owner direction for the next batch under single-batch closure mode.

## Update 2026-05-19 - BATCH 30C Final Closure
- Batch: `BATCH 30C - Course Visibility Contract (Admin -> Student)`
- Final status: `Fully closed`
- Implemented:
  - Added learner visibility smoke contract: `scripts/smoke-course-visibility-contract.mjs`
  - Added npm script: `smoke:course-visibility`
- Checks:
  - `npm --prefix server run build` PASS
  - `npm run typecheck` PASS
  - `npm run build` PASS
  - `npm run smoke:course-visibility` PASS
- Production verification:
  - `GET /api/content/bootstrap?scope=learning&phase=full` => 200, no visibility violations
  - `GET /api/courses` => 200, no publish/visibility/approval violations
  - Frontend: `https://almeaacodax.vercel.app/` => 200
  - Backend health: `https://almeaacodax-k2ux.onrender.com/api/health` => 200 (`ready=true`, commit `83832c0426e5`)
- Live visual verification (in-app browser):
  - Opened learner subject page on production and verified visible foundation topics render.
  - Opened topic modal (`???????? ????????`) and confirmed tabs/content (`????????`, `????????? ???????`, `??? ?????`) render correctly.
- Report:
  - `BATCH_30C_COURSE_VISIBILITY_CONTRACT_ADMIN_TO_STUDENT_2026-05-19_AR.md`
- Next suggested:
  - `BATCH 30D — Curriculum Import Scope Guard`

## Update 2026-05-19 - BATCH 30D Final Closure
- Batch: `BATCH 30D - Curriculum Import Scope Guard`
- Final status: `Fully closed`
- Implemented:
  - Added server-side curriculum import scope guard in `server/src/routes/course.routes.ts`.
  - Guard validates module lesson/quiz references stay within course `pathId/subjectId`.
  - Added smoke contract: `scripts/smoke-curriculum-import-scope-guard-contract.mjs`.
  - Added npm command: `smoke:curriculum-import-scope`.
- Checks:
  - `npm --prefix server run build` PASS
  - `npm run smoke:curriculum-import-scope` PASS
  - `npm run smoke:course-visibility` PASS
- Live production verification (owner request):
  - Added and verified a live course in learning space: `30D Visibility Course 1779142597180`.
  - Added and verified a live training quiz in learning space: `30D Training Quiz 1779142597180`.
  - Added and verified a live mock exam in learning space: `30D Mock Quiz 1779142597180`.
  - In-app browser visual verification passed for tabs: `???????`, `???????`, `??????????`.
- Production probes:
  - Frontend probe => 200
  - Backend health => 200 (`ready=true`, commit `83832c0426e5`)
- Report:
  - `BATCH_30D_CURRICULUM_IMPORT_SCOPE_GUARD_2026-05-19_AR.md`
