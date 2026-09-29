# TAH-MATH — Full Content Audit Start Gate — 2026-09-29

Status: **IN PROGRESS — NO APPROVAL PROMOTION ALLOWED**

## Canonical live scope
- pathId: `p_1777779653351`
- subject / subjectId: `sub_1777784609152`
- examType: `tahsili`
- taxonomy: **22 main skills / 70 subskills**
- live questions: **1258**, all currently **draft**
- current sources:
  - `YLM26` — Foundation book — **292 live**
  - `COL26` — Compilation book section 1 import — **966 live**

## Source files used for this audit
1. `كتاب تأسيس يلو للرياضيات 26 - النسخة المعدلة.pdf` — 96 pages.
2. `كتاب تجميعات يلو للرياضيات 26 (2).pdf` — 160 pages.

The PDFs are the visual source of truth. Extracted text is only an aid; roots, exponents, fractions, equations, matrices, graphs, tables, geometry, options and answer keys require visual/source verification.

## YLM26 independent baseline
The source foundation book contains **326 visible تجميعات items**.

Current production:
- live YLM26: 292
- live identities matching the visible printed page/question contract: **286**
- canonical source identities currently absent: **40**
- current live records that are not visible تجميعات identities on their claimed source pages: **6**

Known six false-positive identities:
- `TAH-MATH-YLM26-P057-Q02`
- `TAH-MATH-YLM26-P083-Q01`
- `TAH-MATH-YLM26-P088-Q02`
- `TAH-MATH-YLM26-P091-Q02`
- `TAH-MATH-YLM26-P091-Q03`
- `TAH-MATH-YLM26-P093-Q01`

Expected source-lock count after source-proven repair: **326**, not 292.

## COL26 independent baseline
The current import explicitly targets the compilation book **القسم الأول**.

The source-book lesson boundaries and section-II markers show **1012 section-I question identities** across 30 lessons.

Current production:
- live COL26: **966**
- exact current source-page/question identities matching section I: **936**
- exact current identities matching a section-I source page/question: **936**
- exact section-I source identities absent from the current live set: **76**
- live noncanonical identities requiring crop-level reconciliation: **30**
  - **4** are already proven outside the section-I source range and are quarantined before any write:
    - `TAH-MATH-COL26-P054-Q41`
    - `TAH-MATH-COL26-P054-Q42`
    - `TAH-MATH-COL26-P092-Q46`
    - `TAH-MATH-COL26-P126-Q43`
  - the remaining **26** cannot be automatically called remaps: several duplicate a printed question number that already exists at its canonical source page. Their images must be compared to the PDF before deciding whether they are duplicates, misnumbered crops, or recoverable missing questions.
- net count deficit versus section-I source truth: **46** questions.
- expected section-I source-lock count: **1012**.

No delete, remap, or missing-question insertion is executed until crop/image provenance is verified record by record.

## Existing quality problems already confirmed
- All 1258 records are structurally linked to canonical taxonomy IDs, but structural validity is **not** semantic correctness.
- COL26 currently uses generic placeholder question text / AI readable text / speech text / visual description / explanation patterns for all 966 records.
- YLM26 is more content-rich, but still has generic visual descriptions on the whole current set and 55 generic answer-key-only explanations.
- Current subskill distribution shows mechanical-looking allocation patterns, so every question must be semantically reclassified from the source, not trusted from the existing tag.

## Required per-question lock
Every accepted question must pass:
1. exact source identity;
2. exact crop / image QA;
3. A/B/C/D visual order;
4. answer-key verification and independent mathematical check where needed;
5. canonical main skill + primary subskill by actual solving concept;
6. source-specific text / safe AI readable text / speech text / visual description;
7. specific hint / solving strategy / explanation;
8. R2 image URL + image hash integrity;
9. no duplicate code / source item / crop;
10. draft remains draft until all gates pass.

## Safety rule
No bulk approval and no destructive production write during discovery. Before every repair batch:
- exact precondition count,
- record-level snapshot,
- deterministic source manifest,
- after-count and regression evidence.

## Audit order
1. Lock YLM26 source identities (326).
2. Repair source identity/crop/answer/subskill/content for YLM26.
3. Build COL26 section-I canonical manifest from 30 lessons.
4. Reconcile all 966 current COL26 records against the source.
5. Repair missing/misidentified records.
6. Semantic answer + skill + AI-content audit for every COL26 record.
7. Final Atlas → API → UI audit.
8. Only then decide which records can move from draft to approved.
