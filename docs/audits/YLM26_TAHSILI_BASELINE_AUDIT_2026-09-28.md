# YLM26 Tahsili Mathematics — Source-Verified Baseline Audit — 2026-09-28

## Canonical inclusion rule
Only question blocks that visibly carry the dark-blue **تجميعات** badge are in scope.

## Source-verified count
A full visual scan of all 96 source pages found **326** such question blocks across the 30 lessons.

This is not a count of generic numbered examples. The detector targets the rendered Arabic word **تجميعات** itself. Representative pages were manually checked, including:
- page 5 = 3 badges
- page 6 = 4 badges
- page 8 = 4 badges
- page 10 = 5 badges
- page 90 = 9 badges

The 30 lesson totals also sum independently to **326**.

## Live state
MongoDB currently contains:
- 156 YLM26 records
- 156 draft
- 0 approved
- 0 pending
- 0 rejected
- 156 unique codes
- 156 unique image hashes
- 156 unique image URLs
- 0 quiz/mock-exam references

Therefore the current live set is **not a complete source import**.

## Source/live reconciliation
- source questions: 326
- live records: 156
- net gap: **170**
- page-level missing slots: 172
- page-level excess slots: 2
- excess pages: 5 and 6

The two excess identities are now explicitly flagged in reviewer notes:
- `TAH-MATH-YLM26-P005-Q04`
- `TAH-MATH-YLM26-P006-Q01`

## Content quality of current 156
- 30 have specific typed question content and concrete option values
- 126 still contain generic helper text / generic A-B-C-D AI option labels
- 16 source-backed skill mappings among the rich records have already been corrected in live MongoDB

## Safe state
All 156 records remain draft and are not referenced by student assessments.

## Required closure path
1. Preserve the pre-change snapshot.
2. Build the canonical 326-question source manifest from the visible تجميعات blocks.
3. Reconcile existing 156 images/identities to the manifest.
4. Replace or reject excess/incorrect identities.
5. Add the genuinely missing source questions.
6. Verify each item: image ↔ question ↔ choices ↔ answer ↔ solution ↔ main skill ↔ subskill.
7. Only then change verified records from draft to approved.

**Current verdict: YLM26 SOURCE AUDIT = RED / ACTIVE REPAIR.**
