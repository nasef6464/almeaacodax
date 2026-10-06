# MNSF26 Batch 012 — Page 13 Question Analysis

Date: 2026-10-06
Source PDF page: 13
Bank: MNSF26
Taxonomy: existing Quant 25/95 only.

## Verified source
High-resolution page render inspected directly from the original PDF. Page 13 contains printed questions 14–20, continuing test 7.

### Q14
- أسماء توفر 12 ريال في اليوم. قارن بين ما توفره في 22 يوماً وبين 276 ريال.
- 12×22 =264 <276.
- Correct: القيمة الثانية أكبر.
- Mapping: skill_quant_10 / sub_quant_10_3.
- Difficulty: Easy.
- Fingerprint: fixed-daily-saving / quantitative-comparison.
- Duplicate: no exact FND26/COL2627 hit.

### Q15 — SOURCE MATH TRANSCRIPTION HOLD
- Algebraic fraction/equation is visually present, but numerator/denominator symbol order is not sufficiently unambiguous for a certified transcription from the source crop.
- Options: 13,14,15,16.
- Do not guess the expression or answer.
- Mapping: HOLD.
- Required action: dedicated production crop/manual math-symbol verification before import.
- Fingerprint: algebraic-fraction / solve-for-variable.

### Q16
- شخص يمشي 16 كم يومياً. كم كيلومتراً يمشي في 20 يوماً؟
- 16×20 =320.
- Correct: 320.
- Mapping: skill_quant_08 / sub_quant_08_2.
- Difficulty: Easy.
- Fingerprint: unit-rate × time.
- Duplicate: no exact hit.

### Q17
- 2×2 grid contains 2,4,8 and unknown. Pattern doubles down each column: 2→4 and 4→8 depending reading orientation; consistent missing value =4.
- Correct: 4.
- Mapping: skill_quant_14 / sub_quant_14_4.
- Difficulty: Easy.
- Fingerprint: visual-number-pattern / doubling.
- QA note: preserve grid orientation in crop.
- Duplicate: no exact hit.

### Q18
- أي مما يلي الناتج يكون 7؟
- Correct relation in the source options: 91÷13 =7.
- Correct option: أ.
- Mapping: HOLD — plain integer division has no exact dedicated canonical subskill in the approved 25/95 taxonomy.
- Difficulty: Easy.
- Fingerprint: quotient-recognition / integer-division.

### Q19
- أحمد و6 من أصدقائه تناولوا العشاء، فاتورة المطعم 3710 ريال، والدفع متساوٍ. Compare one person's share with 530.
- Persons =7; 3710÷7=530.
- Correct: القيمتان متساويتان.
- Mapping: skill_quant_08 / sub_quant_08_1.
- Difficulty: Easy/Medium.
- Fingerprint: equal-sharing / hidden-group-size / quantitative-comparison.
- External duplicate gate: no exact FND26/COL2627 match found.
- Intra-MNSF duplicate gate: strong semantic/structural duplicate candidate of Batch 006 page-7 Q19 (same total 3710, seven persons, share 530); do not import both as independent unique questions without duplicate-policy resolution.

### Q20
- 115 شخصاً للتخييم، في كل خيمة 5 أشخاص.
- 115÷5=23.
- Correct: 23.
- Mapping: skill_quant_08 / sub_quant_08_2.
- Difficulty: Easy.
- Fingerprint: equal-grouping / total-to-group-count.
- Duplicate: no exact external hit.

## QA totals
- Source cards reviewed: 7/7
- Answer locked: 6/7
- Source math HOLD: 1 (Q15)
- Canonical mappings locked: 5
- Taxonomy HOLD: 1 (Q18)
- External exact duplicates FND26/COL2627: 0
- Intra-MNSF semantic duplicate candidates: 1 (Q19 ↔ Batch006 Q19)
- New taxonomy entities: 0
