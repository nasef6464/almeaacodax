# Tahsili Math — Semantic Audit Batch 01 — 2026-09-29

Scope: first lesson **المنطق والتبرير والبرهان**, source-checked directly against both PDFs.

## Records checked
- YLM26 foundation visible compilations: 7 questions (printed pages 5–6).
- COL26 section I: 18 questions (printed pages 5–6).
- Total reviewed: **25**.

## Answer-key result
All **25/25** current `correctOptionIndex` values agree with the visible source answer keys for this batch.

## Semantic subskill result
The existing tags are structurally valid IDs, but they are not reliable semantic classifications.

Canonical subskills:
- `sub_tah_math_01_01` — العبارات المنطقية وقيم الصواب والعبارات الشرطية
- `sub_tah_math_01_02` — الاستدلال والبرهان والمجموعات

### YLM26
Recommended source-based classification:
- P005-Q01 → 01_02 (counterexample / reasoning)
- P005-Q02 → 01_01
- P005-Q03 → 01_01
- P006-Q04 → 01_01
- P006-Q05 → 01_01
- P006-Q06 → 01_01
- P006-Q07 → 01_02 (Venn / set intersection)

Existing semantic mismatches in this seven-question batch: **4/7**.

### COL26
Recommended source-based classification:
- Q01–Q06 → 01_02 (patterns / counterexamples / reasoning)
- Q07–Q14 → 01_01 (truth values / conditionals / equivalence)
- Q15–Q18 → 01_02 (deductive reasoning / Venn / set relations)

Existing semantic mismatches in this eighteen-question batch: **9/18**.

## Batch conclusion
- answer import for this batch is source-consistent;
- semantic subskill tagging is **not trustworthy as imported**;
- combined semantic mismatch rate in this source-checked sample: **13/25**;
- therefore the full 1258-question Tahsili set requires source-based semantic retagging question by question; mechanical distribution must not be preserved.

No production tags were changed in this batch. This is discovery evidence only.


## Applied to production Atlas
The 13 source-proven semantic mismatches above were applied while keeping every record in `draft`.

Backup / rollback key:
`TAHSILI_MATH_SEMANTIC_AUDIT_BATCH01_20260929`

Each prechange snapshot stores:
- questionCode
- source document / printed page / printed question
- imageHash
- correctOptionIndex
- old subskill
- new subskill
- original document
- canonical fingerprint: `questionCode|imageHash|answerIndex|targetSubSkill`

Applied retags:
- YLM26 P005-Q01 → `sub_tah_math_01_02`
- YLM26 P006-Q04 → `sub_tah_math_01_01`
- YLM26 P006-Q05 → `sub_tah_math_01_01`
- YLM26 P006-Q06 → `sub_tah_math_01_01`
- COL26 P005-Q01 → `sub_tah_math_01_02`
- COL26 P005-Q03 → `sub_tah_math_01_02`
- COL26 P005-Q05 → `sub_tah_math_01_02`
- COL26 P005-Q08 → `sub_tah_math_01_01`
- COL26 P005-Q10 → `sub_tah_math_01_01`
- COL26 P005-Q12 → `sub_tah_math_01_01`
- COL26 P005-Q14 → `sub_tah_math_01_01`
- COL26 P006-Q15 → `sub_tah_math_01_02`
- COL26 P006-Q17 → `sub_tah_math_01_02`

Postcondition verified:
- 13/13 now carry the intended canonical subskill.
- main skill and section remain `skill_tah_math_01` / `sec_tah_math_01`.
- source image hashes unchanged.
- answer indexes unchanged.
- approval status remains `draft`.
