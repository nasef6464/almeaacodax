# Distributed classroom browser measurement plan

> Execute directly using the ALMEAA owner and goal-delivery rules. This is bounded measurement tooling, not product or runtime work.

**Goal:** Complete 24 real browser journeys on four independent GitHub runners using the existing trial roster, three existing five-question batches and an independently read 360-answer report.

**Architecture:** An opt-in dispatch mode in the existing Live Role workflow starts four workers, each with six independent browser contexts. A local teacher controller uses existing authorized APIs, protects active sessions and archives its owned trial on success or failure. Workers capture completed CDP bytes plus open stream bytes separately, never credentials or raw request bodies.

**Spec:** `docs/audits/CLASSROOM_JOIN_AND_MIXED_UI_2026-10-11.md`, remaining distributed-browser measurement.

**Constraints:** No production API/RBAC/scoring/data migration changes; no new accounts/questions; preserve historical results. Temporary secrets contain only existing trial accounts and are removed after use. Runs fail closed on absent credentials. No claim of physical tablets, all-host wire bytes or billed egress from browser CDP data.

**Files:** `scripts/classroom-distributed/{client,traffic,worker}.mjs`, existing `.github/workflows/platform-v3-live-role-gate.yml`; local controller and private fixtures remain scratch artifacts. Documentation/evidence enters main through exact-head CI and focused PR.

## Tasks
- [x] Guard credentials, session input and captured traffic against sensitive data; verify failing guards before implementation.
- [x] Adapt existing successful browser journey and CDP capture for six contexts per worker. Preserve normal cache behavior and open-stream accounting.
- [x] Add dispatch-only four-runner matrix; regular PR/push role gates remain unchanged.
- [x] Prepare the existing trial roster securely, dispatch branch workers and run bounded local teacher orchestration.
- [x] Archive the owned session; validate all four artifacts, all 24 actors, all three batches, source hashes and fresh report. Remove temporary secrets even on failure.
- [ ] Record measured counts and limits, run exact-head checks and merge focused tooling/evidence PR.

## Review focus
- Missing or malformed fixture fails before login.
- Wrong role/user/session never joins or submits.
- Live session predating this run is preserved.
- Pending stream data is separate from completed bytes, so no double counting.
- Errors and artifacts contain no credentials, cookies, tokens, query strings or raw bodies.
