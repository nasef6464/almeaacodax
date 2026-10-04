# BIO26 Master Control — الأحياء

**Scope:** Biology only (`BIO26`).  
**Repository:** `nasef6464/almeaacodax`  
**Source-freeze version:** 1.0.0  
**Status:** SOURCE FREEZE COMPLETE — NOT CLOSED

## Source boundary
- Foundation: `تأسيس أحياء كامل.pdf` — concepts, lesson ordering, Main/Sub Skills, foundation topics/videos, AI grounding. **Not a question-bank source.**
- Questions: `تجميعات يلو للأحياء النهائية 2026 - المعدل.pdf` — official question source.
- Both source sections are in scope when present. Section metadata is preserved.

## Verified source inventory
- Foundation PDF: **79 pages**.
- Question PDF: **226 pages**.
- Lessons: **48**.
- Source-observed printed question occurrences: **2,835**.
  - Section 1: **1,673**.
  - Section 2: **1,162**.
- Lesson 15 is a dedicated vertebrate-comparison block and has no explicit section-2 block before lesson 16.
- These are **source occurrences**, not the final deduplicated canonical production count.

## Taxonomy freeze
- Main Skills: **29**.
- SubSkills: **98**.
- Every frozen SubSkill has source question coverage; minimum observed coverage = **3** questions.
- Foundation Topic ↔ MainSkill and Foundation SubTopic ↔ SubSkill are recorded in `BIO26_FOUNDATION_MAP.csv`.
- Future multi-skill foundation linking remains allowed; V1 keeps one primary mapping.

## Question-to-Skill Ledger
- Rows: **2,835/2,835**.
- Every row has Lesson / Unit / PDF Page / Section / Printed Question Number / QuestionCode / Topic Heading / MainSkill / SubSkill / Answer source / Crop status.
- Pre-crop range rules are frozen and summarized in `BIO26_QUESTION_RANGE_MAP.csv`.
- Mapping state: `PRE_CROP_RANGE_FROZEN_V1`.

## Answer-key gate
- Source-key mapped: **2,835/2,835**.
- Correct answer is sourced from the answer strip for the same source lesson/page.
- No answer was inferred from question OCR.
- Visual adjudication without OCR was used only where embedded text was unavailable:
  - Lesson 4 Q84.
  - Lesson 36 Q48–Q63 on PDF page 164.

## Raster/source exceptions already resolved
- Lesson 7 pages 38–43: question/page ranges visually verified.
- Lesson 36 page 164: Q48–Q63 and answer strip visually verified.
- No crop has started yet; these checks exist to prevent crop-time classification drift.

## Gate state
| Gate | Status |
|---|---|
| Source analysis | PASS |
| Taxonomy | PASS — FROZEN V1 |
| Inventory | PASS |
| Question-to-Skill Ledger | PASS — PRE-CROP V1 |
| Answer source | PASS — SOURCE KEY |
| Crop | NOT STARTED |
| AI context | INITIALIZED; authoring pending crop |
| Dedupe | NOT STARTED |
| Dry run | BLOCKED |
| Canary 5 | BLOCKED |
| Full draft import | BLOCKED |
| Integrity audit | NOT RUN |
| Live E2E | NOT RUN |
| Approval | NOT RUN |
| BIO26 CLOSED | **NO** |

## Next execution batch
1. Full crop from the question source only.
2. Crop QA: one question → one image → one code; preserve diagrams/arrows/labels/tables/options.
3. Populate imageHash and visual descriptions.
4. Run within-section/cross-section/existing-bank dedupe.
5. Complete AI explanations/hints/why-correct/why-others-wrong.
6. Only after Crop + Skill + Answer + Dedupe PASS: Dry Run → Canary 5 → Full Draft Import → Integrity Audit → Live E2E → Approval.

**Closure rule:** do not write `BIO26 CLOSED` until production counts, integrity checks, exact-question skill analysis, and live student journey evidence pass.
