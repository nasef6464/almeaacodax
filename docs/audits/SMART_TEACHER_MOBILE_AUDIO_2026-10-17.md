# Smart teacher: mobile audio and on-demand scenario reuse

Status: IN_PROGRESS. Continuation of PR #569, baseline 02fdf2c3. No merge or deployment in this work cycle.

## Owner intent and implementation

The owner reported a silent mobile teacher and requested quality without high origin load. Reuse the existing structured explanation/playback and connected provider. No video generation or audio binary storage was added.

1. Opening “اشرح لي” invokes a brief real speech cue synchronously in the tap, before lazy component loading or the asynchronous AI request. This is a best-effort activation, not a universal mobile guarantee.
2. Browser narration waits up to one second for delayed voices, detects explicit speech errors and missing start/end events, detaches stale callbacks, and pauses the board on failure. It does not silently count a timer as completed speech. Direct recovery invokes native speech synchronously; restarting speech also resumes a previously paused native synthesizer.
3. A concise recovery action is shown for blocked/unavailable/failed speech. Silent playback requires the learner's explicit choice. Replay/recovery never calls AI.
4. Only the exact fixed opening request against an unchanged canonical result-review question can share its generic scenario. Ownership checks precede all cache reads. Question text, options, reference solution, correct answer, image URL, current question version, and school scope qualify/version the entry. Historic snapshots and personal follow-ups retain their private caches/context.
5. Shared entries reuse AiQuestionAssistCache's existing unique cache key and TTL. Stored owner is an explicit shared-scenario sentinel, with a question reference instead of a learner result ID. Shared prompts contain no selected answer, learner identity, history or tutor session. An in-process inflight join prevents duplicate provider calls on the same API process; waiting callers receive nonbillable cache interaction records. No distributed lock or cross-instance concurrency capacity is claimed.

## Verification

- New deterministic audio tests reproduce the old silent error handling and cover direct activation/retry, explicit rejection, silent refusal, late voices, pause during loading, global native pause, cancellation, and missing engines.
- New scenario tests cover identity independence, private follow-up exclusion, school separation and invalidation on reference/image/version changes.
- Existing storyboard, smart teacher, adaptive question assistant, PLAN6/PLAN7 and AI context contracts pass locally.
- Browser cases added for repeated blocked recovery, successful recovery without a new AI request, and explicit silent continuation at mobile viewport size.
- Local browser/type checks and final exact-head CI remain pending at the time of this note; startup timeouts are not counted as passes.

## Practical limits

Browser speech uses the device/browser's installed or provided voices; native API events cannot prove audible speaker output or Arabic voice quality on a physical phone. No external TTS service was provisioned. The current provider still does not receive question images. Actual hand-drawn glyph animation and vision-based annotations inside original images are not delivered by this audio/cache change. Existing grades, results, review authorization, and source images are unchanged; no production content/results were written.
