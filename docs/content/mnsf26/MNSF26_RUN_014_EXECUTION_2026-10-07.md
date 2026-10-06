# MNSF26 Heavy Execution Run 014 — 2026-10-07

## Scope
MNSF26 only. Continued after exact-head reconciliation. No Batches 001–013 were reprocessed and no production import was attempted.

## Original-pixel recovery via repository
Searched repository code/content for MNSF26 webp assets, crop artifacts, the exact source filename, PENDING_ORIGINAL_PIXELS references, and questions/v2 MNSF26 asset paths. No repository-hosted original/cropped image artifact was found. This closes another safe recovery path without fabricating pixels.

## Source-index state revalidated from exact head
Arithmetic/algebra:
- tests: 63
- actual unresolved starts: 0
- every test currently has a startPdfPage and cropAllowed=true.

Geometry:
- tests: 50
- lessons: 11
- actual unresolved starts: 0
- every test currently has a startPdfPage and cropAllowed=true.

This confirms the earlier checkpoint counts (62/63 and 48/50) are stale relative to the branch's current source-index files.

## QA hardening
Arithmetic verifier:
- added declared-source-index-parity so discoveredStructure resolved/unresolved declarations must equal actual test entries;
- added strict increasing start-page validation to catch duplicated/backward test boundaries.
Commit: 71d033f5503e8cd5ccb7b128cbbc0ec81b5e1fad

Geometry verifier:
- added declared-source-index-parity;
- added lesson-test-membership-parity so the declared 11 lesson test lists must exactly match each test's lessonNumber.
Commit: f247006ab418f73081aadd22cfdfadfc626a596e

## Gate
Original source pixels remain mandatory. No crop, answer, source text, HOLD resolution, dry-run, canary, or production import was fabricated or bypassed.
