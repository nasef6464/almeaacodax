# MNSF26 — production scientific QA reconciliation | 2026-10-16

**Status: NOT FINAL CLOSED.** Scope strictly Quant MNSF26 (`subjectId=sub_1777779748206`, `pathId=p_1777779639431`). Einstein FND26/COL2627 drills remain unchanged. No MNSF exams created; no results touched.

## Source-of-truth and exact starting point
- `PR #526` independent offline source reports 2,129 active source keys; package has 1,989 eligible and 140 excluded.
- Read-only Atlas matched 1,989 MNSF26 documents, originally all `approved` and published; all had source IDs, image-hash URLs, explanation, 4 embedded-image option placeholders, and main + subskill IDs.
- Offline certification alone was **not** sufficient to prove production science correctness: 253 approved questions had identical placeholder explanation `حل السؤال الرياضي بالخطوات والقوانين المعتمدة.`, **all with `correctOptionIndex=3`**. Another 25 approved questions had template `يُطبَّق النمط المعتمد` with no independent documented calculation. Six surviving historical conflict records had source HOLD/REVIEW discrepancies. Source state records 93 distinct historical hold/review keys, 86 imported; these require source-level reconciliation rather than assuming the archived state is the final scientific verdict.

## Live changes (read-before-write, narrow CAS filters, verified post-write)
1. **1,290 `sectionId` mismatches repaired**: reconstructed `sectionId` from the verified canonical `skillId` and the existing 25 `skills.sectionId` mappings. Five also changed with semantic reclassification below; remaining 1,285 used conditional per-skill updates from old section 1 only. Re-read: **1,989/1,989 current section IDs now match skill section**.
2. **5 independently text-and-solution-supported reclassifications**:
   - `MNSF26-AR-T001-Q03`: primality of odd consecutive integers; `skill_quant_04/sub_quant_04_2` -> `skill_quant_02/sub_quant_02_3`.
   - `MNSF26-AR-T001-Q04,Q06,Q07,Q09`: positions in queues and intervening people; old decimal arithmetic `skill_quant_04/sub_quant_04_2` -> counting/positions `skill_quant_13/sub_quant_13_4`.
   - Existing question IDs, images, answer indices and approval statuses preserved for these five; 2 existing template explanations (Q07,Q09) replaced with calculations and matching voice texts. These changes are **classification/text checks, not a new certification of original image answer letters**.
3. **284 fail-closed science holds**:
   - 253 placeholder explanations, all at answer index 3.
   - 25 templated explanations.
   - 6 unresolved source-conflict cases: `MNSF26-AR-T061-Q04,Q09`, `MNSF26-AR-T062-Q02`, `MNSF26-GEO-T024-Q03,Q14,Q16`. See linked ledger for exact archived reasons, old values and rollback requirements.
   - Status `approved,true` -> `draft,false` with informative `reviewerNotes` by scoped CAS; no mass answer correction. Their quiz usage checked: 0 for 253, 0 for 25 and 0 for 6. No grading or attempt histories touched.
4. The old source `QA_LOCK` 2,129 keys versus current `sourceMeta.sourceItemId` resolves **exactly 140 source entries absent from production**, preserved in the JSON ledger; none auto-imported.

## Post-write live verification
- MNSF26 production total: **1,989**.
- `approved,isPublished=true`: **1,705**.
- `draft,isPublished=false`: **284**.
- Approved rows with empty generic/template explanation: **0**.
- Section-to-main-skill inconsistency: **0**.
- `cropStatus!='VERIFIED'` for **61** imported records; **60** still approved, 1 on HOLD. A missing `cropStatus` is a missing attestation *in the live record*, not proof the image bytes are corrupt.
- Active approved duplicate `fingerprint` groups: **10 pairs**. These are de-duplication/independent inspection candidates; do not auto-delete because some may be source repeats or fingerprint collisions.
- No assessment/Quiz data were changed, and no MNSF26 test was published.

## Remaining to FINAL CLOSED
- **284** held records require original R2/printed question images, actual A–D choice values, independent mathematical solution, correct original answer letter, main/subskill, explanation, and QA signature. Some may remain quarantined permanently.
- **140** source-excluded entries require independent original source correction; do not import until `importEligible=true` with certified evidence.
- **1,705** currently approved entries still need reconciliation of original per-item mathematical and visual evidence rather than trusting approval flags alone; prioritize **60** without live `cropStatus`, **10** fingerprint pairs and legacy/source review anomalies.
- When verified, add `assessmentversions` and tests *only* sourced from approved MNSF26; foundation and main/subskill drills remain FND26/COL2627 Einstein. Before publishing, check real learner RBAC/CSRF, assessment snapshots, entitlements, API and CI.
- Original WEBP crop pixels and printed choice layouts **were not retrievable in this run**. Do not claim 400 image reviews or claim full science closure. The 1,290 section metadata repairs do not represent 1,290 visual reviews.

## Safety and rollback
- Ledger: `docs/content/mnsf26/MNSF26_LIVE_RECONCILIATION_LEDGER_20261016.json`: the 253 + 25 + 6 pre-write source keys and original statuses/answer indices/skills, 140 excluded keys, 61 crop-status gaps, and 21 original fingerprint duplicate groups.
- Updates were conditional by subject, path, source prefix, old value, and prior approval; no `upsert`.
- To roll back a specific correction, require matching current question code + scoped fields + current QA hold tag, and authoritative scientific evidence; never blanket restore quarantined questions to approved.
- On concurrent changes, re-read, reconcile and continue; do not override another reviewer. Rollback must not modify any student result, assessment snapshot or foreign subject.

**Final status: NOT FINAL CLOSED.**
