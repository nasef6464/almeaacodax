# YLM26 Tahsili Mathematics — Corrected Baseline Audit — 2026-09-28

## Important correction
The earlier baseline incorrectly reported **326** questions. That number was produced by counting numbered learning material beyond the agreed import scope.

The agreed and canonical scope is strictly:

> **Only questions explicitly carrying the `تجميعات` marker in the source book.**

Examples, worked examples, rules, explanations, summary tables and other numbered learning material are **not** question-bank items.

Therefore the correct expected count is:

- **156 / 156 تجميعات questions**
- **No 170-question source gap**
- The import is complete by count.

## Source
- `كتاب تأسيس يلو للرياضيات 26 - النسخة المعدلة.pdf`
- 96 pages
- Document code: `YLM26`
- Path: `p_1777779653351`
- Subject: `sub_1777784609152`
- Canonical Tahsili Math taxonomy: **22 main skills / 70 subskills**

## Live import verification
MongoDB currently contains exactly **156 YLM26 records**, all unique:

- 156 total
- 156 draft
- 0 approved
- 0 pending
- 0 rejected
- 156 unique question codes
- 156 unique image hashes
- 156 unique image URLs
- 0 quiz/mock-exam references

Recorded batches total exactly 156:
- `TAH-MATH-YLM26-PILOT30-V1`: 30
- `TAH-MATH-YLM26-BATCH01-V1`: 30
- `TAH-MATH-YLM26-BATCH02-V1`: 41
- `TAH-MATH-YLM26-BATCH03-V1`: 55

## What remains
The task is **not to add more questions**. The task is now the same content-lock audit used for FND26, applied to the existing 156 only:

1. source page / canonical crop
2. question content
3. A/B/C/D option values in the image
4. correct answer key
5. worked solution / explanation
6. AI / voice context
7. main skill
8. subskill
9. source identity and R2 image evidence
10. approve only after source-backed verification

## Current data-quality note
The live records contain:
- 30 records with specific typed question content and concrete option text;
- 126 records with generic helper text and generic A/B/C/D AI option labels.

That does **not** mean those 126 questions are absent. They exist as source crops in R2 and must be audited against the book/image rather than reconstructed from unrelated material.

## Safety
All 156 records are still `draft`, and no quiz/mock exam references them. The full audit can therefore be completed without exposing an unverified question to students.

**Corrected verdict: YLM26 IMPORT COUNT = COMPLETE 156/156. CONTENT AUDIT = IN PROGRESS.**
