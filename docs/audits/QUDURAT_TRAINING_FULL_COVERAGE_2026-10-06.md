# Qudurat Quant Training Full Coverage — 2026-10-06

## Final production state

- FND26 approved: **856 / 856 used**
- COL2627 approved: **939 / 939 used**
- Total approved canonical source questions: **1795 / 1795 used**
- FND26 rejected: **2 / 2 excluded**
- COL2627 rejected: **7 / 7 excluded**
- Rejected source questions referenced by training: **0**
- Missing question references: **0**
- Duplicate question IDs inside a single training quiz: **0**

## Foundation access

- Main foundation topics: **25**
- Topics **1–5**: free
- Topics **6–25**: paid/package gated
- Subskill drill access follows its foundation topic.

## Subskill training

- Subskill drills: **95**
- Final size range: **9–15**
- **93/95** are at 10–15.
- Two verified exact-scope shortages remain at 9 because neither the two source books nor the existing approved helper pool provides a tenth correctly mapped question:
  - `drill_sub_quant_13_2`
  - `drill_sub_quant_15_1`
- Approved existing QUDURAT-PRACTICE helpers are used only when canonical source questions are below the minimum target.
- No new question documents were created by this reconciliation.

## Main-skill training

- Main-skill training cards: **39**
- Access: **39/39 paid**
- Final size range: **29–40**
- One verified exact-scope ceiling remains:
  - `bank_skill_quant_15_g01`: **29** questions.
- Additional groups created only where required to absorb all previously unused approved source questions without exceeding 40:
  - `bank_skill_quant_03_g03`
  - `bank_skill_quant_05_g03`
  - `bank_skill_quant_06_g03`
  - `bank_skill_quant_09_g02`
  - `bank_skill_quant_19_g02`
  - `bank_skill_quant_20_g03`

## Rollback

Full pre-redistribution production snapshot:

`qudurat_rb_training_full_1795_20261006`

Snapshot size: **128** original quantitative training quiz documents.

Earlier access-only snapshot:

`qudurat_rb_quant_maintrain_paid_20261006_1831`

## Policy lock

Future reconciliation must preserve:

1. Quant canonical source questions come from **FND26 / COL2627** and must be **Approved**.
2. Rejected questions never enter quantitative foundation drills.
3. Existing approved QUDURAT-PRACTICE helper questions may only fill source shortages toward the minimum subskill target.
4. First five foundation topics remain free; topics 6–25 remain paid.
5. **All quantitative main-skill training remains paid**, including skills 1–5.
6. No synthetic/new question creation is authorized by this reconciliation.
