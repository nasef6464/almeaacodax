# Load Testing

These scripts are for staging or production-like environments only. Do not run the 500/1000 user profiles against a free Render instance and then treat the result as a product failure.

## k6 Platform Journey

Install k6 locally, then run the pilot profile first:

```bash
k6 run load-tests/k6-platform-journey.js \
  -e LOAD_PROFILE=pilot \
  -e API_BASE=https://YOUR_RENDER_SERVICE.onrender.com/api \
  -e STUDENT_EMAIL=student@example.com \
  -e STUDENT_PASSWORD=StrongPassword123 \
  -e QUIZ_ID=quiz_id_optional \
  -e QUIZ_SOURCE=training
```

`LOAD_PROFILE` is deliberately one profile per run:

- `pilot`: ramps to 100 VUs.
- `scale500`: ramps to 500 VUs; run only on upgraded production-like infrastructure.
- `scale1000`: ramps to 1000 VUs; run only after the 500-VU gate passes and scale dependencies are ready.

This avoids the old behavior where invoking the script automatically scheduled 100, 500 and 1000 VU scenarios in one command. A pilot measurement must not silently become a 1000-VU test.

The script covers:

- `/api/health`
- `/api/content/bootstrap`
- `/api/taxonomy/bootstrap`
- `/api/auth/login`
- `/api/auth/me`
- `/api/quizzes/results`
- optional `/api/quizzes/:id/submit`

It records latency/error metrics plus `platform_response_body_bytes`, endpoint-tagged response-body byte counters, and bootstrap cache `hit`/`shared`/`miss` counters from the server's `X-Content-Cache` header. k6 transport metrics remain the source for received wire bytes; correlate both with provider egress/CPU/memory and database/Redis metrics rather than treating application body bytes as compressed network bytes.

Each profile writes its own summary file (`k6-platform-<profile>-summary.json`) so a later run does not overwrite evidence from a different scale tier.

## Autocannon endpoint runner

The legacy endpoint runner is also profile-gated. It never chooses a production target or reusable credential for you: `LOAD_API_BASE`, `LOAD_STUDENT_EMAIL`, and `LOAD_STUDENT_PASSWORD` are required explicitly.

```bash
LOAD_PROFILE=pilot \
LOAD_API_BASE=https://YOUR_STAGING_OR_PRODUCTION_LIKE_API/api \
LOAD_STUDENT_EMAIL=student@example.com \
LOAD_STUDENT_PASSWORD='<runtime secret>' \
node scripts/run-production-load-autocannon.mjs
```

Use `LOAD_PROFILE=pilot` by default; `scale500` and `scale1000` must be selected explicitly and are subject to the same infrastructure/readiness rules above. It writes `prod_load_<profile>_summary.json`, preventing one tier from overwriting another tier's evidence.

## Readiness Rules

- 100 concurrent users: pilot readiness.
- 500 concurrent users: paid launch minimum after Render and MongoDB are upgraded and Redis/scale-readiness is green.
- 1000 concurrent users: scaling decision gate after the 500-user profile passes.
- 10k users: requires staged tests, queue-backed notifications, upgraded Render/MongoDB, Redis-backed multi-instance behavior, and repeated successful runs.

Save each run summary in `load-tests/results/` and update `LOAD_TEST_REPORT.md` with p50/p95/p99 latency, error rate, request/response bytes, Render CPU/memory, MongoDB connection count/slow queries, Redis/queue/realtime observations, and cache/origin-egress evidence.

## Run Recording Template

```text
Date:
Git SHA / deployed release identity:
Environment:
Load profile:
Render plan / instance count:
MongoDB Atlas tier:
Redis provider:
Concurrent users:
Duration:
Request count:
Error rate:
p50 / p95 / p99:
Slowest endpoint:
Response body bytes / received wire bytes:
Repeated/duplicate payload observations:
Bootstrap cache hit/shared/miss evidence:
Origin egress / CDN cache evidence:
MongoDB connections:
MongoDB slow queries:
Redis connections / queue depth / realtime connections:
Render CPU / memory:
Decision:
Next action:
```

## Do Not Skip

- Verify the deployed release identity before interpreting a production-like run.
- Warm the backend once before the official warm run; record a cold run separately.
- Run `pilot` first. Never escalate automatically to `scale500` or `scale1000`.
- Do not run 500/1000 virtual users against a free Render service and treat that as a platform limit.
- Do not claim multi-instance scale readiness while `/api/health/scale-ready` is failing.
- Do not claim 10k readiness until repeated runs pass on upgraded infrastructure with provider metrics and reproducible evidence.
