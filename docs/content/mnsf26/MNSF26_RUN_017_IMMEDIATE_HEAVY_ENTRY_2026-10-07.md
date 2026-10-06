# MNSF26 Run 017 — Immediate heavy hourly entry — 2026-10-07

## Scope
MNSF26 only. Immediate execution started at the same time the hourly automation was armed. No production import was attempted.

## Source recovery
Both authoritative source PDFs were fetched again as raw files from the owner's Google Drive and mounted successfully:
- arithmetic/algebra: 34,783,189 bytes
- geometry: 22,701,243 bytes

This confirms the original-pixel blocker is closed.

## Arithmetic full-book crop inventory
The first heavy entry processed the arithmetic/algebra source across the full 129-page PDF using embedded source images plus the hidden local question-number layer. It preserves the source skill/topic label before any canonical taxonomy mapping.

Current durable arithmetic crop inventory:
- 1,204 one-question WebP crops staged
- 1,037 crops are from pages after PDF page 14
- page 2 gap Q14-Q20 was recovered as 7 explicit source items
- 29 missing local questions were recovered by splitting composite source images using hidden question markers
- source coverage observed across 62 explicit test headers; nominal test 33 remains source-absent/fail-closed
- lossless WebP + SHA-256 per crop
- blank blue question badge, trimmed whitespace, original math/options preserved

Manifest:
- file: MNSF26_FULLBOOK_CROP_INVENTORY_V1.json
- SHA-256: 9f428c250b3d16e260ccfab4fea01979dbfa9f8ba5e8f30c56768999653017bf

Crop archive:
- file: mnsf26_arithmetic_crops_run017.zip
- SHA-256: 8a7bbc11d7274c50e7f5b5edd6a2bb6bcbb2025aa7dee930776533aa4912df83

Persistent Library checkpoint:
- /MNSF26/Run017/MNSF26_FULLBOOK_CROP_INVENTORY_V1.json
- /MNSF26/Run017/mnsf26_arithmetic_crops_run017.zip

## Remaining arithmetic composite/number repair queue
The automatic composite repair reduced the remaining internal numbering gaps to:
- T004: Q7
- T005: Q3-Q5
- T010: Q10
- T014: Q19
- T024: Q7
- T027: Q7-Q8
- T030: Q3,Q5,Q6
- T032: Q15
- T037: Q18
- T051: Q18
- T052: Q9
- T053: Q3,Q7-Q9,Q18-Q19

These are not guessed or silently synthesized. They stay in the repair queue for rendered-page/embedded-image alignment.

## Next entry
1. close the remaining arithmetic composite repair queue;
2. execute the same full-book authoritative crop inventory for geometry;
3. source-skill-first classification into canonical 25/95;
4. cross-bank dedupe against FND26=858 and COL2627=946;
5. only after full-book coverage: R2 upload -> verify:mnsf26:all -> dry-run -> canary -> full import -> E2E.

## Production
MNSF26 production remains intentionally closed until full-book source coverage and authoritative crops are complete.
