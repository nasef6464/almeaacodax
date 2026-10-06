# MNSF26 Batch 009 — Page 10 Question Analysis

Date: 2026-10-06
Source PDF page: 10
Source section: الاختبار السادس — العمليات على الأعداد
Bank: MNSF26
Taxonomy: existing Quant 25/95 only

## Verified source
Page 10 was rendered from the original PDF at high resolution and visually inspected. It contains printed questions 1–12.

### Q01
- Source summary: 150 ريال distributed among خالد، أحمد، ليان، روان، ماجد. أحمد وخالد معهما ثلثا المبلغ; روان معها نصف خالد; ليان معها ثلثا ما مع روان; ماجد معه ما مع روان وليان. Find خالد.
- Solve: أحمد+خالد=100. Let خالد=x. روان=x/2, ليان=x/3, ماجد=5x/6. Total gives 100 + 5x/3 =150, so x=30.
- Correct: 30.
- Mapping: `skill_quant_08 / sub_quant_08_1` — ratio partitioning.
- Difficulty: Hard.
- Trap: treating "ثلثا المبلغ" as each person separately rather than the stated pair.
- Fingerprint: multi-person-ratio-allocation / total-conservation / chained-fractions.
- Explanation fingerprint: convert verbal shares to algebraic fractions → preserve total → solve one variable.
- Duplicate: no exact FND26/COL2627 match.

### Q02
- Family: father+mother, two married sons, first has 2 boys+1 girl, second has 1 boy+3 girls.
- Count: 2 parents +2 sons +2 wives +3+4 grandchildren =13.
- Correct: 13.
- Mapping: `skill_quant_01 / sub_quant_01_2`.
- Difficulty: Easy/Medium.
- Trap: omitting the two wives or double-counting sons.
- Fingerprint: hierarchical-count / family-members / grouped-addition.
- Duplicate: no exact hit.

### Q03
- خديجة 24 ريال، عائشة 44 ريال. Compare double Khadija with Aisha.
- 2×24=48 >44.
- Correct: القيمة الأولى أكبر.
- Mapping: `skill_quant_01 / sub_quant_01_2`.
- Difficulty: Easy.
- Fingerprint: multiply-then-compare.
- Duplicate: no exact hit.

### Q04
- Worker gets 500 ريال/week +10 ريال per chair; 75 chairs in 5 weeks.
- Base pay: 5×500=2500. Piece pay:75×10=750. Total=3250.
- Correct: 3250.
- Mapping: `skill_quant_10 / sub_quant_10_3` — wages/income.
- Difficulty: Medium.
- Trap: forgetting either fixed weekly pay or per-chair pay.
- Fingerprint: fixed-pay-plus-commission / multi-period-income.
- Duplicate: no exact hit.

### Q05
- Train has 10 riders, 6 injured; car has 5 riders, 3 injured. Difference between uninjured riders?
- Train uninjured=4, car uninjured=2, difference=2.
- Correct: 2.
- Mapping: `skill_quant_01 / sub_quant_01_1`.
- Difficulty: Easy.
- Fingerprint: complement-count / compare-remainders.
- Duplicate: no exact hit.

### Q06
- Device writes 1000 words/minute. In 5 minutes?
- 1000×5=5000.
- Correct: 5000.
- Mapping: `skill_quant_08 / sub_quant_08_2` — direct proportion.
- Difficulty: Easy.
- Fingerprint: unit-rate × time.
- Duplicate: no exact hit.

### Q07
- If 3 pens = 7 pages, which statement is correct?
- Scaling by 4 gives 12 pens =28 pages.
- Correct: option أ.
- Mapping: `skill_quant_08 / sub_quant_08_2`.
- Difficulty: Medium.
- Fingerprint: equivalent-ratio / scale-both-terms.
- Duplicate: no exact hit.

### Q08
- Ahmed reads 15 pages first day and doubles daily; finishes in 4 days. Total pages?
- 15+30+60+120=225.
- Correct: 225.
- Mapping: `skill_quant_14 / sub_quant_14_4` — repeated multiplicative pattern.
- Difficulty: Medium.
- Trap: reporting day-4 pages (120) instead of total.
- Fingerprint: doubling-sequence / finite-sum.
- Duplicate: no exact hit.

### Q09
- 4 pens cost 8 riyals. Unit price?
- 8÷4=2.
- Correct: 2.
- Mapping: `skill_quant_10 / sub_quant_10_3`.
- Difficulty: Easy.
- Fingerprint: purchase-total / unit-price.
- Duplicate: no exact hit.

### Q10
- Sum of 3 consecutive numbers =18. Smallest?
- Middle=18÷3=6 => 5,6,7.
- Correct: 5.
- Mapping: `skill_quant_01 / sub_quant_01_3` — consecutive numbers.
- Difficulty: Easy.
- Fingerprint: consecutive-integers / known-sum / middle-as-average.
- Duplicate: no exact hit.

### Q11
- Bought 5 notebooks and 4 pens; notebook=4 ريال, pen=5 ريال.
- 5×4 +4×5 =20+20=40.
- Correct: 40.
- Mapping: `skill_quant_10 / sub_quant_10_3`.
- Difficulty: Easy.
- Fingerprint: mixed-purchase / quantity×unit-price / total-cost.
- Duplicate: no exact hit.

### Q12
- Trip cost 5400 ريال shared by 12 students. Compare what 4 students pay with 1800 ريال.
- Each=5400÷12=450. Four=1800.
- Correct: القيمتان متساويتان.
- Mapping: `skill_quant_08 / sub_quant_08_1` — equal proportional sharing.
- Difficulty: Medium.
- Trap: divide 5400 by 4 directly.
- Fingerprint: equal-share / subset-contribution / quantitative-comparison.
- Duplicate: no exact hit.

## QA totals
- Source cards visually verified: 12/12.
- Solved and answer locked: 12/12.
- Canonical mappings assigned: 12/12.
- Taxonomy HOLD: 0.
- Exact duplicate hits against FND26/COL2627: 0.
- New skills/subskills: 0.

## Next checkpoint
Proceed to PDF page 11, continuing test 6. Final production crop pass remains required for all accepted cards: preserve source pixels, remove only the printed question number from the blue triangle, retain the approved blank triangle, repair dashed border, and trim whitespace.
