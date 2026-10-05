# MNSF26 — Source Audit Start Gate — 2026-10-05

## Verdict

**READY FOR QUESTION-LEVEL INGESTION PREP — DO NOT AUTO-CLASSIFY BY BOOK HEADING**

The two uploaded PDF files are one logical quantitative aptitude bank and must be imported as one bank:

- Bank code: `MNSF26`
- Display name: `تجميعات المنصف — القدرات الكمية`
- Subject: `sub_1777779748206`
- Path: `p_1777779639431`
- Canonical taxonomy: **25 main skills / 95 subskills**
- Existing canonical taxonomy remains authoritative. **No new Skill/SubSkill is created from the source book headings.**

The source is physically split into:
1. `الحساب / الجبر` PDF — 129 PDF pages.
2. `الهندسة` PDF — 97 PDF pages.

This split is source organization only. It must not create two separate banks in ALMEAA.

## Source structure observed

### Part A — الحساب / الجبر

Detected first-page test blocks: **62**. The printed numbering reaches "الاختبار الثالث والستون"; the source sequence contains a numbering gap/section separator, therefore printed test number must never be used as the only unique identifier.

Observed source headings include:

- قراءة الأعداد والأعداد المحصورة والترتيب في الفردية والزوجية
- العمليات على الأعداد
- ترتيب العمليات — قابلية القسمة
- الأعداد الأولية — العوامل الأولية — القاسم والمضاعف — باقي القسمة
- جمع الأعداد — المتتابعات — ضرب الأعداد — قسمة الأعداد
- الدورات — المصافحات — الأعمدة — المشابك
- الكسور الاعتيادية
- الكسور العشرية
- باقي الواحد — الحل العكسي — الباقي بالضرب
- النسبة المئوية
- التناسب / أجزاء النسب / التناسب العكسي
- السرعة
- الأعمار ومسائل مرتبطة بالمعادلات/العملات بحسب السؤال
- الساعات
- التحويلات والمعادلات

### Part B — الهندسة

Detected first-page test blocks: **50**.

Observed source lessons:

1. الأشكال
2. الزوايا
3. المثلث
4. الهندسة الإحداثية
5. المستطيل
6. المربع
7. المعين وشبه المنحرف والطائرات الورقية
8. المساحات المظللة
9. الدائرة
10. مسائل الأشكال المختلفة
11. المجسمات

## Compatibility with the live Einstein taxonomy

The live taxonomy currently defines the approved 25 / 95 Quant taxonomy in `deployQuantTaxonomy25.ts`.

The source-book lesson names are **broad containers**, not canonical skill IDs. They are compatible as source grouping, but they must be mapped at question level.

High-level candidate routing:

| Source heading | Canonical candidate(s) |
|---|---|
| قراءة الأعداد / الفردي والزوجي / الترتيب | `skill_quant_01`, and for row/position/counting patterns `skill_quant_13` |
| العمليات على الأعداد | `skill_quant_01`; question may route elsewhere after solving |
| ترتيب العمليات | `sub_quant_01_4` |
| قابلية القسمة | `skill_quant_02` |
| الأولية / العوامل / القاسم / المضاعف / الباقي | `skill_quant_02` |
| المتتابعات | `sub_quant_01_3` or `skill_quant_14` depending on the actual pattern |
| المصافحات / الأعمدة / المشابك | `skill_quant_13` and/or `skill_quant_14` by question |
| الكسور الاعتيادية | `skill_quant_03` |
| الكسور العشرية | `skill_quant_04` |
| الحل العكسي | `sub_quant_11_2` |
| النسبة المئوية | `skill_quant_09`; commercial questions may route to `skill_quant_10` |
| التناسب | `skill_quant_08` |
| السرعة | `skill_quant_12` |
| الأعمار | `skill_quant_16` |
| الساعات | `skill_quant_15` |
| التحويلات والمعادلات | `skill_quant_07` plus content-derived routing for roots/exponents/etc. |
| الزوايا | primarily `skill_quant_19`; triangle/circle angle questions can route to `skill_quant_20` or `skill_quant_24` |
| المثلث | `skill_quant_20` |
| الهندسة الإحداثية | `sub_quant_25_3` |
| المستطيل | `skill_quant_21` |
| المربع | `skill_quant_22` |
| المعين / متوازي الأضلاع / شبه المنحرف | `skill_quant_23` |
| المساحات المظللة | primarily `sub_quant_24_3` / `sub_quant_24_4`, but base-shape skill must be checked |
| الدائرة | `skill_quant_24` |
| مسائل الأشكال المختلفة | mixed; mandatory question-level classification |
| المجسمات | `skill_quant_25` |

### Important evidence from existing Einstein content

Existing production content already maps row/position questions such as "ترتيب أحمد ... من الأمام ... من الخلف" to:

- `skill_quant_13`
- `sub_quant_13_4` — عدد الصفحات والمقاعد والترتيب في الصف

This is useful prior evidence, but **MNSF26 questions are still solved and classified independently**. Existing labels are evidence, not a shortcut.

## Question ingestion contract

Every accepted MNSF26 question must preserve:

- `questionCode`: `QDR-QNT-MNSF26-P{PPP}-Q{QQ}`
- `sourceMeta.documentCode = "MNSF26"`
- `sourceMeta.documentTitle = "تجميعات المنصف — القدرات الكمية"`
- `sourceMeta.pdfPageIndex`
- `sourceMeta.printedQuestionNumber`
- `sourceMeta.section = "الحساب والجبر" | "الهندسة"`
- original source identity even when the printed number is removed from the student image
- `skillId`
- `subSkillId`
- `skillIds = [skillId, subSkillId]`
- `difficulty`
- `correctOptionIndex`
- `explanation`
- `solvingStrategy`
- `aiContext`
- `fingerprint` / duplicate evidence as supported by the live contract

## Crop policy

The modified source still contains blue question-number tabs. Production crops must:

1. Use the original PDF page as the visual source of truth.
2. Include the full question stem, diagram, and all answer choices.
3. Remove the **entire blue question-number tab**, not only the numeral.
4. Restore the white background and dashed blue border so the removal is visually invisible.
5. Exclude page header/footer, phone number, teacher credit, neighboring questions, and center divider.
6. Preserve mathematical diagrams and option lettering exactly.
7. Keep the original printed question number only in metadata.
8. Run visual QA after crop generation.

## Classification policy

Never assign a question based only on the book chapter title.

For every question:

1. Read the stem and options.
2. Solve it.
3. Identify the mathematical concept actually required.
4. Select the exact existing canonical `subSkillId`.
5. Derive the owning main skill and section from the canonical taxonomy.
6. If the concept does not fit cleanly, put it in `taxonomy_review`; do not invent a new skill.
7. Compare against FND26 and COL2627 for exact and semantic duplicates.
8. Only then approve it for MNSF26.

## Duplicate policy

Duplicate review must include:

- exact/normalized text duplicate
- same image hash after number-tab removal
- same mathematical structure with only names/numbers changed
- same question already present in FND26/COL2627

A semantic duplicate is not silently deleted; it is recorded with the matched canonical question and a disposition.

## Execution phases

### Phase 1 — Source manifest
Create one manifest for both PDFs with page, source section, printed question number, crop slot, and source heading.

### Phase 2 — Crop extraction
Generate clean crops without number tabs and run visual QA.

### Phase 3 — Question analysis
For each crop: text/AI context, answer, explanation, strategy, difficulty, and canonical skill/subskill.

### Phase 4 — Duplicate gate
Compare against FND26, COL2627, and earlier MNSF26 items.

### Phase 5 — Import batches
Import in reversible batches with deterministic question codes and source metadata.

### Phase 6 — Production verification
Verify counters, image parity, answer/explanation completeness, taxonomy consistency, and no regressions in the existing 1804-question Quant baseline before MNSF26 additions are counted.

## Start gate status

- Source identity: **LOCKED**
- One-bank/two-source-parts decision: **LOCKED**
- Canonical taxonomy reuse: **LOCKED**
- Auto-classification by book heading: **FORBIDDEN**
- Question-number removal policy: **LOCKED**
- Per-question solve/classify/explain/fingerprint requirement: **LOCKED**
- Production import: **NOT STARTED in this gate**
