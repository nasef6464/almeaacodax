# MNSF26 — Source PDF QA batch 2 (2026-10-16)

**Status: NOT FINAL CLOSED.** Live MongoDB Atlas readback after narrow conditional writes.

## Source material and inspection
- Arithmetic/algebra PDF: 129 pages, SHA-256 `46f2d9c2c8482f99f3d28ea9fe2ae7cdaa1b62102a6cbe6aa35deae78c672ee3`. Pages **3 and 4** inspected visually.
- Geometry PDF: 97 pages, SHA-256 `a823a90574476804cc29f5ca63ea8e9eaadab0cffe3afa78f791bbc8c6ee75d5`. Pages **1 and 2** inspected visually.
- **38 distinct printed question positions** examined (arithmetic page 3: 10 imported, page 4: 14, geometry pages 1–2: 14 imported). **28** received independent mathematical/answer-choice checks. Duplicated database records referring to the same printed positions are not counted as extra visual inspections.
- Original **R2 WEBP crops fetched: 0; SHA/pixel comparisons: 0** (R2 host inaccessible from this environment). `cropStatus=VERIFIED` in a database row is not independent verification in this run.

## Production changes confirmed by readback
- **20** main/subskill taxonomy repairs: arithmetic `AR-T002-Q02,Q03,Q04,Q05,Q06,Q07,Q08,Q11,Q12`; geometry `GEO-T001-Q03,Q05,Q06,Q08,Q09,Q10,Q12,Q16,Q17,Q18,Q20`. Each has a `MNSF26_QA_SOURCE_TAXONOMY_B2` reviewer note and source-specific reason.
- **4** held draft records received independent explanation/answer fixes: `AR-T004-Q08,Q10,Q11,Q13`. Corrected keys on `AR-T004-Q11` **B→C** (6×5=30) and `AR-T004-Q13` **A→D** (insufficient data); all four remain `draft/unpublished` pending R2 verification.
- **3** proven duplicate imported records quarantined from approved to draft: `AR-T003-Q02,Q07,Q09`, each mapped to the same source PDF page/printed question as another imported row. Before the attempted holds, quiz `questionIds`, assessment version `questionIds`, and assessment attempt `questionIds` checks returned **0** for the duplicate candidate set. No student data were written.
- **7** proposed writes not applied: duplicate holds `AR-T003-Q01,Q03,Q04,Q05,Q06,Q12` and geometry perimeter taxonomy gap `GEO-T001-Q13`; connector safety checks rejected these writes. **Do not bypass the rejections.**
- **2** proposed duplicate holds intentionally skipped: `AR-T003-Q08,Q10` remain approved because their duplicate `AR-T004` versions are still draft. Requires explicit canonical choice and original R2 comparison.

## After-write production state
- MNSF26 imported: **1,989**.
- Approved/published: **1,701**.
- Draft/unpublished: **288**.
- Approved with missing/non-VERIFIED live cropStatus: **60**.
- Original source exclusions: **140** (from prior source reconciliation; not re-imported).
- Previously flagged duplicate-fingerprint pairs: **10** (not reverified or removed here); source-position duplicates above are a *different* finding and cannot be inferred from fingerprint alone.

## Safety, evidence and rollback
- Full pre-write values, source identifiers, proposed edits and PDF provenance: `docs/content/mnsf26/MNSF26_SOURCE_QA_BATCH2_20261016.json`.
- All applied updates used exact subject/path/question/source hashes, prior status, answer, skill and explanation for conditional matching. No Einstein questions, quizzes, tests, results or foreign subjects changed.
- This batch did **not** test learner E2E or production API; current PR head `fbf7eaacca1f605ef8c60398ae2be3115ce43cf7` had no combined status checks and no PR workflow runs reported when queried. This is **not** CI PASS.
- Never bulk-reapprove draft questions or remove HOLD without source/R2 visual proof and independently checked answer, explanation and skill; resolve safety-denied writes through normal review.

**NOT FINAL CLOSED.**
