# Local whiteboard pen motion

Baseline: main/d6259d97 (PR570). Owner approved continuing the existing board with a moving pen/hand, less visual text, five representative examples, and local rendering to limit server load.

## Delivered scope

- Authored vector hand follows progressive content reveal, line by line. Math remains KaTeX and Arabic remains shaped browser text; this is a reveal animation, **not handwritten glyph generation**.
- Underline and box strokes use the playback clock, including deterministic seek/replay and pause. Their nib follows the actual SVG path.
- Formula row bounds are measured individually so fractions and short rows can differ in height. ResizeObserver handles reflow; no per-frame network or AI calls.
- Visual playback waits for actual browser speech start. This aligns scene start, **not word/phoneme timing**; browser voice events do not certify exact spoken-word synchronization.
- Optional transcript replaces the permanently displayed narration paragraph. Reduced-motion hides the hand and reveals content/marks directly.
- Original authorized question/image stays on the board. No image inference, annotation coordinates, provider contract, backend, database, historical result, or scoring changes.

## Verification

- Motion clock RED reproduced missing mark progress, then GREEN; seeking backwards removes future marks; provider context has no local inkProgress metadata.
- Existing storyboard/transform/history/seek tests, mobile audio/recovery tests, shared cache/privacy tests PASS locally.
- Five synthetic browser examples (arithmetic, fractions, geometry with source SVG, Arabic prose, English prose) PASS at390px; desktop dark surface1280px, optional transcript, reduced-motion, pause and delayed audio start PASS. Screenshots visually inspected. No real question/content/progress was written, no provider requests were made.
- Reviewer identified unequal-height formula rows; measured row rectangles replaced equal bands, with a dedicated browser regression assertion.
- Full local typecheck stopped under Windows memory pressure; CI exact-head typecheck and existing full tutor browser regression remain required before merge. No success claim for those checks at this checkpoint.

## Deferred / not proven

No permanent per-question scenario publishing, handwriting engine, vision annotation inside question images, real-time word synchronization, load certification or new voice provider. Prior owner confirmation “الصوت يعمل” certifies their Android Chrome audible path for PR569, not every voice/device or this new rendering release.

## Previous closure reconciled

PR570 source5f9f2ede merged d6259d97 after16SUCCESS/5conditionalSKIP/all3required checks. Production Vercel dpl_7XKHU8PTh7mdh2evm7obnhCUdSjA READY; API matched d6259d97/ready=true. Published read-only counters verified; selected path mocks empty, populated lists proved in isolated UI. No production writes. Four unrelated generated architecture files and owner primary-checkout edits remain untouched.
