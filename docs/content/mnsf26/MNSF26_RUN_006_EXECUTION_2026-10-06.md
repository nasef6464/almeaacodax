# MNSF26 — Execution Run 006 — 2026-10-06

## Scope
MNSF26 only. الحساب/الجبر والهندسة remain one bank. No new taxonomy entities were invented.

## Heavy work completed in this run

### 1) Production Quant taxonomy parity repaired
Live Atlas had 25 main skills but only 93 canonical subskills. The two missing approved subskills were restored from the repository's existing canonical `QUANT_TAXONOMY` definition:

- `sub_quant_11_4` — التدرج المنتظم والتقريب البديهي
- `sub_quant_18_3` — قراءة وتفسير الجداول والرسوم والقطاعات الدائرية

This is a parity repair of the already-approved 25/95 taxonomy, not creation of new taxonomy.

Post-repair Atlas verification:
- main skills: 25
- subskills: 95
- canonical parent foundation topics: 25
- canonical child foundation topics: 95

The matching child topics were restored with canonical IDs:
- `top_quant_sub_quant_11_4`
- `top_quant_sub_quant_18_3`

### 2) Quant baseline preserved
Live question-bank counts after the repair:
- FND26 = 858
- COL2627 = 946
- MNSF26 = 0

No MNSF26 question was written to production without source/crop evidence.

### 3) Repair made reproducible
Added the idempotent recovery script:
- `server/src/scripts/repairMnsf26CanonicalTaxonomyParity.ts`

It derives the two records from the canonical code taxonomy, refuses to invent a missing parent skill, restores the canonical child topics, and verifies 25/95 + 95 child-topic parity.

### 4) Pre-import gate strengthened
`server/src/scripts/verifyMnsf26PreImportGate.ts` now checks canonical foundation subtopic parity in addition to:
- 25/95 live taxonomy parity
- FND26/COL2627 baseline
- MNSF26 required fields
- taxonomy membership
- question-code uniqueness

### 5) Intra-MNSF duplicate gate finalized
Two later rewordings are now explicitly suppressed:

1. Batch 005 / page 6 / Q001 is a semantic duplicate of Batch 003 / page 4 / Q005.
   - same 6 positions
   - same fourth value = 5
   - same sequence 8,7,6,5,4,3
   - same result = 33
   - only surface nouns differ
   - keep the earlier Batch 003 occurrence

2. Batch 012 / page 13 / Q019 is a semantic duplicate of Batch 006 / page 7 / Q019.
   - same total = 3710
   - same hidden group size = 7
   - same equal share = 530
   - same quantitative comparison against 530
   - keep the earlier Batch 006 occurrence

A fingerprint audit over all 138 analyzed questions found two other repeated *generic* fingerprints, but their numerical payloads differ, so they remain separate questions:
- fill-operators / target-value / operation-order
- unit-rate × time

### 6) Machine-readable import ledger added
`docs/content/mnsf26/MNSF26_IMPORT_GATE_V1.json` now fixes the current page-1..14 gate in a machine-readable form.

Current analyzed range:
- source questions reviewed: 138
- HOLD: 10
- intra-MNSF suppressions: 2
- unique non-held candidates: 126

The 10 HOLD records are explicitly enumerated in that ledger and must not be imported by guess.

## Source recovery work
Resume boundary remains:
- Batch 014
- source PDF page 15

The authorized source file was resolved again:
`نماذج المنصف مرتبة حسب الدروس -الحساب - الجبر - معدل.pdf`
(size 34,783,189 bytes)

Recovery paths attempted in this run:
1. page reads for pages 15-18 with images requested
2. whole-file raw materialization
3. page-range raw materialization
4. alternate Google Drive searches using title fragments, author/header fragments, and likely source folders

The Library parser can still expose page headings/question numerals but not the original pixels needed to read/crop the image-based question cards. Raw-byte materialization is explicitly denied for this Project-file copy, and no equivalent Drive copy of the MNSF source was found.

No question, option, answer, crop, or taxonomy mapping for page 15+ was guessed.

## Verifiable commits from this run
- `1e60e67fa869b43e223485ff7ca3e5e83ec8a45f` — foundation-subtopic parity added to pre-import gate
- `e40bb0381a2b71d77743a1c559d8a31cf6066ccc` — idempotent canonical taxonomy parity repair script
- `b34fa4b844ccf515da0569a5bade3878d013b3b1` — Batch 005 semantic duplicate suppression
- `f9e60ef21b356d214275c23107b95478357d35df` — Batch 012 semantic duplicate suppression finalized
- `ac0a9236a03c52cc996ed00d952d3449cd0b0bbe` — machine-readable import gate ledger

## Next executable boundary
Do not repeat pages 1-14.

As soon as original page pixels are available:
1. render page 15 at source resolution;
2. crop every question using the approved blank blue-triangle contract;
3. trim excess whitespace and repair the dashed border without altering mathematical content;
4. independently solve every question and lock the correct option;
5. map only to existing 25/95;
6. write teaching explanation + listening speech + question fingerprint + explanation fingerprint;
7. classify difficulty;
8. run exact + semantic duplicate checks against FND26, COL2627, and accepted MNSF26;
9. commit Batch 014 and continue forward in multi-page chunks.
