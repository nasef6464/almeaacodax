# MNSF26 — live visual-source QA + image-hash collision control (2026-10-16)

**Status: NOT FINAL CLOSED**. Scope only Quant MNSF26 subjectId=`sub_1777779748206`, pathId=`p_1777779639431`. No Einstein drill, other subject, student result, assessment, or exam was changed.

## Read-before-write sources
- Arithmetic/algebra original PDF SHA256 `46f2d9c2c8482f99f3d28ea9fe2ae7cdaa1b62102a6cbe6aa35deae78c672ee3`, visual pages **zero-index 5, 7 and 9**.
- Geometry original PDF SHA256 `a823a90574476804cc29f5ca63ea8e9eaadab0cffe3afa78f791bbc8c6ee75d5`, visual pages **zero-index 5 and 6**.
- 10 unique source printed question positions received *independent* visual reading and mathematical solution this run; overlaps with any older audit are not counted as globally new.
- **Original R2 crops downloaded: 0; independent R2 SHA comparisons: 0**: public R2 host was inaccessible via the available tools. The imageHash property is a database claim, not an independently rehashed file.

## Ten source-backed production record repairs (10 modified, readback verified)
| Source key | Source mathematics | Change |
|---|---|---|
| AR-T006-Q14 | PDF says salary 2300, 3 months =6900 (أ), not 3200/9600 (د) | Original text corrected, key 3→0, real explanation, approved→draft |
| AR-T008-Q05 | 3 large flowers at 10 and 5 small at 5 =55; available options 50/60/70/80 | Placeholder replaced, explanation of invalid source choices, approved→draft; key remains unusable, not newly approved |
| GEO-T004-Q05 | ص+4ص+ص=180, ص=30 less than 42 => ب | Key 0→1, explanation, approved→draft |
| AR-T008-Q02 | Adding 0 between 8 and 6 in 2345186 gives largest value 23451806 => ج | Key 1→2, Arabic explanation, approved→draft |
| AR-T008-Q03 | Save 2000 monthly, price 28000 =>14 months (ج) | Replaced placeholder text and template explanation, stays draft |
| AR-T008-Q08 | Three consecutive even numbers sum156 =>50,52,54; first two sum102 (ب) | Replaced placeholder text/template explanation, stays draft |
| AR-T008-Q10 | Two people together70, transfer10 then equal; Khaled originally25 (ب) | Replaced placeholder text/template explanation, stays draft |
| GEO-T004-Q16 | Parallel corresponding angles س=ص, so 6ص>4س => ب | Key 0→1, explanation, approved→draft |
| AR-T010-Q01 | 150 split; equations imply Khaled30 => ج | Key 3→2, full text/explanation, approved→draft |
| AR-T010-Q10 | Three consecutive integers sum18 =>5,6,7; smallest5 => ب | Key 3→1, full text/explanation, stays draft |

Six answer keys corrected. Ten explanations corrected or replaced; seven full question texts corrected or filled. Six previously approved records placed on HOLD for R2/source certainty, while four existing drafts received mathematical improvements. All six held and associated draft rows remain unavailable to exams pending full visual R2 signoff.

## New image provenance risk audit
- **37 imageHash collision groups** across all 1,989 imported MNSF26 records; 78 total rows (41 extra), **22 groups** contain multiple distinct stored question texts (48 rows; 39 were approved before triage).
- Ten **high-risk, clearly cross-topic** groups were selected with a narrow, fully pre-checkpointed list. **19 approved/published rows** were conservatively set draft/unpublished to prevent potentially mismatched/question-wide image crops entering future tests. No answer key or skill was changed in this image-metadata hold.
- Other 12 differing-text hash groups remain **audit candidates**, not proof of wrong answers. Some repeated hashes may be legitimately repeated source questions, OCR/title variants, or broader shared images. They require original WEBP comparisons and a canonical-source decision.
- Before 19 holds: verified zero references in `quizzes.questionIds`, `assessmentversions.questionIds`, `assessmentattempts.questionIds` for the selected IDs. Conditional write required exact subject, path, original source keys, hashes and approved/published/no prior reviewer note. Update response matched=modified=19.

## GitHub immutable pre-write snapshots
- `docs/content/mnsf26/MNSF26_SOURCE_QA_BATCH5_PREWRITE_20261016.json`
- `docs/content/mnsf26/MNSF26_SOURCE_QA_BATCH5_ADDENDUM_PREWRITE_20261016.json`
- `docs/content/mnsf26/MNSF26_SOURCE_QA_BATCH5_GEO16_PREWRITE_20261016.json`
- `docs/content/mnsf26/MNSF26_SOURCE_QA_BATCH6_PREWRITE_20261016.json`
- `docs/content/mnsf26/MNSF26_R2_IMAGE_HASH_COLLISIONS_PREWRITE_20261016.json`

Each stores original text, keys, image hashes, fields and proof before the CAS changes. Restore only after source/R2 investigation, selecting the exact case and comparing to the pre-write snapshot; do not blanket-approve held items.

## Live Atlas readback after writes
- **1,989** imported MNSF26 question records.
- **1,673 approved + published**; **316 draft + unpublished**.
- **140** original source keys excluded from import and still unresolved.
- **58** remaining approved without an independently recorded cropStatus=VERIFIED; do not confuse this status with independent R2 hash verification.
- **19** records have the new `MNSF26_QA_HOLD_IMAGEHASH_COLLISION_B7` tag.
- No extra MNSF26 tests created or published. CI for source PR head queried; no GitHub workflow runs returned, so CI and student-E2E are **not PASS**.

## Remaining and next-run prioritization
1. Obtain original question-specific WEBP bytes by an approved GitHub Actions/R2 workflow; produce actual per-file SHA and visual crop galleries and compare against the two PDFs; solve mismatches first.
2. Scientifically resolve **316** held imported questions and **140** missing original source positions with exact original image, options, independent solution, skill/subskill and real explanation. The imported questions currently approved also need independent image/answer audit (not automatically certified by status).
3. Reconcile 12 remaining differing-text imageHash groups and historical 10 duplicate-fingerprint pairs, with source canonicalization and no accidental repeated item within one student exam.
4. Publish regular quantitative exams only after certified MNSF26 source QA with correct `assessmentversions`, security, access and actual student API tests. Einstein main/subskill drills remain untouched.

**Actual corrections and holds applied directly to Atlas using authorized connector; this PR contains evidence/checkpoints only. FINAL STATUS: NOT FINAL CLOSED.**
