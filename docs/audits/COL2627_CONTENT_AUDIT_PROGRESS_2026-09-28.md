# COL2627 — Content Audit Progress — 2026-09-28

## Scope
Production content audit for the quantitative aptitude compilation `COL2627` (`QDR-QNT-COL2627-*`) using the same source-lock standard as FND26.

Source-of-truth rule: the rendered source PDF/image is authoritative for question wording, options, diagrams and printed answer key. Source defects are quarantined; they are not silently repaired into a different question.

## Live dataset state
- Total records: **946**
- Draft: **943**
- Rejected source defects: **3**
- Approved: **0** (intentional: the collection remains isolated until full certification)
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
Three source defects are now `rejected` and have no references in quizzes / assessment versions / assignments / public barcode tests:

1. `QDR-QNT-COL2627-P009-Q05`
   - printed expression evaluates to **-1.48**
   - no option equals -1.48; printed key marks **ج**
2. `QDR-QNT-COL2627-P046-Q38`
   - source states `ع < 0` and compares `1/(5ع)` with `1/(7ع)`
   - mathematically the second value is always larger (**ب**)
   - printed key marks **د / المعطيات غير كافية**
3. `QDR-QNT-COL2627-P051-Q01`
   - six people shaking hands once each gives `6×5/2 = 15` (**أ**)
   - printed key marks **ج = 30**, double-counting each handshake

## Taxonomy corrections completed
- Clock-hand questions on page 53 were remapped from cycles/patterns to `skill_quant_15`.
- Age relationship questions on page 53 were remapped to the appropriate age subskills.
- Percent / profit-loss pages 39–43 were separated into:
  - `skill_quant_09` for percentage, percentage change, and compound percentage change.
  - `skill_quant_10` for profit/loss, selling/original price, and savings/financial applications.
  - mixed questions retained in their true semantic skill (e.g. decimal comparison, mixture).
- `QDR-QNT-COL2627-P062-Q24` was remapped from angles/lines to triangles (`skill_quant_20 / sub_quant_20_1`) after source-image verification.
- Legacy zero-padded section IDs in the early pages were normalized to the canonical section IDs.

## Whole-bank key reconciliation checkpoint
- Printed answer-key comparison completed across the full imported set.
- **945/946** live answer indexes match the printed source key.
- The single live mismatch was `QDR-QNT-COL2627-P074-Q08`, now corrected to **د / 360**.
- The three rejected records intentionally retain their printed source-key index for provenance while reviewer notes and voice explanation document the mathematical/source defect.

## Structural checkpoint
- Total: **946**
- Draft: **943**
- Rejected: **3**
- Missing images/hashes/voice/AI readable text: **0**
- Invalid answer indexes / malformed 4-choice presentation: **0**
- Generic voice explanations detected: **0**

## Additional semantic corrections — continued pass
- Page 44 Q01–Q06 remapped from generic trial/substitution 11.1 to **الحل العكسي 11.2** because the verified solutions explicitly reverse operations from the final result.
- Page 46 Q40 and Q42 remapped to **11.3 الرسم/تمثيل العلاقات** to match analogous approved FND26 chained-relation problems.
- Page 38 Q41 remapped to **8.3 التناسب العكسي**; the prompt explicitly states inverse proportionality.
- Page 55 Q31 (`آحاد 3^22`) remapped to **14.3 دوري الأسس**; this matches approved FND26 power-cycle precedent.
- Page 34 Q53 remapped to **7.3 تبسيط المقادير الجبرية**.
- Page 34 Q65–Q66 remapped to **7.4 المتباينات**.
- Page 52 Q18–Q20 and page 65 Q45/Q49 remapped to canonical **shape-counting / special counting** taxonomy.
- Page 65 Q46–Q48 remapped to **18.2 العد والتباديل/التوافيق المبسطة**.
- Page 65 Q50–Q51 remapped to **19.3 مجموع زوايا المضلعات**.
- Page 76 Q07 and page 77 Q13 remapped to **19.1 علاقات الزوايا** despite being drawn inside square diagrams.
- Page 77 Q17–Q18 remapped to **20.4 مساحة المثلث**; Q19 to **21.2 تقسيمات المستطيل**.
- Page 79 Q16/Q18/Q19 remapped to **24.3 استراتيجية المساحات المظللة**, aligned with FND26.
- Page 37 Q18–Q20 remapped to **10.4 الزكاة الشرعية**.
- Page 58 Q22–Q25 normalized to **17.4 الوسيط والمنوال والمدى**.
- AI/voice completeness spot-gate fixed three weak fields: P010-Q18, P010-Q25, P015-Q81.

## Coverage checkpoint after semantic corrections
- Main skills represented: **25/25**
- Subskills represented by usable COL2627 questions: **91/95**
- Currently absent from COL2627 source content after audit:
  - `sub_quant_11_4` التدرج المنتظم والتقريب البديهي
  - `sub_quant_15_3` زاوية الدقيقة الواحدة ومسائل الساعات المتقدمة
  - `sub_quant_16_3` مجموع وفروق الأعمار وثبات الفرق الزمني
  - `sub_quant_18_3` قراءة وتفسير الجداول والرسوم والقطاعات الدائرية
- Absence alone is not treated as a defect; no synthetic questions or artificial remapping will be introduced merely to force 95/95 coverage.

## Current gate
**NOT YET CONTENT-LOCKED.**

The dataset remains draft/rejected only. Remaining work is the continuing page-by-page semantic/text/AI/voice audit before approval. No rejected source defect will be allowed into an assessment.
