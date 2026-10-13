# Student data and report hardening — 2026-10-13

Status: implementation and final verification in progress; NOT production-certified.
Baseline: main `87d8a0e1bda766c7112c5b20268df9af8b07062a`. Branch: `codex/student-data-performance-hardening`. Owner authorized scoped security repair and database/bandwidth/server investigation.

## Boundaries and compatibility

- Directory and operational bootstrap reuse explicit class/school authority. A class parent is display context and does not confer sibling roster or school access-code authority. Canonical inactive school memberships override legacy assignments.
- Sensitive quiz-result, live-exam and authenticated bootstrap readers refresh the active principal before authorization/cache hits; nested middleware reuses that principal. Existing public bootstrap routes remain public.
- Routes, DTO keys, scoring, historic results, payments, media hosting and persisted semantics are retained. No production migration, retention deletion or paid infrastructure change.

## Bounded performance evidence

- Isolated fixture: 24 frozen sessions with 80 synthetic question payloads each, plus one legacy session. Teacher summary totals match. Returned ClassroomSession documents represented as JSON fell from 1,199,947 to 3,124 bytes. This measures these returned session documents, not all database traffic, CPU or provider billing. Legacy report construction has at most four operations in flight; historical sessions are not truncated.
- Learner submission invalidates only that learner's result-cache keys. Explicit global invalidation remains compatible. Prefix matching includes the delimiter.
- School skill aggregation preserves immutable evidence upserts and full cumulative sums. A bounded indexed lookup replaces window ranking of the entire history for the recent five. Identical isolated history fixture: 2,002 examined documents before and 1,006 after (1,001 cumulative + five recent); exact totals/recent mastery/trend, learner isolation, retry idempotency, non-school no-op and equal-date identical-score evidence PASS. Full cumulative history still requires one scan; this is not constant-time submission.
- Two read-only owned learner GETs on baseline publication: learning bootstrap gzip body 39,151 encoded / 301,110 decoded bytes; result history Brotli body 3,838 encoded / 39,021 decoded bytes. Raw encoded response bodies exclude headers/TLS/assets/streams/billing. Compression already works. Manually repeated probes do not prove repeated browser fetches.

## Limits and remaining verification

Production Render resource is on its existing free plan. Read-only metric endpoints returned empty time series; latency was unavailable for the current account tier. Empty data is not zero consumption. No CPU/RAM/egress-billing or 10,000-concurrent-user proof is claimed. Official free-plan limits: https://render.com/docs/free . No plan upgrade was made.

Local verification: 18 real Express/JWT/Mongo boundary groups PASS, scoped cache PASS, two teacher-report groups PASS, indexed school-skill behavior PASS, root/server typechecks and frontend build PASS. One fresh reviewer found subject-specific assignment overwriting; reproduced RED, repaired and regression GREEN, final review has no actionable findings. Exact-head CI and bounded published owned-fixture runtime remain pending. Local packages were restored after owner cleanup removed dependency files; application source remains intact. Generated audit files and primary-workspace changes from previous work are preserved outside this change.
