# FND26 Question Bank Integrity Repair — 2026-09-28

## Scope
Live MongoDB Atlas audit and repair for `تاسيس انشتين معدل .pdf` (`FND26`) in General Aptitude / Quantitative.

- Path: `p_1777779639431`
- Subject: `sub_1777779748206`
- Canonical taxonomy: 25 main skills / 95 subskills
- FND26 live questions: 858

## Root cause
A legacy deployment script (`server/src/scripts/deployQuantTaxonomy25.ts`) contained a round-robin distribution step that deliberately spread questions across subskills instead of preserving content-based classification. That behavior could make coverage look complete while producing incorrect mappings.

The branch changes that script so it:
1. refuses to invent/reassign subskills,
2. validates each question's existing canonical subskill,
3. derives main skill and section from that canonical subskill,
4. normalizes redundant `skillId`, `subSkillId`, `skillIds`, and `sectionId` fields,
5. aborts on invalid/missing subskills.

## Live corrections applied
Content-based remaps were applied to confirmed FND26 mistakes while preserving questionCode, imageUrl, answer, question text, AI context, and approval state.

Confirmed correction groups:
- `sub_quant_10_4` — Zakat: 2 questions
- `sub_quant_09_4` — Compound percentage / successive discounts: 4 questions
- `sub_quant_11_2` — Reverse solving: 3 questions
- `sub_quant_11_3` — Drawing / visual representation: 6 questions
- `sub_quant_22_1` — Square perimeter/area: 13 questions
- `sub_quant_22_2` — Square from diagonal: 3 questions
- `sub_quant_22_3` — Nested/composite squares: 7 questions
- `sub_quant_23_1` — Parallelogram: 4 questions
- `sub_quant_23_2` — Rhombus: 5 questions
- `sub_quant_23_3` — Trapezoid: 3 questions
- `sub_quant_24_3` — Shaded areas: 7 questions
- `sub_quant_20_4` — Triangle area: 1 question

Total explicit content-based remaps above: 58 questions.

The remaining FND26 questions were normalized so their redundant taxonomy fields agree with the canonical parent/subskill relationship.

## Final live integrity checks
- 858 / 858 questions still present
- 858 / 858 approved
- 0 duplicate questionCode values
- 0 missing imageUrl
- 0 missing imageAlt
- 858 / 858 images point to the configured Cloudflare R2 public host
- 0 invalid correctOptionIndex values
- 0 questions with non-4-option structures
- 0 missing aiContext.readableText
- 0 missing aiContext.speechText
- 0 aiContext.optionTexts length mismatches
- 0 missing voiceExplanation.text
- 0 skill pair mismatches: `skillIds[0] === skillId` and `skillIds[1] === subSkillId`
- 0 section/main-skill mismatches
- `sourceMeta.documentCode = FND26` and canonical document title present across the book

## Answer verification
All 858 answer indices are structurally valid (0..3) and all questions have four canonical answer choices / four AI option texts.

A second independent consistency pass over the voice-teacher explanations found 745 questions whose explanation explicitly names the answer letter (ألف/باء/جيم/دال); all 745 agree with `correctOptionIndex` (0 mismatches).

The source PDF was used to spot-check the repaired sections, especially:
- Strategy chapter (reverse solving / trial / drawing)
- Square chapter
- Rhombus / parallelogram / trapezoid chapter

No answer field was changed during the taxonomy repair because no source-backed answer discrepancy was established.

## Coverage after repair
FND26 now covers **93 / 95** canonical quantitative subskills.

The only two uncovered subskills are:
1. `sub_quant_11_4` — التدرج المنتظم والتقريب البديهي
2. `sub_quant_18_3` — قراءة وتفسير الجداول والرسوم والقطاعات الدائرية

These were intentionally left uncovered rather than assigning unrelated questions just to make the counter 95/95. The FND26 strategy pages explicitly contain reverse solving, trial/substitution, and drawing; the probability/counting pages contain probability and counting questions, not a clear dedicated data/chart item.

## Metadata note
FND26 was imported in several historical batches, so some legacy `sourceMeta` aliases differ (`printedQuestionNumber`, `printedNumber`, `batch`, etc.). The canonical identity fields used operationally are intact (`questionCode`, documentCode/title/page, imageUrl, answer, taxonomy). No synthetic values were invented for historical fields whose original import provenance is not present.

## Evidence
- Pre-change snapshot: `docs/audits/FND26_INTEGRITY_REPAIR_PRECHANGE_2026-09-28.json`
- Preventive code fix: `server/src/scripts/deployQuantTaxonomy25.ts`
