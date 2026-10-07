# BIO26 Master Control — الأحياء

**Scope:** Biology only (`BIO26`).  
**Repository:** `nasef6464/almeaacodax`  
**Source-freeze version:** 1.0.0  
**Status:** CLOSED ✅ — PRODUCTION IMPORT + INTEGRITY + LIVE E2E + APPROVAL + POST-APPROVAL PASS

## Verified source inventory
- Foundation PDF: **79 pages**.
- Question PDF: **226 pages**.
- Lessons: **48**.
- Source occurrences: **2,835** = **1,673 section 1 + 1,162 section 2**.

## Taxonomy and skill linkage — PASS
- Main Skills: **29**.
- SubSkills: **98**.
- Question → skill ledger: **2,835/2,835**.
- Source-key answers: **2,835/2,835**.
- Foundation Topic ↔ MainSkill and Foundation SubTopic ↔ SubSkill are frozen.

## Crop and asset package — PASS
- Crop geometry: **2,835/2,835**.
- Methods: **2,819** vector-text anchored + **16** dedicated raster corrections.
- Stratified manual visual QA: **126 unique question codes**, including the tallest crop from **48/48 lessons**, the **48 globally shortest** crops, L01 Q1–Q15, and L36 p164 Q48–Q63.
- V2 final asset package regenerated: **2,835/2,835 WEBP files**, **0 missing**, **0 SHA-256 mismatches**.
- Canonical production candidate images: **2,832**.
- Canonical asset ZIP SHA-256: `37e58c58dfbdeb8a956ee80e42f2c41cf476f506b3c825663c71bf214ee55a03`.
- Frozen V2 remains historical evidence. V3 recovery assets were independently re-qualified from the approved BIO26 source; they are not claimed byte-identical to V2.
- R2 presign manifest is prepared for **2,832/2,832** canonical images: **29,550,012 bytes**, unique question codes/hashes **2,832/2,832**, key pattern `questions/v2/{questionCode}/{imageHash}.webp`; actual authenticated PUT verification remains pending.

## Dedupe — PASS
- Source-internal semantic duplicate groups: **3**.
- Alias occurrences: **3**.
- Canonical count after source-internal dedupe: **2,832**.
- Confirmed aliases:
  1. `L10-Q025` → `L10-Q009`.
  2. `L35-Q036` → `L35-Q033`.
  3. `L40-Q092` → `L40-Q091`.
- Live existing biology-bank audit:
  - Questions under current candidate biology/environment subject: **0**.
  - Questions found by biology-identifying source metadata/code search: **0**.
  - Existing-bank result: **PASS — EMPTY BASELINE**.
- Final canonical BIO26 question count remains **2,832**.

## Production subject readiness audit
- Current Tahsili path exists.
- The current production subject occupying the biology slot is named **علم البيئة**.
- It currently has **0 questions** and only generic auto-seeded taxonomy (**3 generic sections / 9 generic skills**).
- Reference-safety audit is complete: its generic skills are referenced by **36 SkillProgress records** across **4 users**, carrying **72 historical attempts**. Therefore it will **not** be renamed or repurposed. BIO26 will receive a **dedicated الأحياء subject** during controlled import.

## Gate state
| Gate | Status |
|---|---|
| Source analysis | PASS |
| Taxonomy | PASS — 29 / 98 |
| Inventory | PASS |
| Question-to-Skill Ledger | PASS — 2,835/2,835 |
| Answers | PASS — SOURCE KEY 2,835/2,835 |
| Crop QA | PASS |
| Dedupe | PASS — 2,832 canonical |
| AI context | PASS — 2,832/2,832 |
| Option-text recovery | PASS — 2,832/2,832 |
| READY package | PASS |
| R2 upload + authenticated hash verification | **PASS — 2,832/2,832** |
| Dry run | **PASS — 2,832/2,832** |
| Canary 5 | **PASS — 5/5** |
| Full draft import | **PASS — 2,832/2,832** |
| Integrity audit | **PASS — 0 errors; 29/98; 0 linked quizzes** |
| Live E2E pre-approval | **PASS — learner hidden; 30 live images** |
| Approval | **PASS — 2,832/2,832** |
| Live E2E post-approval | **PASS — learner visible; answer leak=0; 30 live images** |
| Post-Approval Audit | **PASS — 2,832; 29/98; linked=0** |
| Learning structure | **PASS — 29 main / 98 subtopics / 49 main-skill trainings** |
| Standard tests | **PASS — 71 tests consume all 2,832 exactly once** |
| BIO26 CLOSED | **YES ✅** |

## Production closure evidence — 2026-10-07
- R2: `BIO26_R2_VERIFIED_PASS count=2832`.
- Dry Run: `BIO26_DRY_RUN_PASS count=2832 liveImageSamples=30`.
- Canary: `BIO26_CANARY_PASS count=5 drafts=5 insertedThisRun=5`.
- Full Draft: `BIO26_IMPORT_DRAFT_PASS count=2832 drafts=2832 liveImageSamples=30`.
- Integrity: **2,832 unique codes / source IDs / image hashes**, taxonomy **29/98**, **0** scope/taxonomy/content/identity errors, **0** linked quizzes.
- Pre-approval E2E: `BIO26_LIVE_E2E_DRAFT_PASS learnerHidden=1 liveImageSamples=30`.
- Approval: `BIO26_APPROVAL_WRITE_PASS count=2832 approver=BIO26_FULL_CLOSURE_2026_10_07`.
- Post-approval E2E: `BIO26_LIVE_E2E_APPROVED_PASS learnerVisible=1 answerLeak=0 liveImageSamples=30`.
- Final gate: `BIO26_POST_APPROVAL_GATE_PASS count=2832 main=29 sub=98 linked=0`.
- PR #433 merged: `7b07579b4aa68c46562ac451711328a06ab055ee`.
- Current production main after learning/test closure: `2885b2b30eff2f959fdad3a0c098a2bd461f1b73`.
- PR #437 merged learning topics/drills/71 all-bank tests.
- PR #439 aligned main-skill training count to **49**.
- Closure evidence file: `ops/bio26/BIO26_PRODUCTION_CLOSURE_2026-10-07.json`.

## Recovery-package audit — 2026-10-06 12:30 +03
- Initial candidate `BIO26_FINAL_ASSETS_V3_RECOVERY_UPLOAD.zip`: **2,832 manifest items / 2,832 WEBP / 2,832 unique self-hashes / 0 internal hash mismatches**.
- Initial option payload used bare A/B/C/D placeholders and was correctly **REJECTED**.
- Root cause fixed without weakening source validation: READY items must now carry `aiContext.optionTextsSource="SOURCE_PDF"` and `optionTextsVerified=true`.

## Source option-text recovery — COMPLETE
- Approved question source: `تجميعات يلو للأحياء النهائية 2026 - المعدل.pdf`, **226/226 pages**.
- Final semantic option-text recovery: **2,832/2,832 PASS**.
  - High-confidence parsed source text: **2,579**.
  - Direct source-crop/layout visual review: **253**.
- Previous quarantine: **253/253 resolved; 0 remaining**.
- Legitimate source values such as A/B/C/D, 1/2/3/4, formulas, pedigrees, and visual choices are preserved by provenance instead of being rejected by value.
- Parsed recovery SHA-256: `4f726999fe7d755b7fa7444156279c7604a9055d4566af93019786d9b743de21`.
- Complete 253-item visual map SHA-256: `1b47a2aa4e09d5825b8f7f8bfebaa4a905922a0c08ac15859744133d2295a1af`.

## Re-qualified READY package — COMPLETE LOCAL GATE
- Re-qualified assets: **2,832/2,832 WEBP**, **2,832 unique codes**, **2,832 unique hashes**, **0 hash mismatches**.
- Total canonical image bytes: **29,547,754**.
- Asset methods: **2,816 vector-table anchored + 16 raster-special corrections**.
- Stratified re-qualification visual QA: **118/118 PASS**.
- READY package: `BIO26_FINAL_ASSETS_V3_READY_2832.zip`.
- Package bytes: **30,690,582**.
- Package SHA-256: `e2063da82250395c8e7f9c50a6cbba34269d9c6683c7db91a0ea9a92a494fa8f`.
- READY manifest SHA-256: `153e97e8468e4a7f84ba1488f7c4b919b19ab84095a00773de014c98b81cf8a5`.
- Full local importer-contract audit: **PASS / 0 errors** — 2,832 items, 2,832 unique codes/source IDs/hashes, 29/98 taxonomy, semantic option provenance 2,832/2,832, local image SHA 2,832/2,832.
- Production writes so far: **NONE**.

## Production transport — READY
- Durable backup file uploaded to Google Drive: `BIO26_FINAL_ASSETS_V3_READY_2832_UPLOAD.zip`.
- Drive file id: `1-Hgg37LX92ZRYzNhSSylJdmyhl_ZP_Pg`.
- Raw-fetch bridge was tested and returned a short-lived HTTPS `.oaiusercontent.com` URL accepted by the importer host guard.
- Signed URLs are intentionally **not** stored in GitHub because they expire; refresh from the Drive file immediately before each controlled phase.

## Current AI-context truth
- Effective canonical AI context: **2,832/2,832**.
- Completed lessons: **48/48**.
- Pending canonical items: **0**.
- Source-answer cross-check: **PASS_2832_OF_2832**.
- Skill-range cross-check: **PASS_2832_OF_2832**.
- Required fields: **PASS_2832_OF_2832**.
- Duplicate question codes: **0**.
- Alias exclusions: **PASS_3_OF_3**.

## Final state
BIO26 is production-closed. Future BIO26 work is a **new revision/change request**, not continuation of this import closure.

**Closure rule satisfied:** production counts, R2 integrity, exact taxonomy linkage, learner visibility, answer redaction, approval, and post-approval audit all PASS.
