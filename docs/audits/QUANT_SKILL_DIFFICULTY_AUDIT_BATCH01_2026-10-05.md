# Quant Skill Mapping + Difficulty Audit — Batch 01

Date: 2026-10-05  
Branch: `audit/quant-skill-mapping-2026-10-05`  
Scope: COL2627 printed pages 5–6, questions 1–30.

## Source mapping basis

- FND26 rule 1 = الإشارات -> `sub_quant_01_1`.
- FND26 rule 2 = جمع الأعداد بطريقة التجميع الذكي -> `sub_quant_01_1`.
- FND26 rule 3 = جمع الأعداد المتكررة -> `sub_quant_01_2`.
- FND26 rule 4 = العامل المشترك -> `sub_quant_01_2`.
- FND26 rules 5–8 = الزوجي/الفردي والمتتاليات ومجاميعها -> `sub_quant_01_3`.
- FND26 rule 9 = ترتيب العمليات -> `sub_quant_01_4`.

## Difficulty rubric

The production schema supports `Easy | Medium | Hard`; use all three rather than forcing borderline questions into only two buckets.

- Easy: direct application of one known rule; little interpretation; one short computation.
- Medium: two or more linked steps, comparison, pattern recognition, or a longer calculation.
- Hard: reverse construction/search, several interacting operations/rules, or substantially higher reasoning load than neighboring items.

## Verified target rows

| Code | Target subskill | Difficulty | Mapping action |
|---|---|---|---|
| QDR-QNT-COL2627-P005-Q01 | sub_quant_01_1 | Easy | keep |
| QDR-QNT-COL2627-P005-Q02 | sub_quant_01_1 | Easy | keep |
| QDR-QNT-COL2627-P005-Q03 | sub_quant_01_1 | Medium | **fix from sub_quant_01_3** |
| QDR-QNT-COL2627-P005-Q04 | sub_quant_01_1 | Medium | keep |
| QDR-QNT-COL2627-P005-Q05 | sub_quant_01_1 | Medium | keep |
| QDR-QNT-COL2627-P005-Q06 | sub_quant_01_1 | Easy | **fix from sub_quant_01_3** |
| QDR-QNT-COL2627-P005-Q07 | sub_quant_01_1 | Hard | **fix from sub_quant_01_3** |
| QDR-QNT-COL2627-P005-Q08 | sub_quant_01_1 | Medium | **fix from sub_quant_01_3** |
| QDR-QNT-COL2627-P005-Q09 | sub_quant_01_2 | Easy | keep |
| QDR-QNT-COL2627-P005-Q10 | sub_quant_01_2 | Easy | keep |
| QDR-QNT-COL2627-P005-Q11 | sub_quant_01_2 | Easy | keep |
| QDR-QNT-COL2627-P005-Q12 | sub_quant_01_2 | Medium | keep |
| QDR-QNT-COL2627-P005-Q13 | sub_quant_01_2 | Medium | **fix from sub_quant_01_1** |
| QDR-QNT-COL2627-P005-Q14 | sub_quant_01_3 | Medium | keep |
| QDR-QNT-COL2627-P006-Q15 | sub_quant_01_3 | Medium | keep |
| QDR-QNT-COL2627-P006-Q16 | sub_quant_01_3 | Medium | keep |
| QDR-QNT-COL2627-P006-Q17 | sub_quant_01_3 | Easy | keep |
| QDR-QNT-COL2627-P006-Q18 | sub_quant_01_3 | Easy | keep |
| QDR-QNT-COL2627-P006-Q19 | sub_quant_01_3 | Easy | keep |
| QDR-QNT-COL2627-P006-Q20 | sub_quant_01_3 | Easy | keep |
| QDR-QNT-COL2627-P006-Q21 | sub_quant_01_3 | Medium | keep |
| QDR-QNT-COL2627-P006-Q22 | sub_quant_01_3 | Medium | keep |
| QDR-QNT-COL2627-P006-Q23 | sub_quant_01_3 | Medium | keep |
| QDR-QNT-COL2627-P006-Q24 | sub_quant_01_4 | Easy | keep |
| QDR-QNT-COL2627-P006-Q25 | sub_quant_01_4 | Easy | keep |
| QDR-QNT-COL2627-P006-Q26 | sub_quant_01_4 | Medium | keep |
| QDR-QNT-COL2627-P006-Q27 | sub_quant_01_4 | Medium | keep |
| QDR-QNT-COL2627-P006-Q28 | sub_quant_01_4 | Medium | keep |
| QDR-QNT-COL2627-P006-Q29 | sub_quant_01_4 | Medium | keep |
| QDR-QNT-COL2627-P006-Q30 | sub_quant_01_4 | Hard | keep |

## First-batch findings

- The existing bank had all 30 difficulty values defaulted to `Medium`; this is not a meaningful difficulty classification.
- Five source-rule mapping defects were confirmed in this first batch:
  - P005-Q03 -> 01.1
  - P005-Q06 -> 01.1
  - P005-Q07 -> 01.1
  - P005-Q08 -> 01.1
  - P005-Q13 -> 01.2
- P006-Q24..Q30 are already correctly mapped to `sub_quant_01_4` (ترتيب العمليات), so they must remain there.
