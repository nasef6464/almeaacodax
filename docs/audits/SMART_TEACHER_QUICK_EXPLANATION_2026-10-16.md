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
- Browser fixture and exact-head CI: pending. Cold local Vite startup caused earlier navigation timeouts; no user journey pass claimed from those attempts.

## Not certified
Actual AI provider response latency and microphone/speaker quality on student devices require runtime measurement. The frontend changes reduce compulsory actions and repeated requests; they do not claim faster inference or streaming. No production content/result mutations or deployment performed for this checkpoint.
