# Assessment catalog parity and ordering — 2026-10-16

Status: IN_PROGRESS; exact-head CI and published verification pending.
Baseline: main f31c8d7a; branch codex/assessment-catalog-parity.

## Verified root cause
Global bootstrap loads only the first200quizzes. The learner subject loader fetches scoped records separately; the admin panel previously used bootstrap alone. Read-only production samples: scoped biology100 had93missing globally; quantitative100/100missing; verbal98/98missing; maths100/100missing; physics100/0missing; chemistry100/99missing. These bounded samples are not full inventory counts.

## Implementation
- Staff scoped training/tests/mock classification filter, preserving existing authorization/audience filters. Matching learningPlacements include hidden records; true mocks remain path-scoped.
- Shared100/page scoped loader with explicit more/retry, stale-scope fencing and preservation of concurrent local edits. No background all-platform crawl.
- Horizontal path mock cards; editor opens on Add/Edit. Existing IDs and questions reused. Per-record preview/publication/access/delete/order actions.
- Subject cards recover scoped quizzes, hidden placements and free/package controls. Showing a draft passes publication validation and surfaces failure.
- Optional displayPriority1..1000000, inverted numeric UI order1..1000000; explicit order precedes defaults for staff/learners and before server pagination. Ties retain prior client stable ordering; server date/id gives deterministic pages. Unset values keep existing automatic behavior. No scoring/history changes or backfill.
- Three additive non-sparse Quiz indexes: global, path prefix, path+subject prefix followed by displayPriority/createdAt/_id descending. Reviewer found no blocking index/data risk. Explain proves only simplified path+subject ordered query, not every compound classification/learner scan. Index installation on production and capacity are not yet proven.

## Evidence
- Red reproduction: old panel omitted scoped published training outside global200.
- Isolated HTTP:251quizzes across3pages, no omission/duplicate, explicit training placement, foreign mock isolation, saved learner priority PASS. Expanded draft publication assertion added for CI.
- Actual MockExamManager harness: list→add→private empty draft→package→withdrawal PASS.
- Vite build PASS. Classification9, placement6, source22contract groups PASS.
- Independent UI review found draft Show needed isPublished:true; fixed without bypassing publication validation.
- Local final types/UI retries encountered Windows virtual memory exhaustion; must use final CI rather than infer success from empty logs.
- No production content/result mutation. Four unrelated generated architecture files and all private scratch files preserved.

## Remaining
Final scoped UI/types/server/build/regression CI on exact source; normal PR merge; automatic deployment and bounded real-admin read-only catalog verification. No production-scale claim.
