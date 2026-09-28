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

## Current gate
**NOT YET CONTENT-LOCKED.**

The dataset remains draft/rejected only. Remaining work is the continuing page-by-page semantic/text/AI/voice audit before approval. No rejected source defect will be allowed into an assessment.
