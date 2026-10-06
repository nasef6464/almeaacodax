# MNSF26 Heavy Execution Run 015 — 2026-10-07

## Scope
MNSF26 only. No semantic reprocessing of Batches 001–013. No production import.

## Original-source blocker closed
The user supplied the canonical Google Drive folder. Both source PDFs were fetched as complete raw files:
- الحساب/الجبر: 34,783,189 bytes, 129 PDF pages.
- الهندسة: 22,701,243 bytes, 97 PDF pages.

This bypasses the prior ChatGPT attachment raw-byte 403 without weakening any security boundary.

## Authoritative crop recovery
A local source-preserving pipeline now extracts the PDF's embedded raster question assets, filters hidden stale XObjects, splits multi-question source images at visible blue question markers, blanks only the printed question number while keeping the blue triangle, trims excess whitespace, and writes lossless WebP.

For the already-analyzed source range represented by the old manifest:
- authoritative one-question crops generated: 138/138
- total WebP bytes: 1,637,396
- crop manifest SHA-256: `ab7695936a847f24a9c79d5372d1bb8d24bd1b175a169dab18263620f904fe00`
- no R2 upload or imageUrl claim has been made yet.

The 138 source occurrences still include the existing 5 suppressions and 1 quarantine. Queue rows remain fail-closed until actual R2 upload.

## Source-backed HOLD resolution
`QDR-QNT-MNSF26-P011-Q19` is now source-resolved from the authoritative crop:
- first value = 44
- second value = 3636/9 = 404
- answer = B / القيمة الثانية أكبر
- taxonomy remains skill_quant_03 / sub_quant_03_3.

Current analyzed-range status is therefore:
- 130 CONTENT_READY_CROP_PENDING
- 2 HOLD_SOURCE
- 1 QUARANTINE_SOURCE_DEFECT
- 5 suppressed duplicates

Remaining HOLDs:
- P001/Q10: the source itself remains ambiguous under the rounding statement; no guess.
- P013/Q15: exact algebraic expression still requires unambiguous source reading; no guess.

Quarantine P014/Q08 is confirmed by the source itself: the premise counts spoiled eggs while the request asks for spoiled trays without a conversion rule.

## Source-index correction from authoritative raw PDF
The old SEARCH_INDEX-based starts contained page-offset defects caused by separator/blank pages.

### Geometry
All 50 explicit test headers were revalidated from the raw PDF text layer. Example correction:
- test 5 starts on PDF page 9, not page 8 (page 8 is a blank separator).
The geometry index has been rewritten to the actual 50 header pages.

### Arithmetic/algebra
The raw PDF contains only 62 explicit test headers for nominal tests 1–63:
- test 32 starts on PDF page 63 and continues on page 64.
- test 34 starts on PDF page 65.
- no visible/extracted header for test 33 exists between them.
Therefore test 33 is restored to fail-closed unresolved status with cropAllowed=false rather than inventing a start page.
Verified later starts extend through test 63 on PDF page 127.

## Additional source coverage gap
PDF page 2 visibly contains test-1 questions Q14–Q20 but those seven source questions are absent from the current 138-record content manifest. This is a genuine source-coverage gap, not a reason to reprocess old Batches 001–013. It must be added to full-book coverage before final closure.

## QA hardening
Updated verifiers to:
- accept authoritative RAW_PDF_TEXT_HEADER evidence;
- enforce arithmetic test-33 fail-closed source gap;
- enforce geometry strict increasing start pages;
- update current analyzed-range status to 130 ready / 2 HOLD;
- enforce declared content coverage parity;
- expect 130 importable current-range crops in pre-import gating.

## Branch state at checkpoint
Before this report, MNSF26 head = `308f111e373eff541accd33c30bc238db88265cb`.
Current main = `798bb8e9786727b8349a9e33f8f7b66d3bfeb83e`.
The MNSF26 branch is currently diverged by 101 ahead / 4 behind; this does not justify rewriting or force-updating the branch. Reconcile safely only after inspecting the four main commits.

## Next
Continue full-book visible-question inventory and authoritative crops from arithmetic page 15 onward and through geometry, using rendered visible blue markers to reject hidden PDF XObjects. Then perform dedupe, source/answer/taxonomy QA, R2 upload, verify:mnsf26:all, dry-run, canary, full draft import, and Production/E2E certification.
