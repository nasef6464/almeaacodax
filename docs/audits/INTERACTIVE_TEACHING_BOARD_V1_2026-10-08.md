# Interactive teaching board V1 — owner-directed implementation

Status: PARTIAL — local implementation and deterministic/browser verification; not production certification.
Baseline: `main@f40a785e`; branch: `codex/smart-teacher-live-board`.

## Existing AI reused

`ai.routes.ts` owns authorization, `question_tutor` routing, runtime provider settings, budgets, rate limits, cache, cost/usage ledger and fallback. Provider adapters already support JSON mode for Gemini, OpenAI-compatible providers, Ollama and LM Studio. No new provider or service is installed or enabled. Supported providers are not evidence of live credentials/quota/quality.

Trusted references remain the existing question text, options, approved teacher explanation, skill labels and visual description selected by the authorized review route. No PDF ingestion, model training, image upload, scoring or auth change is introduced.

## Delivered

- Optional `boardMode=storyboard_v1` and bounded `boardContext` extend the existing endpoint; legacy callers still receive ordinary text with their original cache identity.
- Versioned pure contract: write, transform, highlight, box, erase; bounded IDs/content/scenes/actions and deterministic target validation. No arbitrary HTML, scripts, coordinates or custom LaTeX commands.
- Existing string cache stores validated serialized plans; cache identity distinguishes format and interrupted scene context. No collection migration. Interaction history stores readable narration rather than JSON.
- One gateway request generates narration and board actions. Browser replay, animations, seek and resume make no AI calls. No automatic repair request or additional token allowance.
- Independent board state, playback hook and narration adapter. A scene advances after narration completion and visual action completion; muted/unavailable speech uses content-derived timing, not a fixed seven-second timer.
- Main lesson and follow-up board are separate. Pause saves scene/action progress; current scene context accompanies the student's follow-up. Continue restores the main board.
- Browser TTS may replay the current short narration segment after a spoken follow-up; it does not provide reliable audio seeking. Visual position remains saved.
- Collapsible dialogue, RTL/LTR, safe KaTeX, progressive reveal, touch controls, keyboard focus/Escape, captions and reduced-motion support.
- Local direct-start/header/parser work was carried into an isolated worktree. Original checkout and its unowned files were preserved.

## Verification

### Owner-approved practice checkpoint extension

- One optional checkpoint before a later solution scene asks for a short student attempt. Playback waits after speech and visual completion; next-scene navigation and explicit skip remain available.
- Two validated, bounded hints are generated with the lesson and revealed locally in order. Hint display and skip add zero gateway requests.
- A submitted attempt uses the existing authorized question-assistant request with current-scene context and guidance to give a targeted hint on mistakes. This is pedagogical feedback, not authoritative scoring or persisted mastery.
- Failed requests keep the entered attempt and checkpoint for retry. Successful feedback uses the separate reply board and explicit return to the saved lesson. Microphone input at a checkpoint follows the same attempt path.
- Old storyboards without checkpoints retain their behavior. Board cache identity includes the practice planner revision; legacy text-mode cache identity is unchanged.
- Browser fixture extends coverage from 10 to 15 checks: waiting before solution, sequential local hints, failed attempt retry, contextual attempt/resume, and skip/reset without a request. Real-provider hint/feedback correctness remains unproven.

- `node --import ./server/node_modules/tsx/dist/loader.mjs scripts/test-teaching-storyboard.ts`: validation, unsafe/oversized output rejection, invalid JSON fallback, deterministic transforms/seek and two-owner narration interruption.
- `node scripts/test-teaching-board-browser.mjs`: mocked gateway/speech, real React UI; pause, contextual interruption, saved resume, speech-end advancement, two requests only for initial explanation + follow-up, tablet/mobile bounds, English, reduced motion, invalid-plan fallback and late-response isolation.
- Existing question-assistant and teacher contracts; frontend/server TypeScript, production build and results/student-journey contracts.
- The optional repository Arabic-string guard reports three missing expected strings in unchanged `App.tsx` / `SchoolsManager.tsx`; baseline source comparison confirms these are pre-existing, not malformed Arabic introduced by this change. This unrelated guard is not claimed green or weakened.
- Browser artifacts are local temporary test outputs, not production content. Required exact-head CI is checked on the attached PR before any merge.

## Not proven / deferred

- No deployment or production journey certification. No manual Vercel preview.
- Live configured-provider output quality and latency/cost not measured. The existing default question-assistant token cap can yield truncated plans; these use the trusted-text fallback. Do not increase budgets without measured need.
- Voice remains browser STT/TTS per turn. Continuous WebRTC voice, accurate word timing, streaming scenes, sub-expression highlights, geometry/biology diagrams, subject adapters and book retrieval remain later work.
- Cached responses remain scoped to user/review/session. Cross-user canonical sharing requires separate privacy and reference-version design.

Next: verify exact-head CI, then conduct an authorized review journey with a configured provider on representative real questions; measure valid-plan rate, first explanation latency, narration interruption and cost before production closure.
