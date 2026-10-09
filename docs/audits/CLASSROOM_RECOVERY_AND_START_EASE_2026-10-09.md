# Classroom recovery and teacher start ease — 2026-10-09

Status: PARTIAL. Production Redis/runtime recovery PASS; full classroom human-pressure certification not proved.

## Baseline and runtime proof
- Main37488e2fabbaf056a6bfd70165fa5a34f8c5b20d (#485), API/served frontend identity confirmed. Exact code head16689e346155c0d5aab0fe96a074ff247f6c1072 had19SUCCESS/3SKIPPED with all3 required gates PASS.
- Owner resumed existing Redis; resource status available on free plan. Canonical scale-ready200: database, Redis rate limiter and queue PASS; both Redis probes1ms. No paid plan, network rule or auth changes.
- Production API teacher, student and supervisor logins3/3 PASS; teacher console desktop/mobile read-only replay no page errors or page overflow. No production session/question/answer writes.
- Production active-session lookup without school is400; with authorized school is200. This establishes the frontend caller defect; the backend guard is retained.

## Focused improvements
- Visible assigned-class loading and recoverable workspace error; no workspace/active lookup refetch merely from class selection.
- Active-session lookup runs only for selected assigned school; stale scoped responses cannot navigate after school change.
- Single pending create, disabled target selectors, progress label and retry on failure. The normal empty class button says teaching can start now and questions can be sent later. Existing creation payload, API routes, authority and scores unchanged.
- Controlled real-component Playwright test asserts loading/error/retry, deep-link initial target, selector request counts, school-scoped active queries, locked create target, preserved creation payload and navigation. Added to existing required isolated full-stack workflow after Chromium installation.

## Evidence and limits
- Classroom contracts58/58 and hardening35/35 PASS; frontend typecheck and build are delivery gates. Build before final scoped-lookup change passed; exact final CI build must pass.
- Accounts are assigned to real school/class103 with24 roster students; full session writes await owner clarification that this class is a test fixture. No synthetic-isolation claim.
- Read-only teacher history summary200 was1,453,176 bytes (one observed read); further history payload reduction is deferred because current export/filter callers use question details. This is not a production peak or capacity measurement.
- Physical tablets,20 independent browser contexts and a newly saved five-question production report remain NOT PROVEN.
- Next: exact-head CI/PR delivery, read-only matching production UI verification, then approved test-class session and saved-report journey.
