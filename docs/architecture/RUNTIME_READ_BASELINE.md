# ALMEAA — Runtime Read Baseline

## Status

**NOT PROVEN** for production scale. This is a repeatable, low-impact measurement harness; it is not a load certification and does not prove readiness for 80k questions, 30k users, or millions of attempts.

## Scope

The harness measures the public learner read path without authentication or writes:

1. taxonomy core — navigation shell;
2. taxonomy compact — learner skill classification;
3. learning content core — learner content shell;
4. first course catalog page.

For every endpoint it captures request status, duration, payload bytes, and existing cache headers. Its default is only **3 sequential requests per endpoint**, with a hard cap of 20. It does not include quiz submission, reports, question images, video delivery, or authenticated school data.

## Safe usage

Review the planned targets first:

```powershell
npm run measure:read-baseline:plan
```

Run it only against a local or staging environment that you are authorized to measure:

```powershell
node scripts/measure-read-baseline.mjs --base-url http://localhost:5000
```

Optional bounded settings:

```powershell
node scripts/measure-read-baseline.mjs --base-url http://localhost:5000 --requests 5 --timeout-ms 15000
```

لا تشغّل الأداة ضد الإنتاج أثناء الذروة أو كبديل عن اختبار تحميل معتمد. أي قياس إنتاجي يحتاج نافذة تشغيل وموافقة واضحة وخطة مراقبة وrollback.

## Evidence required before a scale claim

- environment specification: API instances, Mongo tier/indexes, Redis, region, CDN/cache;
- dataset shape: paths, skills, lessons, courses, questions, images, attempts/results;
- p50/p95/p99 latency, payload sizes, error rate, Mongo metrics, CPU/memory, Redis/queue metrics;
- staged concurrency profile and duration;
- pass/fail budgets agreed before the test;
- raw output attached to the release/architecture checkpoint.

The first later controlled test should cover learner bootstrap, question listing/search, quiz start/save/submit, result/report reads, notification fan-out, and school supervisor reports separately.
