# BIO26 Master Control — الأحياء

**Scope:** Biology only (`BIO26`).  
**Repository:** `nasef6464/almeaacodax`  
**Source-freeze version:** 1.0.0  
**Status:** PRE-IMPORT CONTENT GATES PASS — AI CONTEXT IN PROGRESS + R2 UPLOAD PENDING — NOT CLOSED

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
| AI context | **IN PROGRESS — 1,766 / 2,832 canonical** |
| R2 upload | PENDING |
| Dry run | BLOCKED BY AI/R2 |
| Canary 5 | BLOCKED |
| Full draft import | BLOCKED |
| Integrity audit | NOT RUN |
| Live E2E | NOT RUN |
| Approval | NOT RUN |
| BIO26 CLOSED | **NO** |

## Next execution batch
1. Continue AI context authoring from **1,766 / 2,832** canonical questions; L01–L31 are complete with **1,766/1,766 source-answer**, **1,766/1,766 skill-range**, required-field and uniqueness checks passing.
2. Create a **dedicated Biology subject** at controlled import time; preserve the existing `علم البيئة` subject and its historical progress.
3. Upload **2,832** canonical V2 images to R2 and verify remote hashes/URLs.
4. Dry Run → Canary 5 → Full Draft Import → Integrity Audit → Live E2E → Approval.

**Closure rule:** no `BIO26 CLOSED` until production counts, asset integrity, exact-question skill analysis, and live learner journey pass.
