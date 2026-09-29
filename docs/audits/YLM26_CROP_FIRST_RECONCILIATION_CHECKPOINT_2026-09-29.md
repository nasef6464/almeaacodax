# YLM26 Crop-First Reconciliation Checkpoint — 2026-09-29

Verified: canonical manifest 326; live Atlas YLM26 292, all draft.

Critical identity finding: 197 of 292 live records use the visible lesson-sequential question number in the questionCode Q suffix, while the canonical manifest defines that suffix as the local reading-order index on the printed page. Therefore code-only diff is unsafe.

Source-identity matching by printed page + printed question number maps 288/292 live records to canonical source items. Four live records remain unmapped and require visual verification: P083-Q01, P088-Q02, P091-Q02, P093-Q01. After this mapping, 38 canonical items remain unmatched. The prior assumption of exactly 34 missing must not drive writes until the four unmapped records are visually reconciled.

No Atlas delete, rename, approval, or replacement was executed. Crop-first gate remains mandatory before mutation: one question per image; no adjacent question fragments; no visible printed number/badge; A/B/C/D in original order; conservative cleanup; lossless WebP; new SHA-256 and imageVersion; source identity locked first.
