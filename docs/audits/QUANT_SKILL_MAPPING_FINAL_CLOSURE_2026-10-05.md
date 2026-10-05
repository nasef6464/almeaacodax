# Quant Skill Mapping Audit — FINAL CLOSURE — 2026-10-05

## Scope
Repository: `nasef6464/almeaacodax`
Audit branch: `audit/quant-skill-mapping-2026-10-05`
Issue: #368
Sources:
- FND26 — `تاسيس انشتين معدل .pdf`
- COL2627 — `تجميع انشيتن معدل(1).pdf`

## Closure status
**CLOSED — 1804 / 1804 semantically reviewed.**

Final live Atlas inventory:
- FND26 = **858**
- COL2627 = **946**
- Total = **1804**

The final continuation audited the exact **720 remaining questions**:
- FND26: all remaining non-strategy pages after the prior checkpoint (510 questions).
- COL2627: pages 63–84 (210 questions).
- FND26 strategy pages 70–74 (36 questions) were already source-locked and verified in the earlier source-precedence batch, so they were not double-counted.

## Audit rule
The source is authoritative in this order:
1. lesson/section,
2. explicit rule number,
3. questions placed under that rule,
4. real mathematical idea for mixed/technical cases.

Keyword-only remapping is forbidden.

This rule is especially locked for strategy sections: a question explicitly placed under a strategy rule is not moved to a technical skill merely because its wording contains a technical keyword.

## Final source-range sweep
The final 720 records were loaded from Atlas and checked against source lesson/rule boundaries.

Result:
- reviewed = **720**
- source-range outliers = **0**
- missing `skillId` = **0**
- missing `subSkillId` = **0**
- invalid/missing `difficulty` = **0**
- `skillIds` mismatch = **0**

Cross-skill source-authorized bridge cases (for example zakat questions inside the ratio/proportion flow) were retained only where the mathematical target is explicitly the financial/zakat skill.

## Confirmed final remaps in the closure pass
The following keyword-driven / generic-section mistakes were corrected on live Atlas:

1. `QDR-QNT-FND26-P088-Q17`
   - from strategy shortcut
   - to `skill_quant_07 / sub_quant_07_2`
   - reason: direct linear equation in the source word-problem rule.
   - difficulty: Easy.

2. `QDR-QNT-FND26-P088-Q18`
   - from financial keyword classification
   - to `skill_quant_07 / sub_quant_07_2`
   - reason: the mathematical target is `x + 2x = 111`, not financial arithmetic.
   - difficulty: Easy.

3. `QDR-QNT-FND26-P088-Q19`
   - from profit/loss keyword classification
   - to `skill_quant_08 / sub_quant_08_1`
   - reason: proportional distribution (whole/half/quarter relation), not profit/loss.
   - difficulty: Medium.

4. `QDR-QNT-FND26-P088-Q20`
   - from profit/loss keyword classification
   - to `skill_quant_08 / sub_quant_08_1`
   - reason: ratio 3:1 with total 72.
   - difficulty: Easy.

5. `QDR-QNT-COL2627-P079-Q11`
   - from `skill_quant_11 / sub_quant_11_3`
   - to `skill_quant_23 / sub_quant_23_3`
   - reason: source places the question inside the rhombus/parallelogram/trapezoid technical lesson; drawing is part of the geometry, not the target strategy.

All five records were re-read after write and their `skillIds` arrays match the canonical pair.

## Previously confirmed corrections preserved
Earlier batches remain locked, including:
- `COL2627-P017-Q01 -> skill_quant_04 / sub_quant_04_2`
- `COL2627-P017-Q02 -> skill_quant_04 / sub_quant_04_1`
- Batch 01–04 source corrections.
- Strategy source-precedence corrections in FND26 and COL2627.

## Strategy source-precedence locks — live verification
Exact live Atlas counts:

COL2627:
- P44 / 11.1 = 10
- P44 / 11.2 = 7
- P45 / 11.1 = 15
- P46 / 11.1 = 8
- P46 / 11.3 = 2

FND26:
- P70 / 11.1 = 3
- P70 / 11.2 = 3
- P71 / 11.1 = 8
- P72 / 11.1 = 8
- P73 / 11.1 = 8
- P74 / 11.3 = 6

These locks explicitly prevent future keyword-only remapping of strategy questions.

## Final Atlas consistency gate
Live aggregation after all writes:

### COL2627
- total = 946
- missing skill = 0
- missing subskill = 0
- invalid difficulty = 0
- skillIds mismatch = 0

### FND26
- total = 858
- missing skill = 0
- missing subskill = 0
- invalid difficulty = 0
- skillIds mismatch = 0

Taxonomy parent validation:
- every `subSkillId` resolves under its declared `skillId`
- parent mismatch = 0

## Regression gate
Added:
- `scripts/verify-quant-skill-mapping-regression.mjs`
- npm command: `npm run smoke:quant-skill-mapping`

The gate fails if any of the following regress:
- total != 1804
- FND26 != 858
- COL2627 != 946
- missing/invalid skill, subskill, or difficulty
- `skillIds !== [skillId, subSkillId]`
- subskill parent mismatch
- source-precedence strategy counts drift
- high-risk corrected anchors drift

Regression script syntax was validated with `node --check`.
The live Atlas equivalent of the regression assertions was executed after the final write and passed.

Regression commits:
- `e9f044b1c071f4ecaa3d7626a87ac8cd64dd2a2a`
- `f69211286d0be738ef6fe01cfdbe58fe6b78a791`

## Closure policy
This scope is closed.
Do not reopen FND26/COL2627 skill mapping from heuristics, keyword matching, or a new bulk migration.
A future change must first present a reproducible source/regression failure and update the regression gate together with the correction.
