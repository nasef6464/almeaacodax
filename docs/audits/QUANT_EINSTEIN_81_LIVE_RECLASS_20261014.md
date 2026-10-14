# QUANT Einstein — verified heavy execution run, 2026-10-14

**Mode:** Original Einstein book pages → math concept → existing canonical skill ID → narrow Atlas field update, followed by read-only integrity audit. Production content and existing question IDs/images/answers/videos/entitlements untouched. The draft taxonomy PR is NOT approved for merge.

## Baseline and validated outcome

| Metric | Value |
|---|---:|
| FND26 Atlas question records | 858 |
| COL2627 Atlas question records | 946 |
| Total scoped Quant bank | **1,804** |
| Live main / subskills | **25 / 95** |
| Existing foundation main / child topics | **25 / 95** |
| COL2627 exact source-page / question-code coverage | **946 / 946** |
| Source-verified question **classification edits** this run | **81** |
| Question main/subskill parent mismatches after repair | **0** |
| Question IDs, image URLs, answer choices, topic and video modifications in this run | **0** |

The 946/946 number validates page+printed-number **identity**, NOT image crop, options, answer, or mathematical classification across all 946.

## Exact 81 metadata repairs completed in Atlas

| Source cohort | Count | Correction | Rollback manifest |
|---|---:|---|---|
| COL2627 p8 Q23–27 and p62 Q24 | 6 | Absolute value to existing algebra skill; triangle angle to triangle main | `COL2627_SOURCE_VERIFIED_SIX_FIXES_20261014.json` |
| COL2627 p8 Q28–29 | 2 | Units digit of powered sums, not division remainder | `COL2627_P008_UNITS_DIGIT_TWO_FIXES_20261014.json` |
| COL2627 p42–43 Q1–28 | 28 | Price, loss, profit, discount, savings, successive changes instead of inverse proportion | `COL2627_FINANCIAL_28_SOURCE_RECLASS_20261014.json` |
| COL2627 p39–41 Q1–44 | 44 | Percent basics / original value / percent changes / sales commission / mixes / decimal comparison instead of generic ratios | `COL2627_PERCENT_44_SOURCE_RECLASS_20261014.json` |
| COL2627 p7 Q08 | 1 | Divisibility tests for 2,3,5,7, not prime-factorization | `COL2627_P007_Q08_DIVISIBILITY_FIX_20261014.json` |

**All 81 records** have explicit original/new main and subskill ID values in manifests. Updates used questionCode + old skill pair + subject ID filters, with no upsert. Any rollback must first check current pair equals the committed new pair.

## Two educationally justified splits — NOT applied yet

1. `sub_quant_02_3` currently mixes *prime numbers/factorization* (14 documented question codes) and *GCD/LCM* (17). Keep the original stable ID with prime numbers; add a distinct brand-new subskill ID for GCD/LCM; point both to the existing `top_quant_sub_quant_02_3` topic, preserving media and entitlement.
2. `sub_quant_07_4` currently mixes *absolute value* (8 documented question codes) and *inequalities* (3). Keep old stable ID for inequalities; add unique subskill for absolute value; point both to existing `top_quant_sub_quant_07_4`.

Candidate outcome is **25 main / 97 subskills** while preserving **25 main / 95 child foundation topics**, with teacher-focused diagnostic detail and no extra student navigation clutter. These are source-backed *proposals* that need isolated dry-run, topic.skillIds support test, admin/teacher/student browser UAT, safe rollback, and owner release approval. **Never reuse retired ID `sub_quant_02_4`**, which was observed as a broken legacy reference before correction.

Source proof and all 42 relevant current question codes:
`ops/quant-skill-redesign/QUANT_TWO_SUBSKILL_SPLITS_SOURCE_CASE_20261014.json`.

## Important independent findings

- Two currently configured subskills have **zero** assigned FND26/COL2627 questions: `sub_quant_11_4` (estimation/gradual methods) and `sub_quant_18_3` (graphs and tables). Do not quietly delete them or show artificial mastery based on no questions. Review if they appear in the original books and existing lesson media.
- Book chapter headings are not a valid blanket classifier. E.g. COL2627 p32 contains GCD/LCM within a broader difference-of-squares section.
- COL2627 p53–55 has mixed mathematical concepts despite a clock-section heading, so evaluate each question by its true method.
- Source COL2627 PDF ends at p84 with solids question 11, no coordinates chapter, while the current FND26 taxonomy has seven coordinate questions. Do not invent missing compilation questions.
- Retain original Einstein foundation 146-page PDF's final corrections notice for pages 57, 89 and 104.
- NotebookLM candidate lists 29 main / 104 actual subskills while claiming 108; its Q aliases and page claims are not authoritative.

## Next execution order

1. Complete source-image primary skill QA for remaining COL2627 questions by page and rule; prioritize suspect chapter-to-skill mismatches, old broad strategy tags, and any examples crossing algebra, percent, or geometry.
2. Full FND26 source-first image/text/answer proof. Use numbered source page and original question code; do not equate valid IDs with correct classification.
3. Prepare a safe, no-production-write dry-run for the proposed two splits; test against a separate MongoDB instance and UI links.
4. Only after source-backed canonical-ID review and tests, apply minimal skill/topic/drill/report migrations. No physical deletion of foundation child topics; group visually for simpler navigation.
5. Preserve original books' rights/usage limitations and do not distribute their question pages or images.

**Never claim FINAL CLOSED from this report:** 81 corrected classifications, 1,804 ID-integrity checks, and 946 code-identity matches are distinct from comprehensive 1,804 question mathematical QA.
