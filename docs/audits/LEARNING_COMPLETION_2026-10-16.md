# Learning completion — 2026-10-16
Status VERIFIED_SCOPED; baseline4939594d. Published source cbecbe90 / merge c059bb3a / PR562; final source CI20SUCCESS/4conditionalSKIP/all3requiredPASS. Owner approved tab counts and whole main-topic completion.
- Completion means a saved quiz result, independently of score. Repeated attempts count once. No scoring/result/history writes.
- Full scoped catalog is counted server-side; UI-loaded page size does not determine totals. Public visibility/audience/active-path rules apply. No answers or other learners results returned.
- Subject training/tests use visible explicit placements, matching current learning tabs. Path-only scope is true mocks. Paid access buckets let the UI keep locked counts separate from currently available denominator.
- Main-topic total is the unique union of visible lesson IDs and attached usable quizzes across all visible descendants. Hidden subtrees excluded; zero-unit topics are not complete. Percent on the outside card includes both lessons and quizzes. Top foundation counter counts completed main topics, not lessons.
- Reuses current normalized lesson progress precedence and legacy fallback. No new persisted progress state, migration/index/backfill.
- Student-only no-store GET, scope/user generation fence, response errors/retry, refresh after own completion and visibility return (30s throttle), no continuous polling.
- Pure regression and isolated HTTP with251visible training quizzes, retries0score, caller isolation, main75percent, hidden subtree, mock-only scope and inactive/anonymous denial PASS. Browser component retry and unlocked3/10, foundation1/2, locked separation and390/1280 PASS.
- Independent review found missing active-path gate and ambiguous path-only semantics; fixed gate and limited path-only query to mocks. Frontend review caught premature rounded100% and dropped training completion/rank props; both fixed. Final types/CI and published read-only verification PASS.
- Exact counting scans scoped matching quizzes and verifies usability in200raw batches; this is not proof of production-scale capacity. No production mutations during this task.

Architecture registry: owner-approved own-student read-only route/mount added as two exact product extensions; immutable baseline and gate behavior retained. Initial CI detected the missing registrations; no existing route signature removed.

Published evidence: LEARNING_COMPLETION_PUBLISHED_2026-10-16.json. Actual own-student foundation/training/tests/mock summaries and anonymous denial passed;1280visual/390overflow checks passed;0production content/progress/result writes. Existing indexes reviewed with no blocking finding; scope size and mock path alias performance remain unproven at production scale.
