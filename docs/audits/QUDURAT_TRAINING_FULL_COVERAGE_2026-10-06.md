# Qudurat Quant Training Full Coverage — 2026-10-06

## Final production state

- FND26 approved: **856 / 856 used**
- COL2627 approved: **939 / 939 used**
- Total approved source questions: **1795 / 1795 used**
- Rejected source defects referenced by training: **0 / 9**
- Missing question references: **0**
- Duplicate question IDs inside any single training quiz: **0**

## Foundation access

- Main foundation topics: **25**
- Topics **1–5**: free
- Topics **6–25**: paid/package gated

## Subskill training

- Subskill drills: **95**
- Current size range: **9–15**
- **93/95** drills are at 10–15.
- Two exact-scope shortages remain at 9 because neither the canonical source books nor the existing approved helper pool contains a tenth correctly mapped question:
  - `drill_sub_quant_13_2`
  - `drill_sub_quant_15_1`
- Existing approved helper questions are used only to fill source shortages toward the minimum target.
- No new question documents were created.

## Main-skill training

- Main-skill training cards: **39**
- Access: **39/39 paid**
- Current size range: **29–40**
- One verified ceiling remains:
  - `bank_skill_quant_15_g01`: **29** questions; no additional correctly mapped approved source/helper question exists without fabrication or remapping.

### Added groups required for full source coverage

- `bank_skill_quant_03_g03`
- `bank_skill_quant_05_g03`
- `bank_skill_quant_06_g03`
- `bank_skill_quant_09_g02`
- `bank_skill_quant_19_g02`
- `bank_skill_quant_20_g03`

## Rollback

Full pre-redistribution training snapshot:

`qudurat_rb_training_full_1795_20261006`

Snapshot size: **128 quantitative training quiz documents**.

## Policy lock

Future reconciliation must preserve:

1. Approved canonical source questions first.
2. Quant canonical source questions are restricted to FND26 and COL2627.
3. Rejected questions never enter training.
4. Existing approved helper questions may only fill source shortages toward the minimum target.
5. First five foundation topics remain free; later topics are paid.
6. All quantitative main-skill training remains paid.
7. No synthetic question creation is authorized.
