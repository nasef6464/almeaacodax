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
