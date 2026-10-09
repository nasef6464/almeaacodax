# BIO26 R25 | Science-alignment remediation checkpoint

Date: 2026-10-09
Status: **REVIEW ONLY. NOT PUBLISHED. NOT MERGED TO MAIN.**
Parent checkpoint: `ops/bio26/review/BIO26_R24_CHECKPOINT.md`
Frozen production taxonomy blob: `a2ee6daf6279354db6bce723c8110c9d966e3370`

## Source verification
- Read the Google Drive BIO26 folder: 159 direct items before this run.
- Read production taxonomy `ops/bio26/BIO26_TAXONOMY_PRODUCTION.json`: 29 main skills and 98 subskills.
- Read R24 checkpoint on its review branch.
- Reused R24 PPTX, PDF, HTML and manifest; no production data or question bank writes.

## Root cause and actual fixes
A card-level text audit found **16 summaries associated with the wrong subskill topic or ambiguously phrased**, across **10 main-topic maps**, plus two repeated teaching notes on maps M11 and M14. Targeted edits preserve the original 58-slide editable deck and all 29 explanation slides.
- 16 subskill-summary repairs, affecting main maps M11, M16, M20, M21, M23, M24, M25, M26, M27, M28.
- Two duplicate notes replaced with distinct educational takeaways, additionally touching M14. Total affected main maps: **11**.
- Original 16 four-option remediation questions with correct-answer explanations and explanations for all wrong choices, stored in a separate review-only JSON and embedded in review HTML. These are NOT in the production question bank.
- Corrected full 58-slide PPTX and 58-page PDF; 11 corrected map PNGs; updated 29-main + 98-subskill unified HTML book; R25 manifest, QA and contact sheet.
- Local artifact: `BIO26_R25_Integration_Package.zip` in the ChatGPT run, not uploaded to Drive or this repository.

## Verified
- PPTX 58 slides; PDF 58 pages; HTML 29 chapters and 98 subskill articles.
- 16 targeted edits verified in corresponding slide and 29 explanation slides preserved unchanged.
- 11 corrected map PNGs decode; embedded corrected images valid.
- 16 new review questions; zero broken internal HTML links; zero duplicate HTML IDs.
- Visual contact sheet reviewed after correcting a two-empty-card regression in M11 and M14.
- Source R24 PPTX SHA256: `e69ba5877259d1a3d96a1f02ddbd4342e355369e2ae3c3535ba610418216c67b`.
- R25 PPTX SHA256: `0c2a10ef6ac65cf2e020364e509e970c4ccd2fd1d3a4cebdbbac12b7fdbceba9`.
- R25 PDF SHA256: `12f1a7a5103fb80ed67d8638472c47c46c8e49b82aeed8366ba4bea786759beb`.
- R25 HTML SHA256: `7b1ddeb5ec4bfb2f73db6c3beb6b7f0c5fc1ed4bc8b2204c84f4cf4c612b6960`.
- Review questions SHA256: `bf68ec88f015d7cf74e7acd5f752b0dd579b5f5545f3c05ea5148f57f4982629`.

## Remaining release gates
Independent scientific review of all 127 content pages and visuals; cross-device Arabic/RTL inspection; staging import with collision checks; owner approval. The sourceSubSkillId mismatch for BIO26-S22-03 remains in frozen taxonomy and must not be silently modified.

Do not merge to main or publish. Preserve production taxonomy, canonical question bank, student records, exams, training data, and commercial policy.
