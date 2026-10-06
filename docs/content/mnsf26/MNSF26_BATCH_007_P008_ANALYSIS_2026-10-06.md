# MNSF26 Batch 007 — Page 8 Question Analysis

Date: 2026-10-06
Source PDF page: 8
Source section: الاختبار الخامس — العمليات على الأعداد
Bank: MNSF26
Taxonomy: existing Quant 25/95 only

## Verified source
High-resolution render inspected directly from the source PDF. Page 8 contains printed questions 1–12.

## Records

### Q01 — SOURCE WORDING HOLD
Source: "إذا كانت هند تقرأ 3 قصص في 6 ساعات، قارن بين: القيمة الأولى: المدة التي تقرأ فيها صفحتين، القيمة الثانية: 8 ساعات."
The source mixes "قصص" with "صفحتين", so the rate cannot be transferred without an unstated story/page relationship.
- Answer: HOLD; do not guess.
- Taxonomy: HOLD.
- Difficulty: invalid-source wording.
- Fingerprint: unit-mismatch / rate-comparison / insufficient-data.
- Duplicate gate: no exact FND26/COL2627 text match.

### Q02
Source: ما هي أكبر قيمة يمكن الحصول عليها عند إضافة صفر للرقم 2345186؟
Options: بين 1 و8؛ بين 5 و1؛ بين 8 و6؛ بين 3 و4.
- Correct: بين 8 و6.
- Reason: among offered insertion points this keeps the more significant prefix largest; 23,451,806 exceeds the alternatives.
- Taxonomy: HOLD rather than force a nonmatching place-value subskill.
- Difficulty: Medium.
- Trap: assuming a zero always makes no change, or comparing only the local digits.
- Speech: "عند إدخال رقم داخل عدد نقارن من الخانة الأكبر؛ أول اختلاف يحسم العدد الأكبر."
- Question fingerprint: digit-insertion / maximize-positional-value / compare-place-values.
- Explanation fingerprint: build candidate numerals → compare lexicographically by place value.
- Duplicate: no exact hit.

### Q03
سلطان يوفر 2000 ريال شهرياً لشراء سيارة سعرها 28000 ريال.
- 28000 ÷ 2000 = 14 شهر.
- Correct: ج = 14.
- Mapping: skill_quant_10 / sub_quant_10_3 (الرواتب والادخار والمصاريف).
- Difficulty: Easy.
- Fingerprint: savings-goal / monthly-fixed-saving / months = target ÷ monthly.
- Duplicate: no exact hit.

### Q04
محمد 25 ريال، أحمد 20 ريال، نواف 25 ريال.
- Total = 70.
- Correct: ج = 70.
- Mapping: skill_quant_01 / sub_quant_01_1.
- Difficulty: Easy.
- Fingerprint: sum-three-amounts / mental-grouping.
- Trap: omit one repeated 25.
- Duplicate: no exact hit.

### Q05
الوردة الكبيرة 10 ريال، الصغيرة 4 ريالات؛ سعر 3 كبيرة و5 صغيرة؟
- 3×10 + 5×4 = 30 + 20 = 50.
- Correct: أ = 50.
- Mapping: skill_quant_10 / sub_quant_10_3 (مصاريف).
- Difficulty: Easy.
- Fingerprint: unit-price × quantity / mixed-purchase-total.
- Explanation: احسب تكلفة كل نوع منفرداً ثم اجمع.
- Duplicate: no exact hit.

### Q06
حافلة كان نصف مقاعدها فارغاً. نزل 3 وركب 5 فأصبح عدد الركاب 26.
- Before station: x - 3 + 5 = 26 => x = 24.
- Since half seats were occupied, total seats = 48.
- Correct: ج = 48.
- Mapping: skill_quant_07 / sub_quant_07_2.
- Difficulty: Medium.
- Trap: applying "half empty" after the station instead of before it.
- Fingerprint: reverse-linear-state / passenger-change / half-capacity.
- Duplicate: no exact hit.

### Q07
Cube faces numbered 1–6, thrown 6 times; add top numbers then divide by 3. Which cannot be result?
Options 13,12,11,10.
- Max possible sum = 6×6 = 36; max quotient = 12.
- Therefore 13 cannot occur.
- Correct: أ = 13.
- Mapping: skill_quant_18 / sub_quant_18_1 (فضاء العينة وحساب النواتج).
- Difficulty: Medium.
- Fingerprint: bounded-outcomes / repeated-die / impossibility-by-maximum.
- Duplicate: no exact hit.

### Q08
3 consecutive even numbers total 156; find sum of first two.
Let x,x+2,x+4. 3x+6=156 => x=50. First two = 102.
- Correct: ب = 102.
- Mapping: skill_quant_01 / sub_quant_01_3.
- Difficulty: Medium.
- Fingerprint: consecutive-even-sequence / total-to-first-term.
- Duplicate: no exact hit.

### Q09
محمد صعد قمة إيفرست ثم نزل، ارتفاع الجبل 8849 م. Compare total distance with 17698.
- 2×8849 = 17698.
- Correct: ج = equal.
- Mapping: skill_quant_01 / sub_quant_01_2.
- Difficulty: Easy.
- Trap: count only ascent.
- Fingerprint: out-and-back / double-one-way-distance.
- Duplicate: no exact hit.

### Q10
أحمد وخالد معهما 70 ريالاً. أعطى أحمد خالد 10 ريالات فأصبح ما معهما متساوياً. كم كان مع خالد؟
Let A+K=70, A-10=K+10 => A-K=20 => K=25.
- Correct: ب = 25.
- Mapping: skill_quant_07 / sub_quant_07_2.
- Difficulty: Medium.
- Fingerprint: transfer-between-two / invariant-total / equal-after-transfer.
- Duplicate: no exact hit.

### Q11
Class has 225 students seated in equal rows and columns as a square. How many rows?
- sqrt(225)=15.
- Correct: ب = 15.
- Mapping: skill_quant_06 / sub_quant_06_4 (root evaluation/recognition; closest canonical roots slot).
- Difficulty: Easy.
- Fingerprint: square-array / rows=columns / square-root-total.
- Duplicate: no exact hit.
- Taxonomy note: canonical taxonomy has no dedicated "basic square root" subskill; keep this mapping under QA review if stricter exactness is required.

### Q12
Wood split into 7 parts: two parts 12 cm each; remaining five are 9 cm each.
- Total = 2×12 + 5×9 = 24+45=69.
- Correct: ج = 69.
- Mapping: skill_quant_01 / sub_quant_01_2.
- Difficulty: Easy.
- Fingerprint: partitioned-length / repeated-addition / total-from-groups.
- Duplicate: no exact hit.

## Duplicate QA
Distinctive-phrase queries against production questions found 0 exact matches for all 12 source items. Structural analogs exist for generic arithmetic, savings, sequence, and linear-equation patterns but are not exact/semantic duplicates requiring suppression.

## Totals
- Source cards reviewed: 12/12
- Solved/answer locked: 11/12
- Source wording HOLD: 1 (Q01)
- Canonical mapping locked: 10
- Taxonomy HOLD: 1 (Q02)
- Mapping QA note: 1 (Q11)
- Exact duplicates found: 0
- New taxonomy entities: 0

## Crop gate
Source page has been rendered at 220 DPI and question regions are now recoverable from original pixels. Final production crop transformation must preserve original text/options, remove only the printed numeral inside the blue triangle while retaining the approved blank blue triangle, restore the dashed border, and trim excess whitespace. No regenerated Arabic/math text is permitted.
