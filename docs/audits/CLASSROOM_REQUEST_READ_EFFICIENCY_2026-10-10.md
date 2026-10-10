# Classroom request read efficiency — 2026-10-10

Status: IN_PROGRESS; whole-project readiness PARTIAL.

## Scope and baseline

Preserve existing classroom behavior, security policy, results and free infrastructure. Reuse the 2026-10-09 trial-class benchmark: 24 independent trial students, three five-question batches, 360 persisted answers, 544 runtime HTTP requests; 89,671 compressed response-body bytes and 35,140 request-body bytes. Median 3,103ms, p95 11,339ms, maximum 33,724ms. Auth/setup/assets/socket traffic/TLS/headers excluded. These are response-body measurements, not total egress or browser/tablet certification. Existing ended session and records must remain untouched.

## Change

The active-auth middleware already refreshes the principal from Mongo for every request. Student routes previously reread the same user and repeated the school membership and SMART_CLASSROOM entitlement queries performed at the root guard. A small middleware read boundary reuses those inputs only within the same Express Request via a WeakMap. Context keys include user ID, role and legacy school ID; entitlement keys include school ID. Calls without the active-auth refresh marker retain the user database lookup. Errors fail closed; a new request retries and obtains fresh state.

For the normal single-school student path, access-input reads fall from two user + two membership + two contract queries to one each. The current-question endpoint's read budget falls from eight to five (including session and participant). Answer persistence, final-submit locks, question projection, teacher reads and all status/permission checks retain their behavior. This query reduction does not by itself establish a latency or network-byte improvement.

## Verification and closure

- Pure request isolation/concurrent reuse/key isolation/JWT fallback/error recovery/next-request revocation verification added to Smart Classroom CI.
- Isolated active-auth HTTP E2E asserts one user/membership/contract read per request for discovery and current questions, alongside existing account/membership/assignment/contract revocation checks.
- Exact-head required CI, published version/readiness and a new bounded trial-class run are pending. No broad production-scale, physical-device, billable bandwidth or paid-upgrade claim.

Next: finish focused CI, merge through protected PR, verify published version, run the existing trial-class protocol into new evidence files, and preserve the prior benchmark.
