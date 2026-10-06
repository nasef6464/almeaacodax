# MNSF26 Batch 013 — Page 14 Question Analysis

Date: 2026-10-06
Source PDF page: 14
Source section: الاختبار الثامن — العمليات على الأعداد
Bank: MNSF26
Taxonomy: existing Quant 25/95 only.

## Verified source
High-resolution render inspected directly from original PDF. Page 14 contains printed questions 1–13.

### Q01
- Equation: 8 □ 3 □ 1 = 6.
- Valid operation sequence: 8 − 3 + 1 = 6.
- Correct: subtraction then addition.
- Mapping: skill_quant_01 / sub_quant_01_4.
- Difficulty: Easy.
- Fingerprint: fill-operators / target-value / operation-order.

### Q02
- 24 pages, 68 words per page.
- 24×68=1632.
- Correct: 1632.
- Mapping: skill_quant_08 / sub_quant_08_2.
- Difficulty: Easy.
- Fingerprint: unit-rate × quantity.

### Q03
- Compare (6+3)/3 with 8/(1+1).
- First=3, second=4.
- Correct: القيمة الثانية أكبر.
- Mapping: skill_quant_01 / sub_quant_01_4.
- Difficulty: Easy.
- Fingerprint: fraction-expression comparison.

### Q04
- Driver covers 280 km/day for 31 days.
- 280×31=8680 km.
- Correct: 8680.
- Mapping: skill_quant_08 / sub_quant_08_2.
- Difficulty: Easy.
- Fingerprint: daily-distance × days.

### Q05
- 288 kg dates shared equally into 6 bags.
- 288÷6=48 kg.
- Correct: 48.
- Mapping: skill_quant_08 / sub_quant_08_1.
- Difficulty: Easy.
- Fingerprint: equal-sharing / total-to-unit.

### Q06
- Building has 19 floors. From Ahmed's original floor: if he goes up 4 floors, floors below become twice floors above; if he goes down 2 floors, floors above become twice floors below.
- Let original floor=x.
- Up case: x+3 =2(15−x) => x=9. Down case confirms: 21−x=2(x−3) => x=9.
- Correct: 9th floor.
- Mapping: skill_quant_07 / sub_quant_07_2.
- Difficulty: Hard.
- Fingerprint: two-state-floor-count / linear-equation consistency.
- Trap: count current floor among above/below floors.

### Q07
- Leila + four friends =5 people produce 100 cake molds weekly. One is absent.
- Equal productivity => 100÷5=20 each; 4 people produce 80.
- Correct: 80.
- Mapping: skill_quant_08 / sub_quant_08_2.
- Difficulty: Medium.
- Fingerprint: workforce-proportion / equal-productivity.
- Source visual confirmed 100 (not 20).

### Q08 — QUARANTINED SOURCE DEFECT
- Source states: 30 egg cartons, each carton 12 trays, each tray 30 eggs, and "between every 3 trays there are 9 spoiled eggs", then asks "how many spoiled trays?"
- The premise gives spoiled eggs, not a rule that defines a whole tray as spoiled, so the requested "number of spoiled trays" is not derivable without an unstated assumption.
- Status: **QUARANTINE_SOURCE_DEFECT** — لا يُستورد كسؤال صالح لأن وحدة المعطى (بيض فاسد) لا تطابق وحدة المطلوب (أطباق فاسدة)، ولا توجد قاعدة في النص لتحويل إحداهما إلى الأخرى.
- Answer: لا توجد إجابة قابلة للاعتماد من النص الحالي؛ لا تخمّن من الخيارات 12/24/36/48.
- Taxonomy: لا يلزم ربط إنتاجي لسجل محجور؛ يبقى خارج import candidates.
- Fingerprint: unit-mismatch / spoiled-eggs-vs-spoiled-trays.
- Recovery condition: يعاد فتحه فقط إذا ظهر crop/erratum موثوق يثبت أن المطلوب الأصلي كان عدد البيض الفاسد أو يضيف تعريفًا صريحًا للطبق الفاسد.

### Q09
- Factory A produces 500 units/day; factory B 125/day. If A produces 2500 units, same time=5 days; B produces 625.
- Correct: 625.
- Mapping: skill_quant_08 / sub_quant_08_2.
- Difficulty: Easy.
- Fingerprint: same-time-rate comparison.

### Q10
- Compare number of football-team members with number of cultural-contest participants; no counts supplied.
- Correct: المعطيات غير كافية.
- Mapping: skill_quant_11 / sub_quant_11_1.
- Difficulty: Easy.
- Fingerprint: quantitative-comparison / insufficient-data.
- Explanation: no numerical relation links the two groups.

### Q11
- A number was multiplied by 2 and the result became 60, but it should have been divided by 2. Find the correct result.
- 2x=60 => x=30; correct operation x÷2=15.
- Correct: 15.
- Mapping: skill_quant_11 / sub_quant_11_2 — reverse solution.
- Difficulty: Medium.
- Fingerprint: wrong-operation / reverse-to-original / apply-correct-operation.

### Q12
- Three numbers sum to 39; two are consecutive even numbers, the third odd and not prime. Find smaller even.
- Test canonical possibilities from options: 18 and20 leave 1; 1 is odd and not prime. Other option pairs leave prime odd numbers.
- Correct: 18.
- Mapping: skill_quant_01 / sub_quant_01_3.
- Difficulty: Hard.
- Fingerprint: consecutive-even / residual-odd / primality-filter.

### Q13
- Born 1420 AH, died 1443 AH.
- Age=23.
- Correct: 23.
- Mapping: skill_quant_01 / sub_quant_01_1.
- Difficulty: Easy.
- Fingerprint: elapsed-years / subtraction.

## Duplicate QA
Distinctive phrase checks against FND26/COL2627 returned no exact hits for the inspected page-14 items.

## Totals
- Source cards reviewed: 13/13
- Answers locked: 12/13
- Source-logic HOLD: 1 (Q08)
- Canonical mappings locked: 12
- Exact external duplicates: 0
- New taxonomy entities: 0

## Next checkpoint
Proceed to source PDF page 15. Final crop pass remains mandatory: preserve source pixels, remove only the printed numeral from the blue triangle, retain blank triangle, restore dashed border, trim excess whitespace.
