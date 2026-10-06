# BIO26 Master Control — الأحياء

**Scope:** Biology only (`BIO26`).  
**Repository:** `nasef6464/almeaacodax`  
**Source-freeze version:** 1.0.0  
**Status:** CONTENT + AI CONTEXT COMPLETE — R2/PACKAGE READINESS PENDING — NOT CLOSED

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
- R2 upload itself is still pending; V2 hashes are authoritative.
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
| Crop QA | **PASS** |
| Asset regeneration | **PASS LOCAL — 2,835 files** |
| Dedupe | **PASS — 2,832 canonical** |
| Existing biology-bank dedupe | **PASS — 0 existing** |
| AI context | **PASS — 2,832 / 2,832 canonical; 48/48 lessons; pending=0** |
| R2 upload | PENDING |
| Dry run | BLOCKED BY R2 + READY PACKAGE PAYLOAD |
| Canary 5 | BLOCKED |
| Full draft import | BLOCKED |
| Integrity audit | NOT RUN |
| Live E2E | NOT RUN |
| Approval | NOT RUN |
| BIO26 CLOSED | **NO** |

## Runtime checkpoint — 2026-10-06
- PR #388 is merged to `main` at `cc9609771ba7203ff9d7a481598f1e2706c25ecc`.
- AI context effective canonical set is **2,832/2,832** across **48/48 lessons**, pending **0**.
- Automated AI QA: source-answer **2,832/2,832 PASS**, skill-range **2,832/2,832 PASS**, required fields **2,832/2,832 PASS**, duplicate questionCodes **0**, frozen aliases excluded **3/3**.
- Import runner is fail-closed and requires `BIO26_IMPORT_MANIFEST_READY.json` with exactly **2,832** records, 4 machine-readable `optionTexts`, `readableText`, `visualDescription`, explanation, visual-review note, canonical image hash, and matching WEBP bytes.
- Repository `BIO26_IMPORT_MANIFEST.json` is a gate/status manifest only: `items=[]`. It is **not** the production-ready payload and must never be used for canary/full import.
- Canonical image package identity remains ZIP SHA-256 `37e58c58dfbdeb8a956ee80e42f2c41cf476f506b3c825663c71bf214ee55a03`; canonical images **2,832**, bytes **29,550,012**. Authenticated R2 PUT + public GET/hash verification is still pending.

## Next execution batch
1. Recover/build the exact production package containing `BIO26_IMPORT_MANIFEST_READY.json` + **2,832** canonical WEBP bytes; reject any package whose SHA/record/image hashes diverge.
2. Execute importer phase `r2`; require authenticated PUT and live GET/SHA verification for **2,832/2,832**.
3. Execute `dry-run` only after R2 remote verification passes, then `canary` for exactly **5** draft questions.
4. Verify canary isolation/integrity, then `full` draft import → post-import verifier → Live E2E → approval.

**Closure rule:** no `BIO26 CLOSED` until production counts, asset integrity, exact-question skill analysis, and live learner journey pass.
