# MNSF26 Automation Source Recovery — 2026-10-06 10:44 AST

## Scope
Continuation point: Batch 014 / source PDF page 15. No earlier batch was reprocessed.

## Recovery attempts in this run
1. Re-enumerated current conversation files and resolved the canonical source attachment:
   - `نماذج المنصف مرتبة حسب الدروس -الحساب - الجبر - معدل.pdf`
   - file id: `file_00000000cb0c820b8165cd9f880f2f63`
   - size: 34,783,189 bytes.
2. Retried page-mode extraction for pages 15–18 using the canonical file id.
   - Result: `No readable content was found in this file for the requested mode.`
3. Retried raw-file materialization to a fresh destination `/mnt/data/mnsf26`.
   - Result: HTTP 403 Forbidden from the file-byte service.
4. Retried via the container filesystem as an independent byte-access path.
   - Result: container client error before filesystem inspection.
5. Verified the GitHub branch remains writable/readable and enumerated `docs/content/mnsf26`.
   - Batches 001–013 and prior recovery evidence are present.
   - No source-derived Batch 014 exists, so there is no safe text/image fallback already committed.

## Integrity decision
Do **not** synthesize, infer, OCR from absent pixels, or import page-15+ questions. The required source evidence is unavailable in this runtime. This preserves the no-guessing gate and prevents wrong answers, wrong taxonomy links, and false duplicate decisions.

## Work completed despite source-byte outage
- Canonical source identity revalidated.
- Resume checkpoint revalidated: Batch 014 / PDF page 15.
- Repository state and all prior MNSF26 analysis artifacts revalidated.
- Multi-path recovery was attempted rather than stopping after the first error.
- This report is committed as fresh QA/recovery evidence.

## Resume contract
On the first run where source pixels become available:
1. Start directly at PDF page 15; do not redo pages 2–14.
2. Process a multi-page heavy batch (target pages 15–18 or as much as source clarity safely allows).
3. For every card: source crop → solve → answer lock → 25/95 mapping only → teaching explanation → listening text → question/explanation fingerprints → difficulty → duplicate gates versus FND26/COL2627 and MNSF26.
4. Preserve source pixels in production crops, remove only the printed question numeral from the blue triangle, keep the approved blank blue triangle, repair dashed border, and trim excess whitespace.
5. Keep unresolved/ambiguous source items on HOLD rather than guessing.

## Current blocker classification
Transient infrastructure/source-byte access failure. GitHub is healthy; the source file metadata is healthy; the failure is specifically at readable page/raw-byte retrieval in this run.
