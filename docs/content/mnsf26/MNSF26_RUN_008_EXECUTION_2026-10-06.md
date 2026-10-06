# MNSF26 Heavy Execution Run 008 — 2026-10-06

## Scope
MNSF26 only. Batches 001–013 were not reprocessed.

## Branch checkpoint
Run started from `3d747d2ae217ee4bcae0f003f4d07d1cfd74a131`.

## QA wiring defect found and fixed
The MNSF26 npm commands live in `server/package.json`, so npm executes the TypeScript verifiers with `process.cwd()` at `server/`.
Three verifiers incorrectly resolved their manifests as `server/docs/content/mnsf26/*`, while the committed manifests are at repository-root `docs/content/mnsf26/*`.

Fixed:
- `verifyMnsf26ContentManifest.ts`: `../docs/content/mnsf26/MNSF26_CONTENT_ENRICHMENT_V1.json`
- `verifyMnsf26GeometrySourceIndex.ts`: `../docs/content/mnsf26/MNSF26_GEOMETRY_SOURCE_INDEX_V1.json`
- `verifyMnsf26CropQueue.ts`: `../docs/content/mnsf26/MNSF26_CROP_QUEUE_V1.json`

`verifyMnsf26ArithmeticSourceIndex.ts` already used the correct `../docs/...` root.

Commits:
- 319f71b2f297f2937dcf9e15f1c941d6297ba049
- 258498705e05364ab62e28fe412ed4dfc4d5a7f5
- a320813fc339712621b395c2ee2cebb0cb69773d

This removes a deterministic false failure that would have prevented `verify:mnsf26:all` even after crops were ready.

## Source-index state revalidated
- Arithmetic/algebra: 63/63 test starts resolved; unresolved = 0; highest verified start page = 122.
- Geometry: 50/50 test starts resolved across 11 lessons; unresolved = 0.
- Geometry verifier now enforces 50 resolved and accepts SEARCH_INDEX / FILES_READ_PARSED_PAGE_HEADER evidence.

## Original-pixel recovery attempted again
Canonical arithmetic source file:
`نماذج المنصف مرتبة حسب الدروس -الحساب - الجبر - معدل.pdf`
(file id `file_00000000cb0c820b8165cd9f880f2f63`, 34,783,189 bytes)

Actions:
1. Read pages 15–18 in page mode with images enabled.
2. Parsed page structure is available and confirms the post-page-14 continuation:
   - page 16: test 9 / operations on numbers
   - page 18: test 10 / order of operations and divisibility
3. The rendered image payload still returns `Image unavailable`.
4. Raw-byte materialization was retried to `/mnt/data/mnsf26`.
5. Materialization returned: `This Project file does not have an authorized raw-byte materialization path.`

Therefore no crop was fabricated from parsed text or 512px search previews.

## Safety/readiness state
Unchanged until authoritative pixels exist:
- analyzed source questions = 138
- CONTENT_READY_CROP_PENDING = 129
- HOLD_SOURCE = 3
- QUARANTINE_SOURCE_DEFECT = 1
- suppressed duplicates = 5
- production MNSF26 = 0

Remaining HOLDs:
- Batch001/Q10 rounding ambiguity
- Batch010/Q19 exact fraction transcription
- Batch012/Q15 exact algebraic fraction transcription

Quarantine:
- Batch013/Q08 unit mismatch (spoiled eggs vs spoiled trays)

Cross-bank suppression remains:
- MNSF26 P005/Q20 = COL2627 QDR-QNT-COL2627-P037-Q28

## Import decision
No dry-run/canary/full production import was started because the crop/source evidence gate is intentionally not satisfied.

## Next safe boundary
Recover original source pixels first. Then perform production-quality crops, SHA-256/image URLs, close source-only HOLDs where authoritative pixels permit, run `verify:mnsf26:all`, then dry-run -> canary -> full import -> production/E2E certification.
