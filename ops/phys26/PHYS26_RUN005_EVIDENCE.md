# PHYS26 RUN 005 — Offline crop candidates and validator hardening
**Date:** 2026-10-09
**Scope:** PHYS26 only, private local files + code CI. No Atlas/Render/Vercel/R2 writes.

## Branch / observed baseline
- Branch: `content/phys26-full-closure`; PR #462 remains open/draft. Compared to main at start: ahead 30 / behind 34; main HEAD `7b0c085bcd12a05531923a7acfededcbbf80cd7a`. No merge.
- Master Control and Execution Ledger were read before this run. Pre-run source inventory: 2,064 numbered occurrence positions from 31 source lesson groups, 2,064 answer-key letter **candidates**, zero certified questions/answers/crops.
- Verified 37, 162 and 77-page local source PDF files match recorded SHA-256 values. No book content or screenshots are committed to GitHub.

## Actual execution
- Generated **400 individual PRIVATE WebP crop candidates** for source entries 1–400 from the 2,064-position index, using PyMuPDF offline in 8 seconds. Each local manifest row contains source ID, lesson, section, page, crop bbox, pixel size and SHA-256. All 400 passed bounding rectangle containment, printed question-number containment, and same-column next-question-number collision checks; image archive contains 400 WebPs + 1 manifest.
- Examined a 10-item visual sample (positions 1, 10, 50, 100, 150, 200, 250, 300, 350, 400). Found a real defect in position **200** (`PHYS26-COL26-L03-Q044`, page 21): neighboring heading leaked into the candidate. Re-cropped y1 from 368.4 to **340.0**; inspected corrected result and re-built the entire private archive with new SHA.
- Remaining 390 candidates are **not visually reviewed**, and 400/400 are **NOT approved** for content accuracy/answer keys. Do not mistake geometric checks or 10-item sample for 400 approved source questions.
- Private outputs under `/mnt/data`: `PHYS26_PRIVATE_CROPS_001_400.zip`, `PHYS26_PRIVATE_CROP_MANIFEST_001_400.json`, `PHYS26_PRIVATE_CROP_SAMPLE_SHEET_001_400.jpg`. These are not stored in GitHub; preserve source rights.
- Hardened `scripts/verify-phys26-question-batch.mjs` to fail closed on normalized question/option duplicates, repeated image SHA, malformed/truncated WebP RIFF, mismatched answer-key option, missing independent-solution evidence, answer page outside lesson, question page outside lesson, and nonexistent/misaligned second sections. Kept required human visual/physics QA.
- Added `scripts/test-phys26-question-validator.mjs` with **6 synthetic behavior cases** (1 valid, 5 invalid). These are **test fixtures, not source questions**. Added mandatory workflow step to `.github/workflows/phys26-static.yml`.
- **CI result:** PHYS26 offline static gates on exact code/workflow HEAD `c77066a4c054a2c3d8e2d970377a58dcd6ee0486` completed **SUCCESS**: source gate, number audit, foundation, six validator behavior cases, syntax gate. Workflow run ID 37903937984, job 113732740968. Other repository jobs are not certified by this result.

## Counts this run
| Metric | Count |
|---|---:|
| New private crop candidates generated | 400 |
| Image files written + hashed | 400 |
| Geometric failure flags | 0 |
| Crops sampled visually | 10 |
| Sample crop defect found and corrected | 1 |
| New fully certified questions | 0 |
| Correct answers scientifically verified | 0 |
| Source questions imported to production | 0 |
| Drills published | 0 |
| Remaining indexed source occurrences not yet cropped in first-pass | 1,664 |

## Gates remaining
1. Visual inspect each crop's stem, four options, equations, units, graph labels and isolation; generate quarantine list and re-crop. Text extraction is insufficient because the PDF text layer corrupts math/Arabic.
2. Confirm answer keys against actual footer and when needed independently solve/cross-check each physics question; classify each using actual lesson and proposed main/subskill.
3. Resolve scope/rights to publicly redistribute Yelo-derived content. Until then no publication, Atlas/R2 imports, approved drill release or FINAL CLOSED.
4. Audit incomplete third-secondary foundation explanations separately; do not present summary material as the missing full source.

**Run status:** substantive offline prep and code gate executed; phase 1 / content certification not yet CLOSED.
