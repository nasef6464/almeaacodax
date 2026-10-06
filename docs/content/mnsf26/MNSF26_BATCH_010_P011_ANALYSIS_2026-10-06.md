# MNSF26 Batch 010 — Page 11 Question Analysis

Date: 2026-10-06
Source PDF page: 11
Bank: MNSF26
Taxonomy: existing Quant 25/95 only

## Verified source
High-resolution render from the original PDF was inspected visually. Page 11 contains printed questions 13–20, completing test 6.

### Q13
- Source: (6+4)/2.
- Answer: 5.
- Mapping: skill_quant_01 / sub_quant_01_4.
- Difficulty: Easy.
- Fingerprint: arithmetic-expression / parentheses-first / division.
- Explanation: نجمع داخل البسط 6+4=10 ثم نقسم على 2 فنحصل على 5.

### Q14
- Two brothers share project profits equally; each receives 2000 riyals. Compare total project profit with 5000.
- Total profit = 4000 < 5000.
- Correct: القيمة الثانية أكبر.
- Mapping: skill_quant_01 / sub_quant_01_2.
- Difficulty: Easy.
- Trap: compare one brother's share directly with 5000.
- Fingerprint: equal-share / reconstruct-total / quantitative-comparison.

### Q15
- Which expression equals 2121?
- Correct expression: 2000 + 100 + 20 + 1.
- Correct option: ب.
- Mapping: `skill_quant_01 / sub_quant_01_5` — إعادة بناء العدد من قيم منازله تقع ضمن أقرب تصنيف قانوني للقيمة المنزلية داخل 25/95، دون إنشاء مهارة جديدة.
- Difficulty: Easy.
- Fingerprint: expanded-form / place-value reconstruction.

### Q16
- Sum of three consecutive integers where the smallest integer is greater than 9.
- Smallest valid triple: 10,11,12; sum=33.
- Correct: 33.
- Mapping: skill_quant_01 / sub_quant_01_3.
- Difficulty: Easy.
- Fingerprint: consecutive-integers / minimum-condition / sum.

### Q17
- Teacher gifts 8 students; each gift costs 50. Price increases by 30 riyals. How many gifts can be bought with the same amount?
- Original budget=8×50=400; new price=80; 400÷80=5.
- Correct: 5.
- Mapping: skill_quant_10 / sub_quant_10_3.
- Difficulty: Medium.
- Trap: use 30 as new price instead of increase.
- Fingerprint: fixed-budget / price-increase / affordable-quantity.

### Q18
- Compare 4×4/2 with 15−5.
- First=8, second=10.
- Correct: القيمة الثانية أكبر.
- Mapping: skill_quant_01 / sub_quant_01_4.
- Difficulty: Easy.
- Fingerprint: arithmetic-comparison / operation-order.

### Q19
- Compare 44 with the source fraction 3636/9 (visually verified fraction is far greater than 44).
- Correct: القيمة الثانية أكبر.
- Mapping: `skill_quant_03 / sub_quant_03_3` — مقارنة كسر عددي بعدد صحيح. **Source transcription remains HOLD** حتى تثبيت أرقام البسط/المقام من crop الأصلي؛ الربط المهاري نفسه محسوم ولا يحتاج مهارة جديدة.
- Difficulty: Easy.
- Fingerprint: fraction-vs-integer / quantitative-comparison.
- QA note: do not import until exact numerator digits are transcribed from the production crop.

### Q20
- Two electric motors consume 200 W and 100 W per hour. Total hourly consumption?
- 300 W.
- Correct: 300.
- Mapping: skill_quant_01 / sub_quant_01_2.
- Difficulty: Easy.
- Fingerprint: additive-consumption / combine-rates.

## Duplicate QA
Distinctive-phrase searches against FND26/COL2627 returned no exact matches for page-11 source items.

## Totals
- Cards reviewed: 8/8
- Answers locked: 8/8
- Canonical mappings locked: 7
- Remaining HOLD: 1 (Q19 — exact source transcription QA only; taxonomy resolved to `skill_quant_03 / sub_quant_03_3`)
- Q15 canonical mapping resolved: `skill_quant_01 / sub_quant_01_5`
- Exact duplicates: 0
- New taxonomy entities: 0
