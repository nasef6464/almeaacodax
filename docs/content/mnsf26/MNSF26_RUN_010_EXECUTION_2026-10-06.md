# MNSF26 Heavy Execution Run 010 — 2026-10-06

## Scope
MNSF26 only. Continued from 7cb1ec4fb2b7845dd3e24db26b4ecc8562c307ee. Batches 001–013 were not reprocessed.

## Targeted source-HOLD recovery
The three allowed source HOLDs were inspected against direct page reads:
- QDR-QNT-MNSF26-P001-Q10 — page 1 — rounding ambiguity
- QDR-QNT-MNSF26-P011-Q19 — page 11 — exact fraction transcription required
- QDR-QNT-MNSF26-P013-Q15 — page 13 — exact algebraic fraction transcription required

The quarantined source defect was also rechecked:
- QDR-QNT-MNSF26-P014-Q08 — page 14 — spoiled-eggs vs spoiled-trays unit mismatch

Page-mode reads for pages 1–14 returned structural/printed-number text but the mathematical question pixels remained unavailable. A second image-only read for pages 11–14 also returned Image unavailable. Therefore none of these source-sensitive records was promoted by inference.

## New fail-closed gates
Content-manifest verifier now:
- allowlists exactly the three known HOLD question codes;
- requires HOLD sourceText to remain null until authoritative source transcription exists;
- locks the single quarantine code and requires sourceText/correct/skillId/subSkillId to remain null.

Commit: ebbc91ef7299e1878ae2d79c1dbaaea286ae23de

Crop-queue verifier now:
- allowlists exactly the same three HOLD question codes;
- requires those HOLD crops to remain PENDING_ORIGINAL_PIXELS;
- rejects any imageHash/imageUrl claimed for a HOLD before authoritative pixels exist.

Commit: 6b70e6325b08f088de9bde45b972a15b148553d3

## Result
The source problem is now fail-closed at both semantic-manifest and crop-asset layers. A future accidental edit cannot silently convert these unresolved records into importable content.

## Import decision
Production remains closed. No dry-run/canary/full import is permitted until authoritative crops/source transcription are available and verify:mnsf26:all passes.
