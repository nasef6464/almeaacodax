# PLAN 4 — Data Model & Storage Hardening Evidence

Date: 2026-09-28
Baseline for final branch sync: main@20a77c62fd2db4ef891a574241f4cfd6946011de

## Live Atlas evidence

Read/write migration checks were executed against the active `almeaa` database using bounded, reversible operations.

- Legacy saved-list audit: 8 users, 28 legacy references.
- Question existence check for those references: 0/28 existed in the current question bank; all were orphaned legacy references.
- Rollback snapshot: 8 rows written to `migrationbackups` under migration key `PLAN4_LEGACY_SAVED_20260928`.
- Cleanup verification: 0 users retain non-empty legacy `favorites` or `reviewLater` arrays.
- Existing ReviewCard records were not deleted or rewritten by the cleanup.
- LessonProgress source audit: 110 users scanned; 4 users had legacy progress; 13 completed-lesson references; 0 interactive-video rows.
- Additive LessonProgress backfill: 13 normalized rows written.
- Shadow parity after backfill: 13/13 legacy completed-lesson references resolved to normalized completed rows.
- Historical QuizResult integrity: 6/6 stored results had internally consistent total/correct/wrong/unanswered vs questionReview facts.
- Question identity: 0 missing stable `id` values and 0 duplicate stable ids/question codes in the checked live bank.
- Document growth: User max 1,326 bytes (110 docs); QuizResult max 26,012 bytes, average 11,253 bytes (6 docs), max 19 review entries. Both are far below PLAN 4 guard budgets (512 KiB User / 1 MiB QuizResult).

## Code migration state

- LessonProgress normalized model + idempotent dual-write.
- `GET /auth/me` reads normalized progress when available and falls back to legacy User fields when no normalized rows exist.
- Mirror failures are contained; legacy writes remain rollback-compatible.
- Immutable/deduplicated QuestionRevision uses SHA-256 content identity and `$setOnInsert`.
- New quiz submissions attach revision identity while retaining legacy historical projection for compatibility/rollback.
- Existing assessment normalized models already store attempt/response/result facts separately; legacy QuizResult remains compatibility projection during the later removal window.
- No legacy historical QuizResult was rewritten or deleted.

## Rollback

- Saved-list cleanup can be restored from `migrationbackups` key `PLAN4_LEGACY_SAVED_20260928`.
- Legacy User progress fields remain present.
- QuizResult historical snapshots remain present.
- New normalized collections are additive and can be ignored by reverting the application read path.

## Closure rule

PLAN 4 is not green until the final PR head passes required CI and the merged production/runtime path is verified after deployment.
