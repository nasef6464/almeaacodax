# PLAN 2 — Production Closure / Runtime / DR / Governance Evidence

Baseline عند بدء PLAN 2:
`main@2d5572a9b0c5866ce0065fa3afd43c9b6cfd7b10`

الحالة: **IN PROGRESS — external owner / billing controls remain**

## #234 — Runtime integrations

### Redis — LIVE PASS
Render:
- API service: `almeaacodax-codex`
- service id: `srv-dalrk9oae00c73cd74t0`
- region: Frankfurt
- Redis: `almeaacodax-redis` / `red-dapchhbm8hqs739aikhg`
- Redis region: Frankfurt

PLAN 2 فعّل على Render:
- `RATE_LIMIT_REDIS_ENABLED=true`
- `NOTIFICATION_QUEUE_ENABLED=true`
- `NOTIFICATION_QUEUE_CONCURRENCY=5`

Live evidence بعد deploy `dep-daru6pjncjis73f4f0m0`:
- `/api/health/ready` -> HTTP 200
- `scaleReady=true`
- MongoDB pass
- Redis rate-limit pass
- Redis queue pass
- warnings=0
- `/api/health/scale-ready` -> HTTP 200 / `status=scale_ready` / blockers=[]
- startup logs:
  - `[redis] rate-limit connected`
  - `[redis] queue connected`
  - Socket Redis adapter enabled
  - notification realtime pub/sub connected
  - weekly report distributed scheduler registered for Sunday 08:00 Asia/Riyadh

### Google OAuth — LIVE START PASS
Live production request:
- `GET /api/auth/google/start` -> 302
- provider host: `accounts.google.com`
- callback URI:
  `https://almeaacodax-codex.onrender.com/api/auth/google/callback`
- state present.
- callback route exists and has safe failure redirect when code/state are absent.

Interactive Google consent/account exchange is not fabricated by automation.

### Sentry / R2 runtime configuration
`GET /api/operations/health` live snapshot after Redis activation:
- `sentryConfigured=true`
- `r2UploadEnabled=true`
- `r2Configured=true`
- `redisConfigured=true`
- `redisHealthy=true`

PLAN 2 adds:
- Google start/callback live smoke.
- one-time R2 presign -> PUT -> public GET -> SHA-256 proof on PLAN 2 merge.
- existing Sentry live test-event remains in Post Deploy Smoke.

Final #234 closure waits for the post-merge R2 and Sentry live evidence IDs/results.

## Post-deploy 429 diagnosis

Post Deploy run `36247908080` failed twice in `Frontend strict smoke` with 429 on health/taxonomy.

Evidence:
- same endpoints later return 200 through Vercel -> Render.
- the 429 requests were not present in Render 429 request logs nor Vercel runtime 429 logs.
- `smoke-frontend-routes.mjs` named its helper `fetchWithRetry` but treated every 4xx, including 429, as final and did not retry.

PLAN 2 fix:
- retry only transient 408/429/5xx.
- honor `Retry-After` with a bounded delay.
- identify `render` vs `vercel-edge` in retry diagnostics.
- keep ordinary non-retryable 4xx blocking.
- no production rate-limit weakening.

## #235 — Disaster Recovery

Repository implementation is present:
- scheduled workflow: `.github/workflows/production-dr-backup.yml`
- schedule: daily 01:17 UTC / 04:17 Riyadh
- verified MongoDB archive/checksum/manifest.
- R2 backup/inventory/checksum.
- independent off-site destination guard.
- restore scripts are fail-closed.

First real scheduled run:
- run id: `36222909358`
- result: **FAIL-CLOSED before mongodump**.
- all required secret-backed values were empty.

Missing GitHub Actions secrets:
1. `PRODUCTION_BACKUP_MONGODB_URI`
2. `PRODUCTION_R2_ENDPOINT`
3. `PRODUCTION_R2_BUCKET`
4. `PRODUCTION_R2_BACKUP_ACCESS_KEY_ID`
5. `PRODUCTION_R2_BACKUP_SECRET_ACCESS_KEY`
6. `DR_OFFSITE_ENDPOINT`
7. `DR_OFFSITE_BUCKET`
8. `DR_OFFSITE_ACCESS_KEY_ID`
9. `DR_OFFSITE_SECRET_ACCESS_KEY`

Do not invent these values.

### Frankfurt recovery cluster is not a full restore
Production Atlas:
- project: `almeaacodax`
- cluster: `almeaa`
- AWS Singapore `AP_SOUTHEAST_1`
- database `almeaa` size around 27 MB
- 66 collections.

Frankfurt recovery:
- project: `almeaacodax-eu-recovery`
- cluster: `almeaa-eu-recovery`
- AWS Frankfurt `EU_CENTRAL_1`
- database `almeaa` size below 1 MB
- 10 collections.

Sample parity:
- users: production 110 / recovery 0
- questions: production 391 / recovery 0
- quizzes: production 1 / recovery 0
- quizresults: production 4 / recovery 0
- courses: production 19 / recovery 5

Conclusion:
**No production cutover to the Frankfurt recovery cluster is allowed.**

#235 cannot close until secret-backed scheduled backup + independent copy + isolated full restore drill + measured RPO/RTO pass.

## #236 — Performance / topology / capacity

Current topology:
- Render API: Frankfurt.
- Render Redis: Frankfurt.
- Production MongoDB Atlas: Singapore.
- therefore API <-> DB remains cross-region.

Previously measured bounded production evidence:
- health ready p50 ~213.67 ms / p95 ~306.79 ms
- courses limit100 p50 ~509.07 ms / p95 ~1859.50 ms
- quizzes p50 ~202.49 ms / p95 ~534.75 ms
- content bootstrap learning-core p50 ~224.48 ms / p95 ~894.92 ms
- 0% request errors in that bounded sample.

Fresh Atlas health:
- open alerts: 0
- Performance Advisor suggested indexes: 0
- slow query logs returned: 0
- schema suggestions: 0.

Redis scale dependency is now green, but cross-region Mongo topology remains.

Safe options:
1. **Paid:** upgrade/move production Atlas from FREE to Flex/M10 in Frankfurt. This has billing impact and requires explicit owner approval.
2. **Migration:** full verified backup/restore to Frankfurt then controlled cutover with rollback. Current Frankfurt recovery is incomplete, so this must wait for #235 evidence.

No paid upgrade and no destructive cutover is executed implicitly.

## #237 — Governance / network

GitHub side was closed in PLAN 0:
- Ruleset `Protect main` active.
- main protected.
- PR required.
- force push blocked.
- deletion blocked.
- required exact-head checks enforced.

Atlas production access list currently contains:
- `74.220.48.0/24` — Render outbound range.
- `74.220.56.0/24` — Render outbound range.
- `37.42.169.169/32` — historical setup entry.
- **`0.0.0.0/0` — still open.**

Current Atlas connector can inspect/add entries but cannot delete an access-list entry.

#237 network exit remains:
- remove `0.0.0.0/0` using Atlas owner/admin control.
- immediately run production readiness/operational smoke after removal.
- preserve rollback path before narrowing.

## Exit state

Already PASS:
- GitHub delivery governance.
- Render release identity on current main.
- Managed Redis rate limit/queue/realtime/scheduler.
- Google OAuth start config.
- Sentry/R2 runtime configuration presence.
- Atlas current health/advisor inventory.

Still blocking PLAN 2 final closure:
1. #234 — R2 write/read proof and Sentry live event after PLAN 2 merge.
2. #235 — 9 DR secrets + successful scheduled backup + independent offsite copy + isolated restore drill + RPO/RTO.
3. #236 — co-located API/Mongo topology or evidence-backed controlled migration/approved paid upgrade.
4. #237 — remove Atlas `0.0.0.0/0` and smoke.

PLAN 3 must not start until these exit gates are resolved or Master Control explicitly changes the sequence.
