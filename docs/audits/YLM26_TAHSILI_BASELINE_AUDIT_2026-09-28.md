# YLM26 Tahsili Mathematics — Source-vs-Live Audit — 2026-09-28

## Canonical scope
Only questions carrying the **تجميعات** badge in `كتاب تأسيس يلو للرياضيات 26 - النسخة المعدلة.pdf` belong in the bank. Examples, rules and worked explanations are reference material only.

## Important source-count correction
The live/import report saying **156 = complete book** is not supported by the source.

Visual review of the book and the printed answer-key sequence at the end of each of the 30 lessons gives these تجميعات counts:

`7, 8, 9, 12, 11, 6, 8, 14, 8, 9, 2, 8, 8, 20, 3, 2, 8, 15, 2, 19, 14, 21, 17, 15, 14, 15, 12, 13, 14, 12`

**Total = 326 source تجميعات questions.**

MongoDB currently has **156 YLM26 records**. Therefore 156 is an import-record count, not the verified source-question count.

## Decisive early-book evidence
- Lesson 1 (pp. 5–6): source has questions 1–7 = **7**, but live has **9 records** in those pages, including invalid page/question identities.
- Lesson 2 (pp. 7–8): source key runs 1–8 = **8**, live has **3 records**.
- Lesson 3 (pp. 9–10): source key runs 1–9 = **9**, live has **4 records**.
- Lesson 4 (pp. 11–13): source key runs 1–12 = **12**, live has **3 records**.

This proves the current import is neither a complete 156-question source nor a clean 1:1 representation of the source.

## Current live import
- 156 total Mongo records
- batches: Pilot30=30, Batch01=30, Batch02=41, Batch03=55
- 156 unique questionCode values
- 156 unique image hashes
- 156 unique image URLs
- no active quiz/mock-exam references were found during the baseline audit

## Content-lock work already executed
The first three lessons have been source-reviewed visually.

Approved and source-backed so far:
- `P005-Q01..Q03`
- `P006-Q04..Q07`
- `P007-Q01`
- `P008-Q01..Q02`
- `P009-Q01..Q02`
- `P010-Q01..Q02`

Two stored identities were rejected because no matching تجميعات question exists at the cited source page/question identity:
- `TAH-MATH-YLM26-P005-Q04`
- `TAH-MATH-YLM26-P006-Q01`

For verified records, typed content / option text / explanation and source printed-number metadata are being corrected from the book rather than guessed.

## Required closure rule
YLM26 may only be marked GREEN when:
1. every source تجميعات question is represented canonically;
2. every crop matches the right source page/question;
3. A/B/C/D values and the correct answer are source-verified;
4. solution / AI / voice context is verified;
5. main skill and subskill are content-correct;
6. duplicate or malformed legacy identities are excluded/replaced;
7. final live count matches the canonical source manifest.

**Current verdict: AUDIT IN PROGRESS — do not approve the legacy 156 as a complete book.**
