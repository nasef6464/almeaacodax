# Smart teacher quick explanation

Owner approval: explain the current question immediately, with short visible steps and minimal student input. Base: main14a962b7; branch: codex/smart-teacher-quick-explain.

## Delivered scope
- One explicit lazy entry: «اشرح لي». The question and its already-authorized text/image/options remain available in a collapsible preview.
- Continuous explanation by default. Practice checkpoints require explicit «جرّب بنفسك» selection; switching mode reuses the same response.
- Canonical compact solution operations become separate local scenes. Existing math rendering and trusted final answer are retained; source plans/cache are immutable. Bounds and ID collisions fall back to validated original scene structure.
- Visible microphone, contextual «ليه؟/بسّطها», local repeat, 1/1.25/1.5 playback rate. Rate changes restart only the current short step to align speech and writing.
- Current line highlighted; question collapses when dialogue opens. A minimum board height and section scrolling prevent controls/practice from collapsing the mobile board.

## Boundaries
No API, provider policy, authorization, grades/mastery, historical results, persisted question content, cache identity or database query changes. No AI request from local speed/replay/practice actions; follow-up questions keep the current board context. Existing AI output/token/budget controls remain authoritative.

## Validation checkpoint
- TypeScript noEmit: PASS.
- Storyboard/reference/speech/quick-view pure tests: PASS.
- Interactive teacher and adaptive assistant source contracts: PASS.
- Local Vite build: PASS (final exact-head build will also run in CI).
- Reviewer: no confirmed P1/P2 after aligning speed restart; mobile height added as a browser assertion.
- Browser fixture on GitHub/source9921f635: PASS, including continuous default, optional practice, local replay/rate and minimum mobile board height at390×667. Cold local Vite attempts were not counted as passes. Full CI found an obsolete voice-only source assertion; updated it to verify one contextual entry with speech/recognition preserved. Final exact-head CI pending.

## Not certified
Actual AI provider response latency and microphone/speaker quality on student devices require runtime measurement. The frontend changes reduce compulsory actions and repeated requests; they do not claim faster inference or streaming. No production content/result mutations or deployment performed for this checkpoint.

## Whiteboard continuation — 2026-10-16
Owner requested the original question/diagrams on the same board with pen-like writing and annotation.
- Paper surface with a local dark toggle; original authorized question/image/options are rendered inside the board, not redrawn or inferred.
- Local transformation history retains earlier equations in their original ordered slots. Current versions append after existing notes; explicit erase removes their local history; backward seek never retains future steps.
- The existing reveal follows a local marker. Existing trusted highlight/box actions render bounded animated SVG pen underlines/frames anchored to the actual formula, with reduced-motion support. Previous lines stay readable on the same surface.
- API/provider context still uses the canonical nonhistorical board; no extra AI calls, new wire fields, image upload, DB writes or dependency.
- Pure tests cover multiple transforms, intervening notes, erase, source immutability and backward seek. Focused reviewer reported ordering defect; fixed with an explicit regression case. Local Chrome browser suite PASS with desktop and390×667 screenshots visually reviewed; no outstanding confirmed reviewer P1/P2. Final typecheck/build and exact-head CI pending.
- This is progressive typeset/math writing with pen marks. Actual handwriting and semantic pointing to a vertex/region inside a question image are not certified or claimed: the current question tutor explicitly sends text/reference context only (`imageSentToProvider:false`). Enabling image-grounded annotations requires a separately designed vision path and privacy/cost controls.
