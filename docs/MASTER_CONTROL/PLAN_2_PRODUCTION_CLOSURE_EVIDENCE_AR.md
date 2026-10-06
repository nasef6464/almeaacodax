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

### Final closure proof
- PR #273 merged as `d588f7db9e28187fb505e01134054b2d0bfce905`.
- Post Deploy run `36291061913`: SUCCESS.
- one-time R2 proof: presign -> PUT -> public GET -> SHA-256 verified.
- Sentry live event on that run: `b191aa4d95a14dccbe3e26d1110ff658`.
- latest main `3692581ba46362bc5c71714a83be7f3e9fa1a3e9` Post Deploy run `36295206954`: SUCCESS.
- latest Sentry event: `a32f9e20f795473ea79116cbbc5b8176`.

**#234: CLOSED ✅**

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

PLAN 2 source material is now configured. The first real post-configuration run was:

- run id: `36320284837`;
- commit: `ca8d710b6a7b84d641e00e8387ba3b163fda6432`;
- secrets/tooling validation: **PASS**;
- failure point: `Create verified MongoDB backup`;
- Atlas topology: `ReplicaSetNoPrimary`;
- all three Atlas nodes returned TLS `internal error`;
- GitHub-hosted runner region: Azure `centralus`.

This proves the remaining blocker is **not missing secret material**. Direct GitHub-hosted-runner → Atlas backup execution is incompatible with the hardened production Atlas allowlist, which intentionally permits current Render Frankfurt outbound ranges rather than arbitrary GitHub-hosted runner IPs.

The corrective architecture in PR #281 is:

1. A Frankfurt Render scheduled job runs `mongodump --archive --gzip` using the existing production runtime secret material and uploads archive/checksum/manifest plus an atomic `ready.json` marker under `dr-staging/mongodb/current/` in R2.
2. GitHub Actions requires that staged Mongo dump to be fresh (maximum age 2 hours), downloads and verifies it, then creates the full R2 media backup while excluding the staging prefix.
3. GitHub remains the independent failure domain: verified Mongo + R2 artifacts are uploaded to private GitHub Actions Artifact storage for 30 days with artifact digest.
4. The same GitHub run restores into disposable Mongo 8 and MinIO targets, checks representative Mongo data, exact media object-count parity and a stable key, then records RPO/RTO.

The five production source values remain controlled at runtime, but after this fix GitHub itself needs only the four R2 secrets; `MONGODB_URI` stays on Render. No `DR_OFFSITE_*` secrets are required. Do not reopen Atlas `0.0.0.0/0`.

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

#235 cannot close until the Render-staged Mongo backup plus GitHub independent copy + isolated full restore drill + measured RPO/RTO pass in a real runtime execution.

## #236 — Performance / topology / capacity

Current topology remains:
- Render API + Redis: Frankfurt.
- Production MongoDB Atlas: Singapore.

PLAN 2 nevertheless removed the application hot-path bottlenecks and produced current-release staged evidence on:
`main@3692581ba46362bc5c71714a83be7f3e9fa1a3e9`

Post Deploy run:
- `36295206954` — **SUCCESS**
- release identity exact
- readiness + scale readiness PASS
- operational journeys 71/71 PASS
- authenticated load PASS

Bounded read latency:
- health p50 206.64ms / p95 516.95ms
- courses p50 217ms / p95 1169.90ms
- quizzes p50 209.02ms / p95 538.81ms
- learning-core p50 208.91ms / p95 699.32ms
- error rate 0%.

Authenticated student read-load:
- concurrency 10 / 25 / 50
- 340 GET-only requests
- max allowed p95 2500ms / max error-rate 2%
- overall status: PASS
- actual error-rate: 0% everywhere.

At c=50:
- auth/me p50 719.19 / p95 1728.20 / p99 2418.08ms
- results p50 805.96 / p95 1226.04 / p99 1876.77ms
- courses p50 526.80 / p95 832.96 / p99 860.40ms
- learning-core p50 276.39 / p95 674.51 / p99 686.93ms

Learning-core improvement:
- c25 p95: 2695.25ms -> 303.39ms
- c50 p95: 4889.23ms -> 674.51ms

Redis multi-instance coordination is proven green.

Closure decision:
- Issue #236 criterion 1 explicitly allows co-location **or** material end-to-end latency reduction.
- PLAN 2 satisfied the alternate path with current-release authenticated staged evidence.
- Redis scale coordination is green.
- p50/p95/p99 and error-rate are recorded.
- no 500/1000-user capacity claim is made.
- Frankfurt↔Singapore remains infrastructure optimization debt only.

**#236: CLOSED ✅**

## #237 — Governance / network

GitHub side was closed in PLAN 0:
- Ruleset `Protect main` active.
- main protected.
- PR required.
- force push blocked.
- deletion blocked.
- required exact-head checks enforced.

Atlas network closure:
- initial deletion of `0.0.0.0/0` exposed that the previously documented Render CIDRs `74.220.48.0/24` and `74.220.56.0/24` were stale/incomplete;
- the broad entry was rolled back immediately and production recovered;
- current Render Frankfurt outbound ranges were read from **Connect → Outbound**:
  - `74.220.51.0/24`
  - `74.220.59.0/24`
- both were added before the second narrowing;
- `0.0.0.0/0` was then removed;
- a full redeploy of exact production SHA `f737f81af480951dcb54c78f72b4b028909e9a43` forced a fresh Mongo connection;
- Render deploy `dep-dasd18t9fdbs73cu3d30` reached `live`;
- fresh startup logs show `[database] MongoDB connected`, Redis connected, API listening and service live.

Final Atlas list contains no broad public CIDR.

**#237: CLOSED ✅**

## Exit state

Already PASS:
- GitHub delivery governance.
- Render release identity on current main.
- Managed Redis rate limit/queue/realtime/scheduler.
- Google OAuth start config.
- Sentry/R2 runtime configuration presence.
- Atlas current health/advisor inventory.

Still blocking PLAN 2 final closure:
1. #235 — merge/provision the Render-staged Mongo source path from PR #281, then obtain one successful real end-to-end run with independent GitHub Artifact + isolated Mongo/R2 restore drill + measured RPO/RTO.

Closed in PLAN 2:
- #234 Runtime integrations ✅
- #236 Performance / topology / capacity ✅
- #237 Governance / network ✅

PLAN 3 must not start until these exit gates are resolved or Master Control explicitly changes the sequence.
