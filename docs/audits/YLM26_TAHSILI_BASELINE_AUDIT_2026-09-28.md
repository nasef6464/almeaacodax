# YLM26 Tahsili Mathematics — Source-Locked Audit — 2026-09-28

## Canonical rule
Only questions visibly marked **«تجميعات»** in `كتاب تأسيس يلو للرياضيات 26 - النسخة المعدلة.pdf` belong in the bank.

## Source count — verified directly
The source was re-counted from the visible `تجميعات` badges and independently cross-checked against the 30 lesson-end answer-key tables.

**Canonical source total: 326 تجميعات questions.**

The 30 lesson answer-key counts are:

`7 + 8 + 9 + 12 + 11 + 6 + 8 + 14 + 8 + 9 + 2 + 8 + 8 + 20 + 3 + 2 + 8 + 15 + 2 + 19 + 14 + 21 + 17 + 15 + 14 + 15 + 12 + 13 + 14 + 12 = 326`.

The exact page/question-number manifest is stored in:

`docs/audits/YLM26_CANONICAL_TAJMEEAT_MANIFEST_2026-09-28.json`

## Live database state
MongoDB currently contains:

- 156 YLM26 records
- 156 draft
- 0 approved
- 0 pending
- 0 rejected
- 156 unique question codes
- 156 unique image hashes
- 156 unique image URLs
- 0 quiz/mock-exam references

## Identity audit
Comparing live `page + question number` identities to the source manifest:

- **76** live records already use a canonical source identity.
- **80** live records use a page/question identity that does not exist in the source at that location.
- **250** canonical source identities are currently absent from the live identity set.

Important: the 80 noncanonical records may include genuine source crops stored under wrong numbering. They must be remapped from source evidence before deciding whether a source question is truly missing.

Confirmed examples:
- Source page 5 has only تجميعات **1,2,3**; live also has `P005-Q04`.
- Source page 6 has تجميعات **4,5,6,7**; live also has `P006-Q01`.
- Source page 8 has تجميعات **5,6,7,8**; live records are `P008-Q01/Q02`.
- Source page 10 has تجميعات **5,6,7,8,9**; the rich live records `P010-Q01/Q02` actually correspond to later source questions on that page.

## Content-quality state
- 30 records contain specific question text and real option values.
- 126 records contain generic helper text and generic `A/B/C/D` AI option labels.
- All 156 remain draft and isolated from students.

## Correct repair strategy
1. Preserve the 156-record snapshot.
2. Use the canonical 326-question manifest as the only source identity truth.
3. Remap existing valid crops to their real source page/question number.
4. Reject/quarantine false-positive crops that are not a visible تجميعات question.
5. Re-extract the truly absent تجميعات questions from the source.
6. Rebuild each record with exact image, question, A/B/C/D values, source answer, explanation/voice context and canonical subskill.
7. Keep all records draft until the complete image ↔ text ↔ options ↔ answer ↔ solution ↔ subskill audit passes.

**Current verdict: YLM26 COUNT/IDENTITY AUDIT = RED. Source truth is 326 تجميعات questions; the live 156 set is not yet complete or canonically numbered.**
