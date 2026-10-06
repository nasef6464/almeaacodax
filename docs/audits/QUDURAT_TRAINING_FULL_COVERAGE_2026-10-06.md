# Qudurat Quant Training Full Coverage — 2026-10-06

## Final production state

- Canonical quantitative source books:
  - FND26 approved: **856 / 856 used**
  - COL2627 approved: **939 / 939 used**
  - Total approved source questions: **1795 / 1795 used**
- Rejected source defects:
  - FND26 rejected: **2 / 2 excluded**
  - COL2627 rejected: **7 / 7 excluded**
  - Total rejected referenced by training: **0**
- Missing question references: **0**
- Duplicate question IDs inside any single training quiz: **0**

## Foundation access

- Main foundation topics: **25**
- Topics **1–5**: free
- Topics **6–25**: paid/package gated
- Subject-wide hard lock remains disabled so the granular topic policy is authoritative.

## Subskill training

- Subskill drills: **95**
- Range after source-first reconciliation: **9–15**
- **93/95** drills are at 10–15.
- Two verified exact-scope shortages remain at 9 because neither the source books nor the existing approved helper pool contains a tenth correctly mapped question:
  - `drill_sub_quant_13_2`
  - `drill_sub_quant_15_1`
- Existing approved `train_sub_quant_*` helpers are used only to fill source-backed shortages toward the minimum target.
- No new question documents were created in this reconciliation.

## Main-skill training

- Main-skill training cards: **39**
- Access: **39/39 paid**
- Range: **29–40**
- All but one are at 30–40.
- Verified source/helper ceiling:
  - `bank_skill_quant_15_g01`: **29** questions; no additional correctly mapped approved source/helper question exists without fabrication or remapping.
- Additional groups created only where required to absorb previously unused approved source questions without exceeding 40:
  - `bank_skill_quant_03_g03`
  - `bank_skill_quant_05_g03`
  - `bank_skill_quant_06_g03`
  - `bank_skill_quant_09_g02`
  - `bank_skill_quant_19_g02`
  - `bank_skill_quant_20_g03`

## Rollback

Full pre-reconciliation training snapshot:

`qudurat_rb_training_full_1795_20261006`

The snapshot contains the original **128** quantitative training quiz documents that existed before the full-coverage redistribution.

## Policy lock

Future reconciliation must preserve:

1. Approved canonical source questions first.
2. Rejected questions never enter training.
3. Existing approved helper questions may only fill subskill shortages toward the minimum target.
4. First five foundation topics remain free; later topics are paid.
5. All quantitative main-skill training remains paid.
6. No synthetic question creation is authorized by this reconciliation.
