# PHYS26 RUN010 — offline content/duplicate QA checkpoint (2026-10-09)

**Scope:** PHYS26 only. Private source-derived images and text stay off GitHub. No production writes.

## Starting checkpoint
- Resumed existing RUN009 V5 private 2,064-image archive (SHA-256 `167fc44b0a08c5e270c995bc7ce1af8cee4504ee3e497fa98a1705462efec1fd`). No re-extraction or repeated question indexing.
- Before RUN010: 897 boundary-only image reviews; 2 source-page diagram quarantines; 56 distinct provisional physics checks (54 agree with *unverified* key candidates, 2 scientific/wording conflicts); 0 canonical approvals or imports.
- Official Files service refused raw-byte materialization of the three source PDFs; no bypass. Existing private images remain available but original footer keys and clipped source diagrams cannot be finally certified.

## Work executed
- Ran private pHash similarity scan over **2,064 image candidates**, covering **2,129,016 unordered image pairs**. Exact image-SHA duplicates: **0**. Threshold screen: **301 strict similarity pairs**, **4,482 broader pairs**; these are *not* 4,482 confirmed duplicates. Shared layout yields false positives.
- **58 unique image pairs visually compared** in private contact sheets. **4 potential reprints** require full-text/options comparison: `L15-Q004/L15-Q005`, `L18-Q016/L18-Q043`, `L31-Q021/L31-Q024`, `L10-Q028/L10-Q038` (reordered choices). The other 54 compared pairs were distinct/changed parameters/choices at sheet resolution. **0 automatically merged/deleted**.
- **31 additional source crops visually inspected**, one per collection lesson group, for readable stem, four options and visible diagrams. No obvious clipping at contact-sheet resolution; **not** full source/answer QA.
- **12 additional distinct independent provisional physics checks** (no overlap with known 56 prior IDs); **12/12 agree** with candidate letter. New cumulative provisional checks **68**, agreements **66**, prior conflicts/ambiguities **2** unchanged. Original PDF footer keys visually reverified in this run **0**; second-review sign-offs **0**.
- Code validator now permits one-digit numeric option values and actual A/B/C/D diagram answer values **only with explicit source-image-SHA-bound visual evidence**. The PHYS26 static CI succeeded on code commit `941d49347332cf1b19a9948bc67435a2bdb05b78`, run `37931766270`. Five additional behavior tests were attempted but the write was blocked; they are **not** in CI.

## Explicit release counters
- Source occurrences / private crop candidates: **2,064 / 2,064**; 31 source lesson groups indexed.
- New visual similarity pair decisions: **58**; possible duplicate pairs: **4** (unapproved).
- New image-level content samples: **31**; new provisional physics checks: **12**.
- Approved question texts/answer keys/verified crops/drills/imported records: **0 / 0 / 0 / 0 / 0**.
- Existing diagram quarantines: **2** (`L15-Q013`, `L14-Q039`). Existing candidate-key/wording quarantines: **2** (`L27-Q024`, `L22-Q057`).
- Rights clearance: **UNVERIFIED**. No Atlas/Render/Vercel/R2 production writes.

## Remaining
- Full source question/option transcription, exact original footer verification, physics QA, per-subskill tagging, two source-page diagram checks, protected local Mongo UAT and redistribution permission.
- Taxonomy **25 main/90 subskills remains the repository candidate**. The evidence-led **25/92** amendment and 117 hidden-topic plan remain private/uncommitted; missing grade-three foundation explanation must not be invented.
- PHYS26 remains **NOT CLOSED**; no public release/merge until exact-head CI, source/rights gates and production E2E actually pass.
