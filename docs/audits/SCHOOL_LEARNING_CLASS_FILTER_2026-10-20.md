# School learning material/class filter regression

Baseline main3b0655346e67b8e0de3fd5330e16540527125587; branch codex/learning-evidence-class-filter. Owner continuation of the approved subject-first school learning flow.

The teacher caller flattened all assignment classes without subject identity. The shared panel deduplicated those options without filtering and retained classId across subject/path changes. A valid teacher with material A/class A and material B/class B could select an invalid combination and receive the correct backend rejection.

Bounded correction: keep subjectId in teacher class options; filter matching/wildcard options before ID dedup; clear classId whenever material/path changes. Supervisor/director options without subject identity retain existing behavior. Backend scope, APIs, scoring, stored evidence and production data are unchanged.

Browser regression RED: actual math options included bio-class. GREEN390/1280 checks matching classes, wildcard access, shared-class dedup, material/path resets, and absence of stale class/material request pairs; retains previous source/race/error/retry checks. Independent read-only review has no actionable P1/P2. Frontend typecheck/build and exact-head CI/merge/published proof follow.

Final local UI390/1280,typecheck,production build and architecture gate PASS. Generated architecture artifacts preserved byte-for-byte. Independent review: no actionable P1/P2.
