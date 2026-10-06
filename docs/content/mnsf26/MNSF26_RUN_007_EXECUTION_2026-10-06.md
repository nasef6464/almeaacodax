# MNSF26 — Heavy Execution Run — 2026-10-06

## Scope
MNSF26 only inside ALMEAA. Arithmetic/algebra + geometry remain one bank. No new Quant skills were created.

## Production safety
Live Atlas re-check after this run:
- Quant main skills = 25
- Quant subskills = 95
- canonical foundation child topics = 95
- FND26 = 858
- COL2627 = 946
- MNSF26 production = 0

No MNSF26 record was imported without verified source/crop evidence.

## Content QA progress
Previously analyzed arithmetic/algebra source range remains 138 source questions across Batches 001-013.

Current classification after this run:
- CONTENT_READY_CROP_PENDING = 129
- HOLD_SOURCE = 3
- QUARANTINE_SOURCE_DEFECT = 1
- SUPPRESSED duplicates = 5
- total = 138

All 129 ready candidates have:
- existing 25/95 skill + subskill mapping
- solved/correct answer record
- difficulty
- question fingerprint
- explanation fingerprint
- speech/listening text

### Holds reduced
Resolved four taxonomy-only holds without creating skills:
- Batch007/Q02 -> skill_quant_01 / sub_quant_01_5
- Batch008/Q19 -> skill_quant_01 / sub_quant_01_4
- Batch010/Q15 -> skill_quant_01 / sub_quant_01_5
- Batch012/Q18 -> skill_quant_01 / sub_quant_01_4

Resolved two logical source items as "المعطيات غير كافية":
- Batch003/Q13 -> skill_quant_11 / sub_quant_11_1
- Batch007/Q01 -> skill_quant_11 / sub_quant_11_1

Batch010/Q19 taxonomy was resolved to:
- skill_quant_03 / sub_quant_03_3
while its exact numerator/denominator transcription remains HOLD until original pixels are recovered.

Batch013/Q08 was moved from HOLD to QUARANTINE_SOURCE_DEFECT because the source gives spoiled eggs but asks for spoiled trays without a conversion rule. It cannot be imported safely unless an authoritative crop/erratum clarifies the intended unit.

Remaining 3 source-only HOLDs:
- Batch001/Q10 — rounding source ambiguity
- Batch010/Q19 — exact fraction transcription
- Batch012/Q15 — exact algebraic fraction/equation transcription

## Duplicate QA
Intra-MNSF suppressions:
- Batch002/Q09 -> keep Batch002/Q04
- Batch002/Q10 -> keep Batch002/Q08
- Batch005/Q01 -> keep Batch003/Q05
- Batch012/Q19 -> keep Batch006/Q19

Cross-bank scan compared 130 then-ready MNSF candidates against all 1,804 production Quant questions (FND26 + COL2627).
One exact normalized duplicate was found and suppressed:
- MNSF26 P005/Q20 "حفظ أحمد 35 آية في 7 أيام..." 
- existing COL2627: QDR-QNT-COL2627-P037-Q28

Current ready count therefore became 129.

A permanent exact-text cross-bank duplicate gate was added to verifyMnsf26PreImportGate.ts.

## Source indexing work

### الحساب/الجبر
Source: نماذج المنصف مرتبة حسب الدروس -الحساب - الجبر - معدل.pdf
- source size: 34,783,189 bytes
- discovered tests: 63
- verified test start pages from the search index: 62/63
- unresolved title/start page: test 33 only
- highest verified test start: PDF page 122
- test 50 was explicitly recovered as "الساعات" on PDF page 96
- test 51 = "الساعات" on PDF page 98
- test 60 = "التحويلات والمعادلات" on PDF page 116

Machine-readable index:
- docs/content/mnsf26/MNSF26_ARITHMETIC_SOURCE_INDEX_V1.json

### الهندسة
Source: نماذج المنصف مرتبة حسب الدروس - الهندسة - معدل - Copy.pdf
- source size: 22,701,243 bytes
- discovered tests: 50
- discovered lessons: 11
- verified test start pages: 48/50
- unresolved starts: tests 4 and 6 only
- lesson structure recovered through المجسمات (lesson 11)

Machine-readable index:
- docs/content/mnsf26/MNSF26_GEOMETRY_SOURCE_INDEX_V1.json

This establishes 113 source tests across the combined MNSF26 bank, with 110 verified test start pages and only 3 unresolved test starts total (arithmetic test 33; geometry tests 4 and 6). These unresolved starts are explicitly crop-blocked rather than guessed.

## Executable QA added
- repairMnsf26CanonicalTaxonomyParity.ts
- verifyMnsf26PreImportGate.ts
- verifyMnsf26ContentManifest.ts
- verifyMnsf26CropQueue.ts
- verifyMnsf26GeometrySourceIndex.ts
- verifyMnsf26ArithmeticSourceIndex.ts

server/package.json commands:
- repair:mnsf26:taxonomy-parity
- verify:mnsf26:preimport
- verify:mnsf26:content-manifest
- verify:mnsf26:crop-queue
- verify:mnsf26:geometry-index
- verify:mnsf26:arithmetic-index
- verify:mnsf26:all

## Current crop queue
- 132 queued source items
  - 129 content-ready
  - 3 source-review HOLDs
- 5 duplicates excluded
- 1 invalid-source quarantine excluded

Every queued item carries the approved crop contract:
- original pixels
- blank blue triangle
- trim excess whitespace
- preserve math/options exactly
- repair dashed border
- WebP output

## Source-pixel recovery attempts in this run
Multiple authorized paths were retried:
- raw-file materialization
- selected-page raw materialization
- page-text materialization
- files.read page images
- semantic page-image index
- Google Drive alternate-copy searches

Raw bytes/page rendering for the Project-file copies remain unavailable to the execution container. The search index does expose many 512px page previews and reliable source structure, which enabled the source indexes above, but those previews do not expose the mathematical card pixels at sufficient fidelity for production crop/answer transcription.

Therefore no page-15+ arithmetic question and no new geometry question was guessed or imported.

## Next safe execution boundary
1. Continue source-pixel recovery.
2. Arithmetic: resume question ingestion after the already analyzed page-14 boundary; do not repeat Batches 001-013.
3. Geometry: use the recovered 50-test/11-lesson index to start from verified source pages once original pixels become available.
4. Resolve only the 3 remaining source HOLDs from authoritative pixels.
5. Crop/upload, compute image SHA-256, complete image URLs, rerun verify:mnsf26:all, dry-run import, canary, then full import and production/E2E certification.
