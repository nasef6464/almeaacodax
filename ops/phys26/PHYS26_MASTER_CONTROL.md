# PHYS26 — Master Control / physics only

**Track:** ALMEAA / Physics (Tahsili)  
**State:** PHASE_1_IN_PROGRESS (source baseline verified locally; code/data migration not executed)  
**Master tracking:** https://github.com/nasef6464/almeaacodax/issues/460  
**Dedicated branch:** `content/phys26-full-closure`

## Source of truth
The three user-provided 2026 Yelo PDFs are recorded with page count, byte size and SHA-256 in `ops/phys26/PHYS26_SOURCE_INVENTORY.json`. They are *not* checked into GitHub.

**Important coverage distinction:** the foundation PDF contains 13 indexed lessons ending at thermal physics (first/second secondary); its third-secondary foundation section is explicitly absent. The question PDF contains 31 indexed lessons; source inspection located 31 first sections and 30 second sections (lesson 25 has one section in the uploaded file). Supplemental summaries are references to laws, definitions and diagrams, not a third-secondary foundation substitute. Do not claim missing lessons are already complete. Rights clearance is required for any public reuse of protected source pages/questions.

## Read-only production physics baseline — verified 2026-10-08
- Atlas `almeaa`, subject `sub_1784980706034` / **الفيزياء**, path `p_1777779653351`.
- Physics question records: **0**; legacy generic Physics Skill rows: **9** (none with subskills); quizzes directly scoped to Physics: **0**.
- Historical `skillprogresses` records matching Physics subject or any of its legacy skill IDs: **36**.
- **Do not delete, rename or repurpose those nine legacy skill IDs**. Build new canonical PHYS26 IDs and preserve history. Any future reference migration needs independent integrity and rollback proof.
- All checks above were read-only; no Atlas writes were performed.

## Target taxonomy (CANDIDATE ONLY)
- **Current candidate (RUN012): 25 main / 92 subskills**, revised from the previous 25/90 after four independently SHA-matched textbook crop observations. Candidate only, not per-question or production certified.
- All **31 source lesson groups** have a proposed main-skill parent. The corresponding hidden foundation plan now contains **117 topics** (25 main, 92 sub), all `showOnPlatform=false` and non-importable.
- Proposed editable initial free setting: first 5 main skill learning topics and their related drills, including subordinate topics. No hardcoded permanent restriction.
- No new or alternate PHYS26 taxonomy in production until a protected subject/reference baseline and mapping check passes.
- Existing draft artifacts in this conversation: `PHYS26_TAXONOMY_CANDIDATE_25x90.json` and `PHYS26_TAXONOMY_25x90_AR.md`. Import/export verified contents into this branch before freezing IDs; do not invent a replacement silently.

## Six gated execution phases
1. **Source & taxonomy:** PDFs fingerprinted, current live physics baseline and historic links audited, 25/90 candidate critically mapped to 31 lessons, executable verification and checkpoint. State: IN PROGRESS.
2. **Foundation:** main/subtopic mapping and rich law/unit/graph context, explicit gap list for missing foundation chapters. State: NOT STARTED.
3. **Question bank:** both source sections; each question's page/index, actual options, source-approved answer evidence, crop/layout and main/subskill, hashes and semantic dedupe. State: NOT STARTED.
4. **Content QA & drills:** source-authenticated all-bank questions; ~10 per subskill and 30–40 per main skill where enough verified source exists; avoid artificial fill or exhausting future reserve. State: NOT STARTED.
5. **Local release preparation:** immutable READY package SHA, dry-run, isolated Mongo UAT, integration and failure-mode contracts. State: NOT STARTED.
6. **Controlled production:** protected approvals/licensing, exact-head CI, R2+remote checksums, canary 5 then resumable draft import, integrity/learner/role/report E2E, final closure evidence. State: NOT STARTED.

## Safety rules
- **No PDF extraction/OCR/image crops on Render.** Perform heavy work in an isolated local/Codex environment; keep Atlas and Vercel lean.
- Never mutate existing physics records/skill progress/results without read-only baseline, protected snapshots and rollback plan.
- Never invent source content, option text, answer key, physical constants, diagrams or verification status.
- Quarantine bad/ambiguous items and move to independent batches without silently releasing them.
- Do not circumvent permissions, CI, RBAC, CSRF, endpoint credentials, licensing or deployment safety.
- Use CHEM26/BIO26 as design references, not shared subject IDs/skill IDs or untested importer scripts.
- Comprehensive mock exams are **out of scope for now**.
- **CLOSED only after actual production integrity + student E2E + reports/skill linking passes.**

## Evidence ledger
Update `ops/phys26/PHYS26_EXECUTION_LEDGER.json` with each real run; enter exact counts, branch/head, source artifacts, QAs, blockers and next step. Never count generated placeholders or mere scan attempts as verified questions.

## Foundation design preflight — 2026-10-08
- Offline-only artifact: `ops/phys26/PHYS26_FOUNDATION_PLAN.json`, **25 main + 90 subtopic proposals**. All `showOnPlatform=false`, `importReady=false`, and `sectionId=null` pending read-only scope verification. No content was deployed.
- Corrected subtopic linking contract: `skillId=child subskill`, `skillIds=[child subskill]`, `parentId=main topic`. **Never add main-skill ID into subtopic `skillIds`**: `validateFoundationSubtopicSkillLink` rejects IDs that are not embedded subskills. Existing CHEM/BIO legacy conventions cannot be copied blindly.
- Coverage status: **10/25** main skills (39/90 subskills) have indexed first/second-secondary foundation chapters; **15/25** (51/90) lack corresponding foundation chapters. Indexed does not mean chapter-level explanation has been visually reviewed.
- Initial editable access proposal: **26 free topics** (5 main + 21 child), 89 locked; all remain hidden until approved.
- `node scripts/verify-phys26-foundation-plan.mjs` is the local static gate. Actual Node CI and full source-page QA are pending. No verified questions, crops, or drills have been added.

## Local source access and full-book numbered occurrence index — 2026-10-08
- Earlier file read/HTTP 403 blocker resolved: the two PDFs were materialized and opened locally, and source SHA-256 matched inventory records exactly. The supplemental 77-page PDF is also available locally.
- Native text geometry and numbered labels were scanned through the 162-page collection PDF, yielding **31 consecutive lesson sequences with 2,064 numbered question positions** (no missing label in the numbered 1..N sequence of any lesson). Detailed lesson/page/section counts, but no copyrighted question text or images, are committed in `ops/phys26/PHYS26_SOURCE_NUMBER_AUDIT_2064.json`.
- **31 first sections: 1,174 numbered occurrences; 30 second sections: 890 numbered occurrences**. Lesson 25 is a single-section group in this source edition; do not assume a nonexistent second section.
- PDF page 22 splits year `2024` across text spans (`202`+`4`), which was excluded from question-number detection; this anomaly shows why geometric labels are not sufficient to approve questions. Source text extraction also visibly corrupts some Arabic text, formulas and units.
- **IMPORTANT:** 2,064 is a source **numbered-occurrence inventory**, **not** 2,064 validated/unique/importable questions. Currently verified correct answers=0, verified full question content=0, approved crops=0, approved training records=0, and production writes=0.
- User-provided PDF includes explicit redistribution restrictions. Production publication/redistribution must remain blocked until applicable rights are verified; no raw source pages/questions were committed to GitHub.
- Next: create sample and batch crop candidates off-production; visually audit the real question, graphs, A/B/C/D and answer key; dedupe, assign canonical source and subskills and quarantine uncertain rows. Update counts only for genuinely source-reviewed questions.

## Footer answer-key candidate indexing — 2026-10-08
- Parsed 2,064 footer answer-letter **candidates** and paired each to its corresponding numbered source position, with zero missing/duplicate pair IDs in the geometric check. Of the original glyphs, 29 use Arabic option letters (أ/ب/ج/د) rather than Latin A/B/C/D; candidate normalization preserves this distinction locally.
- No automatic candidate is treated as an independently verified correct answer, and no source answer text has been uploaded to the repository.
- Offline validation: `node scripts/verify-phys26-number-audit.mjs` checks chapter continuity, sums, section count, zero unanswered label matches and fail-closed publication fields. CI workflow now invokes the validator. Its latest GitHub run must be checked before declaring CI green.
- The full per-question position and raw footer-answer candidate index remain local to the source-audit environment; the public GitHub branch only stores aggregated non-copyrighted metadata. `canonicalQuestionsVerified` remains 0.

## RUN005 — Offline 400 crop candidates + stronger QA gate (2026-10-09)
- Resumed from 2,064 numbered occurrences, not a duplicate source indexing operation. The 3 PDF SHA-256 fingerprints matched the source inventory and PDFs remained off-production.
- PyMuPDF cropped **400 first-pass private WebP candidates** and generated SHA-256/geometry manifest and ZIP locally, with all 400 passing **geometric checks only**. No copyrighted source question/image bytes were committed to the repository.
- Examined 10 crop samples; found one header leak in item #200 (`PHYS26-COL26-L03-Q044`, page 21), trimmed the crop y-end to 340.0, and rebuilt the ZIP. No full visual QA, option transcription, answer verification, or scientifically correct solution validation has been claimed for any of the 400.
- Hardened `scripts/verify-phys26-question-batch.mjs`: duplicate normalized full question/options, duplicate option text, repeated image SHA, WebP RIFF bytes/chunk integrity, source and answer page within lesson boundary, invalid second section, original source key versus `correctOptionIndex`, and independent solution evidence.
- Added `scripts/test-phys26-question-validator.mjs` (1 synthetic positive, 5 synthetic negatives). Mandatory PHYS26 GitHub Actions workflow ran **SUCCESS** at exact code commit `c77066a4c054a2c3d8e2d970377a58dcd6ee0486` (run 37903937984). Changes to this Master/ledger after that commit require a new exact-head CI before merging.
- Details: `ops/phys26/PHYS26_RUN005_EVIDENCE.md`. Counters: private crop candidates 400, geometry check pass 400, visually sampled 10, defect corrected 1, fully accepted questions 0, approved answers 0, published question/drill records 0.
- Remain in Phase 1; Phase 2+ design remains an offline draft. Copyright/licensing clearance, full visual/question+answer QA, and local Mongo UAT are blocking production import.


## RUN012 — evidence-backed taxonomy amendment and source quarantine verification (2026-10-09)
- Reopened the uploaded original 37/162/77-page PDFs, verified all three PDF SHA-256 against inventory, and decoded/hash-checked all **2,064** private V5 WebP candidate crops; no new source extraction or approved questions counted.
- Confirmed source concepts and crop SHA values for `L13-Q009/Q079/Q080` and `L24-Q037` to extend the **candidate taxonomy to 25 main / 92 subskills**; hidden draft foundation topics now **117** (26 initially free and 91 initially locked, all editable proposals; never published).
- Reopened original pages **74, 79** for cropped-looking source diagrams. Artwork itself reaches printed-column edges. Keep `L14-Q039` and `L15-Q013` quarantined pending source completeness/technical editorial review; never invent missing figure detail.
- **Publisher answer-key error proven from original page 135:** `L27-Q024` key prints A=1.56 while refractive index calculation `3×10^8 / 2.4×10^8 = 1.25` corresponds to B. Hold in quarantine; do not silently replace published source key.
- **Publisher dimensional ambiguity proven from original page 117:** `L22-Q057` asks for kW power, while `72/0.18 = 400` kWh energy; printed key A refers to 400. Keep editorial quarantine.
- RUN006–RUN011 local previously documented facts reconciled into ledger without counting old work as new; 823 boundary-risk candidates reviewed in earlier runs, but only a geometry/visual-boundary audit, not full question certification. 154 distinct provisional similarity-pair comparisons; 68 distinct provisional physics crosschecks; no approved content.
- Source/foundation CI tests updated to validate **the actual candidate counts and safety invariants** instead of freezing the project to exactly 90 subskills. Exact PR head CI and unrelated required workflows still require confirmation after subsequent documentation commits.
- See `ops/phys26/PHYS26_RUN012_EVIDENCE.md` for evidence, provenance, and exact boundaries. No production writes, approval, licensing clearance, full foundation explanation, or final question/drill acceptance.

### RUN012 machine-enforced unresolved source quarantines
- `ops/phys26/PHYS26_RUN012_QUARANTINE_REGISTER.json` records four unresolved original-source blockers: clipped/edge diagrams L14-Q039 and L15-Q013, verified publisher key conflict L27-Q024, dimensional/wording error L22-Q057.
- `scripts/verify-phys26-quarantine-gate.mjs` is wired into `PHYS26 offline static gates`. It fails if any of the four disappears silently, moves outside its source-lesson page range, or is marked importable. These records are metadata only; they do not authorize redistribution, rewriting or auto-merging any question.

## RUN013 — two source-aligned crop corrections (2026-10-10)
- Reopened the original 162-page PDF and existing private V5 ZIP. Inspected **31 newly sampled image previews, one per lesson**. SHA/decode checked 2,064 candidate WebP images, which does not certify full educational content.
- A bottom-edge pixel heuristic surfaced two actual defects missed by earlier checks: L10-Q050 (PDF page 51: neighboring heading leaked into image) and L27-Q023 (PDF page 135: choice D clipped). Both were re-cropped directly from the original page and their four choices visually re-inspected.
- New PRIVATE V6 archive: PHYS26_PRIVATE_RUN013_CROPS_V6.zip, SHA-256 cf867461bc45dfc7bfdae554c7d13bf29bfc745897b0586d24e422fafe22946e. All 2,064 WebP members matched SHA and decoded; 0 lower-edge heuristic alerts after correction. Heuristic is limited and cannot prove every crop correct.
- Added scripts/audit-phys26-private-crop-edges.py to perform offline source-private SHA/ZIP/edge checking; CI verifies Python syntax. Report at ops/phys26/PHYS26_RUN013_EVIDENCE.md.
- No question text/option correctness, original answer keys, diagrams or subskills have full independent certification. Four original-source quarantines and copyright licensing gap still block import. FINAL CLOSED remains false.
