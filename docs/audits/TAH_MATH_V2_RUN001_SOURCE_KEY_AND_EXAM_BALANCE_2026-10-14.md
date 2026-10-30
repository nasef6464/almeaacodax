# TAH-MATH V2 — RUN001 Evidence (2026-10-14)

## Scope and execution gate
- Subject: رياضيات التحصيلي ONLY, `sub_1777784609152`.
- Source: `كتاب تجميعات يلو للرياضيات 26 - المعدل.pdf` (160 pages); SHA-256 `d9efc97c1ba56d35ee79487129e1d3a983f665941c76054359ca62808ad10a47`.
- Distinguish **publisher-answer-key parity** from **independent mathematics** and **learner-facing R2 crop inspection**; do not mix them.
- Production question status remains `draft` (2,270). Rights and independent mathematical verification remain gates.

## Source-backed answer-key reconciliation
- Extracted PDF number/answer table using geometric pairs from actual PDF words: 2,250 question cells.
- 20 extra answer-key cells visually read at 3× from PDF pages 132 (19 cells) and 140 (1 cell).
- **2,270 / 2,270** published-book answer letters agree with the canonical 2026-10-13 V2 draft snapshot; no disagreements.
- Live Atlas `almeaa.questions` vs canonical snapshot answer-key parity also checked on all 2,270 codes using sorted FNV1a32:
  - ALL `7ab4ba3a` (2,270)
  - COL26 `913b7b80` (1,012)
  - COL26OLD `15542e4d` (1,258)
- **NOT 2,270 independently solved mathematical questions.** Actual source-only independent math checks: **6** (P005 Q01/Q03/Q04/Q07/Q08/Q14), stored in `tah_math_v2_staging.scientific_math_source_review`. Not a pass for R2 crop, answer options transcription, explanation, licensing or publication.
- Full row-wise source reconciliation and PDF extraction code are provided as separate RUN001 conversation evidence artifact.

## Defect repaired: non-representative standard tests
- Before: tests #53–57 had main-skill diversity 9, 8, 5, 3, 2, respectively, and one source each.
- Backed up 57 prior unpublished draft tests to `tah_math_v2_staging.tah_math_v2_run001_prior_exams_20261014`.
- Built 57 balanced draft tests as `tah_math_v2_staging.tah_math_v2_run001_balanced_exams_20261014`.
- Applied **only `questionIds`** to existing 57 `almeaa.quizzes` records; never changed publication state or subject scope.
- Live QA result: 2,270/2,270 distinct and resolved IDs, 0 duplicates, 40 questions per test (last 30), **21–29 distinct main skills per test**, both COL26 and COL26OLD represented in every test.
- First 5 free; remaining 52 paid. Every test remains `draft`, `isPublished=false`.
- Preserved 110 foundation drills and 61 main skill drills, and all other subjects.
- COL2627 in Quant still 939 approved + 7 rejected.

## Checkpoint and next action
- Mongo execution ledger: `tah_math_v2_staging.execution_ledger._id='TAH-MATH-V2-CLOSURE-RUN001-20261014'`.
- Planned automation: 9 hourly follow-on runs after RUN001 (10 total maximum).
- RUN002 MUST focus on actual mathematical content verification and source-option/explanation extraction + remote image/crop inspection. Do not rescan the 2,270 book keys or rebuild 57 tests unless new evidence forces it.
- Strict fail closed: no approval or publication without independent mathematics, readable options, explanations, precise R2 visual proof, licensing clearance and learner/staff E2E.
- Existing TAH-MATH PR #450 is OPEN/DRAFT and not yet mergeable; do not treat this evidence-only PR as enabling publication.

**Result:** meaningful execution complete, **NOT FINAL CLOSED**.
