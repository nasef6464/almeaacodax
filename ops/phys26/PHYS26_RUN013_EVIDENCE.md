# PHYS26 RUN013 — Cropping quality: honest grade, original-page corrections and offline audit
**Date:** 2026-10-10. **Scope:** PHYS26 only, private offline images, GitHub metadata/scripts only; no Atlas/Render/Vercel/R2 writes.
**Branch/PR:** `content/phys26-full-closure`, PR #462 remains draft. Starting comparison to main: ahead 63, behind 77; exact merge/CI gates remain mandatory.

## Ground truth
- Original 162-page `كتاب تجميعات يلو للفيزياء 26 - المعدل.pdf`, source SHA `5faa723e8485223dcae8b926e0e6c279915d8f6e3d8ece890263a62c04837616`, and private V5 ZIP of **2,064** WebP question *candidates* re-opened locally. All 2,064 V5 image bytes matched manifest SHA-256, all decoded as WebP.
- Conducted an additional **stratified visual preview of 31 images, one per source lesson**, in private contact sheets. All 31 samples had recognisable question stems/choices at that preview scale; this is NOT full readability/physics QA for 2,064 questions, nor verification of every A/B/C/D, equations and diagrams.
- Automated near-bottom-edge dark pixel heuristic (`>2.8%` ink pixels in central final 9px) flagged **2** private V5 crops. Visually inspected these crops against the real PDF page and confirmed two actual defects:
  - **L10-Q050, original PDF page 51:** clip originally ended at y=641.8 and inadvertently included following question heading “حفظ الطاقة في البندول البسيط”, whose text starts at PDF y=620.99. Private revised crop bounds `[294,508.7,590,620.8]` preserve all four choices and remove that heading.
  - **L27-Q023, original PDF page 135:** clip originally ended at y=805, slicing the last option D line, which extends through y=807.81. Private revised bounds `[294,743.2,590,812.0]` show all four options and stop above page divider around y=815.
- Both corrections re-rendered directly from original PDF and visually inspected. New **private V6** ZIP: `PHYS26_PRIVATE_RUN013_CROPS_V6.zip`, SHA-256 `cf867461bc45dfc7bfdae554c7d13bf29bfc745897b0586d24e422fafe22946e`. All 2,064 images decode and their manifest hashes match. Bottom-edge heuristic flags after fixes: **0**. This narrow heuristic is NOT a proof of full crop correctness.
- Private local quality evidence: `PHYS26_RUN013_CROP_QUALITY_AUDIT.json`; sample contact sheets `PHYS26_RUN013_VISUAL_SAMPLE_{1..3}.jpg`. No private questions, published answer texts or textbook illustrations committed to GitHub.

## Permanent code fix
- Added `scripts/audit-phys26-private-crop-edges.py`, an offline, private-only quality scanner that checks all image member SHA-256, unique IDs/hashes, WebP decode, minimum dimensions, archive CRC, and potential cropped/neighbor content detected by near-bottom-edge ink heuristic. It reports candidate anomalies rather than marking questions `APPROVED`.
- GitHub Actions `PHYS26 offline static gates` now syntax-checks the script. Exact-head CI status to be checked after this evidence commit.
- Failure modes remain protected: 4 original-source quarantines (two figures, one publisher answer key, one mismatched physical unit), 25/92 candidate taxonomy, 117 hidden foundation topics, no source rights clearance.

## Counts
| Metric | Count |
|---|---:|
| Existing private V5 source-crop candidates inspected for technical integrity | 2,064 |
| New stratified image visual samples (not full QA) | 31 |
| Old images found defective and corrected | **2** |
| Newly extracted or fully approved canonical questions | 0 |
| New source-specific quarantines raised | 0 (both image issues fixed) |
| Technical SHA/format failures post-fix | 0 |
| Bottom-edge heuristic flags post-fix | 0 |
| Images finally visual/full-content QA certified | 0 |
| Production imports, drills, student data writes | 0 |

**Cropping quality conclusion:** image files are structurally healthy and many sampled crops are visually usable, but **NOT certified excellent** until each of 2,064 is individually inspected with original page context and all options/diagrams/formulas, then validated with complete answer/skill provenance. This run found two material flaws despite previous “boundary review complete” bookkeeping, so no shortcut from geometry/ZIP integrity to content approval is permitted.
