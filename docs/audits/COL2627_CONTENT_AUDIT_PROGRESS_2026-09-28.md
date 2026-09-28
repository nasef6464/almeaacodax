# COL2627 — Content Audit Progress — 2026-09-28

## Scope
Production content audit for the quantitative aptitude compilation `COL2627` (`QDR-QNT-COL2627-*`) using the same source-lock standard as FND26.

Source-of-truth rule: the rendered source PDF/image is authoritative for question wording, options, diagrams and printed answer key. Source defects are quarantined; they are not silently repaired into a different question.

## Live dataset state
- Total records: **946**
- Draft: **0**
- Rejected source defects: **7**
- Approved: **939**
- Missing imageUrl: **0**
- Missing image hash: **0**
- Missing voice explanation: **0**
- Missing AI readable text: **0**
- Invalid answer index: **0**
- Duplicate questionCode: **0**
- Duplicate image hash: **0**
- Duplicate image URL: **0**
- Structural skill/section/skillIds mismatches: **0**

## Source answer-key verification
The printed answer-key rows in the source were compared against the live `correctOptionIndex` values across the collection.

A live-key mismatch was found and corrected:
- `QDR-QNT-COL2627-P074-Q08`
  - prior DB answer: **ب / 180**
  - source key: **د / 360**
  - geometry explanation and AI context were corrected to match the source figure.

## Source transcription / AI-context corrections
Source-image review exposed four page-11 transcription defects where the stored text/AI context did not match the printed expression:

1. `QDR-QNT-COL2627-P011-Q27`
   - corrected to the printed expression `6×1/4 + 6×3/4 + 12×5/3`
   - verified result: **26 / ج**
2. `QDR-QNT-COL2627-P011-Q28`
   - corrected to `(8×10/4) - (8×5/10)`
   - verified result: **16 / د**
3. `QDR-QNT-COL2627-P011-Q31`
   - corrected expression and option-value order
   - source option **ب = 2/5**
   - AI math/voice rewritten to the verified result **2/5**
4. `QDR-QNT-COL2627-P011-Q38`
   - removed an extra term that did not exist in the source
   - corrected option-value order
   - verified result: **1/4 / د**

## Source defects quarantined
Seven source defects are now `rejected` and have no references in quizzes / assessment versions / public barcode tests:

1. `QDR-QNT-COL2627-P009-Q05` — printed expression gives **-1.48**, no option matches; source key marks **ج**.
2. `QDR-QNT-COL2627-P033-Q45` — printed equation yields **س=-10**, but the printed options do not contain -10; source key marks **ب=-3**.
3. `QDR-QNT-COL2627-P033-Q46` — printed equation yields **س=-160/3**, but no option matches; source key marks **أ=-10**.
4. `QDR-QNT-COL2627-P046-Q38` — for `ع<0`, the second value is always larger (**ب**), while source key marks **د**.
5. `QDR-QNT-COL2627-P050-Q32` — equal-distance average speed of 100 and 80 is **800/9 ≈ 88.89**, while no exact option matches and the key marks **ب=90**.
6. `QDR-QNT-COL2627-P051-Q01` — six people produce **15** unique handshakes (**أ**), while the source key marks **ج=30**.
7. `QDR-QNT-COL2627-P053-Q07` — geometry gives **120°** and the source itself notes “الإجابة الأصح = 120”, but 120 is absent from the options and the source key marks **ب=118**.

## Taxonomy corrections completed
- Clock-hand questions on page 53 were remapped to `skill_quant_15`; age questions to `skill_quant_16`.
- Percent / profit-loss pages 39–43 were separated into `skill_quant_09`, `skill_quant_10`, and true mixed-topic skills.
- `QDR-QNT-COL2627-P062-Q24` was remapped to triangles (`skill_quant_20 / sub_quant_20_1`).
- Legacy zero-padded section IDs were normalized.
- Page 44 Q01–Q06 -> **11.2 الحل العكسي**.
- Page 46 Q40/Q42 -> **11.3 الرسم/تمثيل العلاقات**.
- Page 38 Q41 -> **8.3 التناسب العكسي**.
- Page 55 Q31 -> **14.3 دوري الأسس**.
- Page 34 Q53 -> **7.3 تبسيط المقادير الجبرية**; Q65–Q66 -> **7.4 المتباينات**.
- Shape-counting items on pages 52/65 were moved to the canonical special-counting skills.
- Page 65 Q46–Q48 -> **18.2 العد والتباديل/التوافيق**; Q50–Q51 -> **19.3 زوايا المضلعات**.
- Page 76 Q07 and page 77 Q13 -> **19.1 علاقات الزوايا**.
- Page 77 Q17–Q18 -> **20.4 مساحة المثلث**; Q19 -> **21.2 تقسيمات المستطيل**.
- Page 79 shaded-area items -> **24.3**.
- Page 37 Q18–Q20 -> **10.4 الزكاة**.
- Page 58 Q22–Q25 -> **17.4 الوسيط والمنوال والمدى**.
- Fraction pages 11–16 were normalized: explicit comparisons -> **3.3**; fraction equations/applied word problems -> **3.4**; nested multiply/divide simplification -> **3.2**.
- Decimal comparisons P017-Q02, P018-Q17, P040-Q18 -> **4.4**.
- High-confidence exponent comparisons including P021-Q18/Q25 and P023-Q56/Q57/Q58 -> **5.5**.
- Root comparison/approximation items on pages 24 and 27–29 -> **6.4**.
- P072-Q58 -> **20.5** midpoint/similarity relationship.
- P082-Q24/Q25 -> **24.1** direct circle circumference/area.
- P083-Q33 -> **22.1** square perimeter/area.
- AI/voice completeness spot-gate fixed P010-Q18, P010-Q25, P015-Q81.

## Whole-bank key reconciliation checkpoint
- Printed answer-key comparison completed across the full imported set.
- After correcting `QDR-QNT-COL2627-P074-Q08`, **946/946** live answer indexes match the printed source key.
- Rejected records intentionally retain the printed source-key index for provenance; reviewer notes explain the source defect.

## Final live revalidation
- Total: **946**
- Approved: **939**
- Draft: **0**
- Rejected: **7**
- Main skills represented by approved questions: **25/25**
- Approved subskills represented: **91/95**
- Missing approved subskills:
  - `sub_quant_11_4`
  - `sub_quant_15_1`
  - `sub_quant_16_3`
  - `sub_quant_18_3`
- Unique questionCode / sourceItemId / image hashes / image URLs: **946/946**
- Missing images/hashes/voice/AI readable text: **0**
- Invalid answer indexes / malformed 4-choice presentation: **0**
- Canonical skill/subskill/section/skillIds structural errors: **0**
- Rejected references in quizzes / assessment versions / public barcode tests: **0 / 0 / 0**

## Final gate
**CONTENT-LOCKED / GREEN**

No rejected source defect is eligible for assessment use. No synthetic questions or artificial remapping were introduced merely to force 95/95 coverage.
