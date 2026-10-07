# MNSF26 Run 020 — Geometry question-level materialization

## Exact-head safety
- main: 3aee9949bebe5b62a593760e76e4e02a55f9e2d2
- branch remained diverged; no force update and no synthetic merge was performed.
- before this run the branch was 123 commits ahead / 41 behind main.

## Heavy transition completed
The repaired 97-page geometry full-book coverage ledger was converted into a question-level work queue.

- confirmed visible geometry questions materialized: **931**
- source tests: **50/50**
- source lessons: **11/11**
- pages represented: **97/97**
- Test 24 Q18 is deliberately absent from the queue because rendered-source inspection proved it source-absent.
- all 931 records preserve the book's source lesson label before canonical mapping.
- all 931 remain fail-closed for exact embedded-pixel extraction, 25/95 mapping, dedupe, and R2 until those stages are actually completed.

## New gates
- `verify:mnsf26:geometry-fullbook`
- `verify:mnsf26:geometry-work-queue`

Both are now wired into `verify:mnsf26:all`, so future import work cannot silently bypass the 97-page geometry coverage contract or materialize hidden-XObject-only Test 24 Q18.

## Next execution target
Perform exact embedded-pixel extraction for the 931 geometry queue records (one question per lossless WebP, blank blue triangle, trim whitespace, preserve math/options, SHA-256), then source-skill-first canonical 25/95 mapping and cross-bank dedupe.
