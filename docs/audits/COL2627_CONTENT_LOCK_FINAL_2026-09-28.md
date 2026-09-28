# COL2627 — Final Content Lock — 2026-09-28

**Status: CONTENT-LOCKED / GREEN**

The quantitative aptitude compilation `COL2627` was audited against the rendered source PDF using the same source-lock policy as FND26.

## Final live Atlas state
- Total source records: **946**
- Approved usable questions: **939**
- Rejected source defects: **7**
- Draft: **0**

## Integrity
- Unique questionCode: **946/946**
- Unique sourceItemId: **946/946**
- Unique image hash: **946/946**
- Unique image URL: **946/946**
- Missing image / hash / voice / AI readable text: **0**
- Invalid correctOptionIndex: **0**
- Invalid four-choice presentation: **0**
- Canonical skill/subskill pair errors: **0**
- sectionId / skillIds mismatches: **0**

## Source answer-key lock
The printed answer-key rows were reconciled across the imported book. After correcting `QDR-QNT-COL2627-P074-Q08` from B/180 to **D/360**, live answer indexes match the printed source key for **946/946** records.

This does not override source defects: defective source questions retain the printed source-key index for provenance but are quarantined as `rejected`.

## Rejected source defects
1. `QDR-QNT-COL2627-P009-Q05` — printed expression evaluates to -1.48; no option matches.
2. `QDR-QNT-COL2627-P033-Q45` — printed equation gives س=-10; no matching option.
3. `QDR-QNT-COL2627-P033-Q46` — printed equation gives س=-160/3; no matching option.
4. `QDR-QNT-COL2627-P046-Q38` — for ع<0 the second value is always larger, while key marks insufficient data.
5. `QDR-QNT-COL2627-P050-Q32` — equal-distance average speed is 800/9≈88.89; no exact option matches.
6. `QDR-QNT-COL2627-P051-Q01` — six people give 15 unique handshakes; key marks 30.
7. `QDR-QNT-COL2627-P053-Q07` — correct angle is 120° and source notes this, but 120 is absent from options while key marks 118.

Rejected-question references:
- quizzes: **0**
- assessment versions: **0**
- public barcode tests: **0**

## Taxonomy
- Main skills represented by approved questions: **25/25**
- Approved subskills represented: **91/95**
- Not represented by approved COL2627 source content:
  - `sub_quant_11_4` — التدرج المنتظم والتقريب البديهي
  - `sub_quant_15_1` — حساب الزاوية الصغرى والكبرى بين العقربين (its source item is rejected)
  - `sub_quant_16_3` — مجموع وفروق الأعمار وثبات الفرق الزمني
  - `sub_quant_18_3` — قراءة وتفسير الجداول والرسوم والقطاعات الدائرية

No synthetic question or artificial remapping was introduced to force 95/95 coverage.

## Decision
**939 questions are approved for assessment use. 7 source-defective questions remain rejected and quarantined. COL2627 is content-locked.**
