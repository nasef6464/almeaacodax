# Classroom request read efficiency — 2026-10-10

Status: VERIFIED for request-scoped query reuse and the published submit-only API flow; overall performance and whole-project readiness PARTIAL.

## Scope and baseline

Preserve existing classroom behavior, security policy, results and free infrastructure. Reuse the 2026-10-09 trial-class benchmark: 24 independent trial students, three five-question batches, 360 persisted answers, 544 runtime HTTP requests; 89,671 compressed response-body bytes and 35,140 request-body bytes. Median 3,103ms, p95 11,339ms, maximum 33,724ms. Auth/setup/assets/socket traffic/TLS/headers excluded. These are response-body measurements, not total egress or browser/tablet certification. Existing ended session and records must remain untouched.

## Change

The active-auth middleware already refreshes the principal from Mongo for every request. Student routes previously reread the same user and repeated the school membership and SMART_CLASSROOM entitlement queries performed at the root guard. A small middleware read boundary reuses those inputs only within the same Express Request via a WeakMap. Context keys include user ID, role and legacy school ID; entitlement keys include school ID. Calls without the active-auth refresh marker retain the user database lookup. Errors fail closed; a new request retries and obtains fresh state.

For the normal single-school student path, access-input reads fall from two user + two membership + two contract queries to one each. The current-question endpoint's read budget falls from eight to five (including session and participant). Answer persistence, final-submit locks, question projection, teacher reads and all status/permission checks retain their behavior. This query reduction does not by itself establish a latency or network-byte improvement.

## Verification and closure

- Pure request isolation/concurrent reuse/key isolation/JWT fallback/error recovery/next-request revocation verification added to Smart Classroom CI.
- Isolated active-auth HTTP E2E asserts one user/membership/contract read per request for discovery and current questions, alongside existing account/membership/assignment/contract revocation checks.
- Exact-head required CI, published version/readiness and the primary submit-only bounded trial-class run PASS; details below. No broad production-scale, physical-device, billable bandwidth or paid-upgrade claim.

Next: address the separately owner-authorized shared-network login gap, preserving the prior benchmark and failed comparison evidence.

## Exact code and published evidence

- Runtime PR #516 final head `794ca03d68aad82119cd30faf09f467b582f647f`: 19 SUCCESS, three conditional SKIPPED, all three protected required checks PASS. Smart Classroom request isolation, HTTP query-count assertions, active-account/membership/assignment/module revocation, realtime delivery and finalized report immutability passed. Local server typecheck/build, 35/35 hardening and 58/58 live-journey contracts plus focused challenge/projector/report contracts passed. An old source-contract assertion was updated to follow the unchanged authoritative resolver through the new request boundary; the semantic assertion remains enforced.
- Protected runtime merge/published `0b3c469adb29c67e5f2884e4267a1de49dd6bacd`. Full Render live SHA, frontend SHA, canonical/direct health prefix match; database and both Redis checks PASS. All four main workflows SUCCESS.
- Published submit-only API flow: 24 independently authenticated trial accounts, three batches of five questions, 360 saved answers, 24 submissions per batch, answer/explanation withheld from current questions, and identical persisted final report after a fresh teacher login. All 184 runtime requests passed. Median 2,284ms, p95 4,318ms, maximum 5,799ms; 65,493 compressed response-body bytes and 26,140 request-body bytes. This follows the current UI's local answer selection and one final submission per batch, but excludes discovery/challenge/bootstrap/assets/socket traffic/headers/TLS and does not certify physical tablets or total bandwidth.

## Retained unsuccessful attempts and actual gaps

- The first comparison attempt reached 24/24 joins, then encountered an unrecorded non-JSON HTML response during the first batch. Its 123 recorded JSON responses are a partial run, not a successful load certificate. Only that owned new trial session was safely ended; all prior trial sessions/results were preserved. Initial harness Promise.all could leave concurrent requests in flight during failure cleanup; later harnesses drain each burst with allSettled before cleanup. A subsequent 404 observed during cleanup belongs to that failed attempt and is not hidden.
- Error/request logs contained no 5xx application error or restart/OOM event for that window. The targeted session log query returned 123 entries without further pages, including the cleanup 404. The non-JSON response's original HTTP status/body was not captured; its exact cause remains NOT_PROVEN. Later attempts record HTTP status/content type/platform marker/title before JSON parsing. No application retry conceals failed measured writes.
- A comparison setup retry stopped before session creation on authentication 429. Headers established the actual deployed limit: 20 attempts per source over the default 15-minute window, zero remaining, Retry-After 517 seconds. Local configuration value 500 is not production truth. The limit was respected without bypassing or changing authentication policy. Shared-network classroom entry and proxy source-key handling need a separate security-preserving review before a full-school readiness claim.
- A subsequent setup attempt honored the cooldown but encountered local UND_ERR_CONNECT_TIMEOUT to Vercel before API access; no business session was created. Setup then used HTTPS and privately retained successful normal-login sessions; reuse requires a normal authenticated /auth/me check. The submit-only run completed; report freshness still requires a genuine new teacher login. Setup/backoff is excluded from request latency/body statistics and failures are preserved separately.
- During the first failed run, shared Render sampling peaked at 0.0905339 cores against 0.15 and 178,159,620 bytes against 536,870,900. These observations are not exclusive attribution, CPU headroom under all production loads or total egress proof. Empty HTTP/bandwidth value series mean unavailable measurements, not zero usage.

The completed same-protocol 544-response attempt saved all 360 answers and ended the new trial class, but remained FAIL: 543 successful responses and one final-report GET HTTP502, text/html, Vercel marker, 223,038 compressed response-body bytes, 541ms. Total response-body bytes including the failure were 310,195; successful subset 87,157. Median1,906ms/p95=3,503ms/max4,502ms are observed cross-day measurements, not controlled causal attribution to query reuse. The failed run is not relabeled PASS.

Read-only recovery returned the same complete 24-student/360-answer persisted report from canonical/direct/canonical routes (200); ten subsequent report reads (five each route) also returned200 with complete reports. Original failure cause remains NOT_PROVEN. Final shared resource window peaked at0.12152617 CPU cores against0.15 and199,340,030 memory bytes against536,870,900. HTTP/egress metric values were unavailable, not zero. Physical classroom/tablet certification, unexplained intermittent gateway failure, total bandwidth and production-scale stability remain pending. Owner separately authorized the login policy fix after this evidence; see `CLASSROOM_SHARED_NETWORK_LOGIN_2026-10-10.md`.
