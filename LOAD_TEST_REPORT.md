# Load Test Report

## Status

Not executed yet in this sprint. The project now has the production-hardening checklist needed before formal pressure testing.

## Required Scenarios

- Login and session refresh.
- Home/bootstrap content loading.
- Student path and subject loading.
- Quiz start and submit.
- Student results page.
- Admin dashboard loading.

## Target Levels

- 100 concurrent students: pilot readiness.
- 500 concurrent students: paid launch minimum target.
- 1000 concurrent students: scaling decision point.

## Recommended Tools

- k6 for scenario-based traffic.
- autocannon for API endpoint pressure.
- Render and MongoDB metrics during the run.

## Output Needed

Each run should record latency p50/p95/p99, error rate, Render CPU/memory, MongoDB slow queries, and recommended scaling changes.

## Vercel Slowness Notes - 2026-05-12

The current Vercel slowness is expected from three main sources, and they need to be handled before claiming 10k+ user readiness:

- Frontend bundle size: the production build still reports large chunks, especially admin/video/dashboard-related bundles. This increases first-load time on slower devices and networks.
- Backend cold start: the Render free instance can spin down, so the first API request after inactivity may wait around 50 seconds before the server wakes.
- Runtime load readiness: 10k users needs measured capacity, not an assumption. The app needs repeatable load tests, upgraded Render capacity, MongoDB Atlas sizing, and queued background work for bulk notifications.

Latest local production build warnings:

- `assets/video-dash-*.js`: about 992.84 kB, gzip about 306.64 kB.
- `assets/AdminDashboard-*.js`: about 868.64 kB, gzip about 188.41 kB.
- `assets/firebase-*.js`: about 603.47 kB, gzip about 143.16 kB.
- `assets/video-hls-*.js`: about 522.87 kB, gzip about 161.72 kB.
- `assets/spreadsheet-*.js`: about 424.73 kB, gzip about 141.75 kB.

## 10k User Readiness Gate

The platform should not be described as ready for 10k concurrent users until all of these are complete:

- Render is upgraded from the free cold-start service and has CPU/memory sized from test data.
- MongoDB Atlas is on a tier with enough connections, indexes, backups, and slow-query monitoring.
- k6 or autocannon scenarios pass for login, bootstrap, path loading, quiz submit, package access, and admin dashboard.
- p95 response time stays acceptable under staged tests: 100, 500, 1000, then higher traffic.
- Bulk notifications and heavy admin work run through a queue instead of normal web requests.
- Frontend chunks are reviewed and admin-only/video-heavy code is not pulled into the first student load.

## Frontend First-Load Split - 2026-05-12

Closed the first code-level performance pass for video-heavy pages:

- `VideoModal`, `CoursePlayer`, and `CourseLanding` now lazy-load `CustomVideoPlayer` only when a video is actually opened or rendered.
- This prevents pages that merely import video-capable components from eagerly pulling the `react-player`, HLS, and DASH player stack into the first student route.
- Added `npm run smoke:performance` to guard this contract.

Remaining performance work before a 10k-user claim:

- Continue splitting admin-only dashboards and spreadsheet/reporting code.
- Measure real Vercel first-load and Render API timing after deployment.
- Run k6/autocannon against staging or production with the backend on a non-free Render instance.

## Reports Export Split - 2026-05-12

Closed the first reports-specific performance pass:

- `pages/Reports.tsx` no longer imports `xlsx` during normal report viewing.
- Excel generation now loads the spreadsheet library only when the user clicks an export button.
- `npm run smoke:performance` now guards both the video-player lazy-load contract and the reports Excel lazy-load contract.

Expected effect:

- Student and parent report pages keep the simple visual report experience without downloading the spreadsheet stack unless export is actually used.

## Admin Dashboard Split - 2026-05-12

Closed the first admin dashboard performance pass:

- `dashboards/admin/AdminDashboard.tsx` now lazy-loads heavy tab managers only when their tab is opened.
- The admin shell chunk dropped from roughly 868 kB to roughly 51 kB before gzip in the production build.
- Individual admin areas now compile into separate chunks such as `PathsManager`, `LessonsManager`, `QuestionBankManager`, `SchoolsManager`, and `FinancialManager`.

Expected effect:

- Opening the admin dashboard no longer downloads every admin tool at once.
- Teachers/supervisors/admins still get the same tabs and behavior, but inactive sections wait until selected.

## Vercel Cache Headers - 2026-05-12

Closed a production deployment speed issue:

- The old `vercel.json` used `Cache-Control: no-store` for every route, including hashed Vite assets.
- That forced browsers to redownload JavaScript, CSS, fonts, and images on repeat visits.
- Hashed assets now use `public, max-age=31536000, immutable`.
- The SPA HTML shell now uses `no-cache, max-age=0, must-revalidate` so users can still receive new deployments.
- Added `npm run smoke:deployment-cache` to prevent this regression.

Expected effect:

- First visit still depends on remaining large chunks and Render API wake-up.
- Repeat visits should be faster because Vercel/browser caching can finally reuse immutable assets.

## Load Test Scripts - 2026-05-12

Closed the first measurable load-testing gate:

- Added `load-tests/k6-platform-journey.js` with staged 100, 500, and 1000 virtual-user gates.
- The journey covers health, content bootstrap, taxonomy bootstrap, login, current user, student results, and optional quiz submission.
- Added `load-tests/README.md` with the exact environment variables needed to run against Render/staging.
- Added `npm run smoke:load-tests` to guard the test plan files.

How to run a real staging test:

```bash
k6 run load-tests/k6-platform-journey.js \
  -e API_BASE=https://YOUR_RENDER_SERVICE.onrender.com/api \
  -e STUDENT_EMAIL=student@example.com \
  -e STUDENT_PASSWORD=StrongPassword123 \
  -e QUIZ_ID=quiz_id_optional \
  -e QUIZ_SOURCE=training
```

Important production note:

- This does not prove 10k-user readiness by itself.
- It creates the repeatable measurement path needed before launch.
- Real 10k readiness still needs upgraded Render, MongoDB Atlas sizing, Redis/queue-backed notifications, and multiple staged runs with p95/p99 latency recorded.

## Monitoring Diagnostics - 2026-05-12

Closed the first backend observability gate:

- Added structured JSON request diagnostics for slow requests and failed requests.
- Added `SLOW_REQUEST_LOG_MS` so staging load tests can lower or raise the slow-request threshold without code changes.
- Added `REQUEST_LOG_LEVEL=debug` for short investigations when a page feels slow but no endpoint is obviously failing.
- Added `npm run smoke:monitoring` to guard that request bodies, passwords, tokens, cookies, and authorization headers are not logged.

How this helps load testing:

- During k6/autocannon runs, Render logs will now show which API path is slow and how long it took.
- If Vercel feels slow but Render logs show no slow API request, focus on frontend bundle/cache/cold-start behavior.
- If Render logs show slow API paths, optimize that endpoint and review the related MongoDB query/index.

## Database Index Sprint - 2026-05-12

Closed the first MongoDB index pass for the routes used in load tests:

- Learning bootstrap and subject pages now have supporting indexes for topics, lessons, library items, courses, and active announcements.
- Payment/package flows now have supporting indexes for payment requests, discount codes, packages, access codes, and user purchases.
- Admin/operations pages now have supporting indexes for audit logs, AI metrics, users, and groups.
- Added `DATABASE_REVIEW.md` and `npm run smoke:database`.

What this means for load tests:

- The app is better prepared for 100/500/1000-user measurement.
- This still does not certify 10k users; it removes obvious first-pass index gaps before real pressure testing.
