# YLM26 Tahsili Mathematics — Baseline Audit — 2026-09-28

## Source of truth
- Source: `كتاب تأسيس يلو للرياضيات 26 - النسخة المعدلة.pdf`
- Document code: `YLM26`
- Path: `p_1777779653351`
- Subject: `sub_1777784609152`
- Import scope: **questions carrying the dark-blue `تجميعات` badge only**.
- Examples, rules, worked examples, tables and explanations are reference material, not separate question-bank items.

## Critical result
**DO NOT CONTENT-LOCK OR APPROVE THE CURRENT YLM26 SET YET.**

The source contains **326 compilation questions** across the 30 instructional lessons.
The live database currently contains only **156** YLM26 records, leaving a **170-question source gap**.

### Live state
- 156 total records
- 156 draft
- 0 approved
- 0 pending
- 0 rejected
- 0 quiz/mock-exam references
- 156 unique question codes
- 156 unique image hashes
- 156 unique image URLs
- 48/70 subskills currently appear covered, but this figure is not trustworthy until retagging is completed.

## Content-quality findings
- **126 / 156** records have generic placeholder text such as `سؤال تحصيلي في ...`.
- The same **126 / 156** store `A/B/C/D` as the AI option texts instead of the actual option values.
- Only **30 / 156** records currently contain specific question text, real option text and source-derived explanation content.

## Identity defect
The current import contains page-local/reset numbering that conflicts with the printed `تجميعات` numbering in the source.

Confirmed examples:
- Source page 5 has compilation questions **1, 2, 3** only, but live has `P005-Q01..Q04`.
- Source page 6 continues with **4, 5, 6, 7**, but live also contains `P006-Q01`.
- Source page 8 continues the lesson with **5, 6, 7, 8**, while live contains `P008-Q01/Q02`.
- On page 9, the rich slope question stored as `P009-Q02` is the first compilation question of that lesson in the source.

Therefore `questionCode`, `printedQuestionNumber` and `sourceItemId` cannot be treated as canonical for this import until re-extraction.

## Taxonomy defect
Using the source lesson boundaries and the canonical 22-main-skill / 70-subskill Tahsili taxonomy, **at least 60 live records** are assigned to an incompatible main skill. This is a content/taxonomy problem, not merely a reporting counter issue.

Examples among content-rich records:
- matrix questions on page 31 are stored under the quadratic/polynomial skill instead of matrices;
- a polynomial question on page 34 is stored under operations on functions;
- a composition-of-functions question on page 38 is stored under rational functions;
- conditional probability on page 49 is stored under trigonometry;
- a logarithm question on page 66 is stored under trigonometric identities.

## Safe state
All current records are still **draft** and **no quiz references them**, so no student assessment currently consumes the defective YLM26 import.

## Required repair order
1. Preserve this pre-change snapshot.
2. Rebuild a canonical source manifest of all 326 `تجميعات` questions.
3. Use the true printed compilation number across each lesson; never reset numbering at each page.
4. Crop exactly the question block with its A/B/C/D choices.
5. Upload the canonical crop to R2 and verify hash/public URL.
6. Populate exact question text, option texts, source answer, source explanation / AI context.
7. Map each question to the canonical Tahsili subskill by content.
8. Dry-run import with duplicate/source-identity gates.
9. Replace or reject the current legacy draft records only after canonical replacements exist.
10. Perform the same final content-lock audit used for FND26: source image ↔ text ↔ choices ↔ answer ↔ solution ↔ subskill.

**Current verdict: YLM26 IMPORT AUDIT = RED / NOT READY FOR APPROVAL.**
