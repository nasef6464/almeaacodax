# BIO26 Master Control — الأحياء

**Scope:** Biology only (`BIO26`).  
**Repository:** `nasef6464/almeaacodax`  
**PR / Branch:** #362 / `content/bio26-source-freeze`  
**Checkpoint SHA:** `c9ce6741bc9f60d670efa070ce4a598893ae4559`  
**Status:** CONTENT + PRODUCTION TAXONOMY GATES PASS — R2/PACKAGE TRANSPORT PENDING — NOT CLOSED

## Verified source inventory
- Foundation PDF: **79 pages**.
- Question PDF: **226 pages**.
- Lessons: **48/48**.
- Source occurrences: **2,835** = **1,673 section 1 + 1,162 section 2**.

## Taxonomy and skill linkage — PASS
- Frozen source taxonomy: **29 main skills / 98 subskills**.
- Question → skill ledger: **2,835/2,835**.
- Source-key answers: **2,835/2,835**.
- Effective canonical questions after dedupe: **2,832**.
- Production Atlas verification on 2026-10-06:
  - Dedicated subject `sub_tah_biology_bio26` = **الأحياء**, path `p_1777779653351`.
  - Production skills = **29 main / 98 subskills**.
  - Protected legacy subject `sub_1784980740570` remains **علم البيئة**.
  - Historical SkillProgress rows referencing protected legacy subject = **36**.
  - BIO26 production question codes before import = **0**.
  - BIO26 batch `TAH-BIO-BIO26-FULL-V1` before import = **0**.

## Crop and asset package — PASS locally
- Crop geometry/source QA: **2,835/2,835 PASS**.
- Methods: **2,819 vector-text anchored + 16 dedicated raster corrections**.
- Stratified manual visual QA: **126 unique question codes**.
- V2 generated source assets: **2,835**, canonical production candidates: **2,832**.
- Canonical ZIP expected name: `BIO26_FINAL_ASSETS_V2_CANONICAL.zip`.
- Canonical ZIP SHA-256: `37e58c58dfbdeb8a956ee80e42f2c41cf476f506b3c825663c71bf214ee55a03`.
- Canonical ZIP bytes: **30,134,017**.
- R2 manifest: **2,832 images / 29,550,012 bytes**, unique question codes/hashes **2,832/2,832**.
- R2 key pattern: `questions/v2/{questionCode}/{imageHash}.webp`.
- The historical ZIP bytes themselves are not stored in GitHub/Actions/authorized raw Library export; authenticated R2 PUT + remote hash verification therefore remains pending while the package is recovered/regenerated.

## Dedupe — PASS
- Confirmed duplicate alias groups: **3**.
- Canonical count: **2,832**.
- Aliases:
  1. `L10-Q025` → `L10-Q009`.
  2. `L35-Q036` → `L35-Q033`.
  3. `L40-Q092` → `L40-Q091`.

## AI Context — COMPLETE
- Effective canonical AI context: **2,832/2,832 PASS**.
- Pending: **0**.
- Lessons: **48/48 complete**.
- Storage: **INDEXED_SHARDS_V2**.
- Historical base: 2,091 raw entries; effective base **2,089** after excluding stale aliases L10-Q025 and L35-Q036.
- L37–L48 indexed shards add **743** canonical entries; L40-Q092 is excluded.
- QA:
  - source-answer **2,832/2,832 PASS**
  - skill-range **2,832/2,832 PASS**
  - required fields **2,832/2,832 PASS**
  - unique question codes **2,832/2,832 PASS**
  - duplicate codes **0**
  - OCR-inferred correct answers **0**
  - alias exclusions **3/3 PASS**

## Production importer readiness
Current production baseline contains a dedicated fail-closed BIO26 importer:
- `server/src/app/bootstrap/runBio26PackageImport.ts`
- batch: `TAH-BIO-BIO26-FULL-V1`
- expected: **2,832**
- phases: **r2 → dry-run → canary → full → verify**
- R2 phase performs authenticated PUT and remote GET+SHA verification for all 2,832 images.
- Canary inserts exactly **5 drafts**.
- Full import is resumable and ends at **2,832 drafts**.
- `server/src/scripts/verifyBio26PostImport.ts` verifies taxonomy, identity, images, machine-readable fields, status and draft isolation.

## CI checkpoint
At SHA `c9ce6741bc9f60d670efa070ce4a598893ae4559` after syncing current `main`:
- Tracked Secret Hygiene — **SUCCESS**
- Platform V3 Phase + Handover — **SUCCESS**
- PLAN 7 Live AI — **SUCCESS**
- Backend Integration — **SUCCESS**
- Recovery — **SUCCESS**
- Live Role — **SUCCESS** (previous 47/48 student-mobile overflow regression cleared after main sync)
- Deep Pre-Merge E2E — **IN PROGRESS** at checkpoint
- Public Smoke / Assessment V1 — skipped by workflow conditions.

## Gate state
| Gate | Status |
|---|---|
| Source analysis | PASS |
| Taxonomy source | PASS — 29 / 98 |
| Production dedicated Biology subject | **PASS — Atlas verified** |
| Protected علم البيئة references | **PASS — preserved, 36 SkillProgress rows** |
| Inventory | PASS |
| Question-to-Skill Ledger | PASS — 2,835/2,835 |
| Answers | PASS — SOURCE KEY 2,835/2,835 |
| Crop QA | PASS |
| Asset regeneration evidence | PASS LOCAL |
| Dedupe | PASS — 2,832 canonical |
| AI context | **PASS — 2,832/2,832** |
| Production BIO26 pre-import count | **PASS — 0** |
| R2 authenticated upload + remote hash | **PENDING** |
| Dry run | BLOCKED BY R2/PACKAGE BYTES |
| Canary 5 | BLOCKED |
| Full draft import | BLOCKED |
| Integrity audit | NOT RUN |
| Live BIO26 E2E | NOT RUN |
| Approval | NOT RUN |
| BIO26 CLOSED | **NO** |

## Next execution
1. Recover/regenerate the canonical 2,832-image package and verify package/image SHA integrity.
2. Execute importer phase `r2` and verify **2,832/2,832** remote hashes.
3. Execute **dry-run → canary 5 → full draft import**.
4. Run post-import integrity audit and live learner E2E.
5. Approve only after all preceding gates are green, then run post-approval verifier.
6. Declare CLOSED and disable the scheduled BIO26 task only after all production/live gates pass.
