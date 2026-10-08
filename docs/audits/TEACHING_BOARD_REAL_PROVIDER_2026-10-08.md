# Teaching board — real provider continuation

Status: PARTIAL. PR #459; continuing from `8f64fee146d927d57517eb269edf4d9745fed728`. Production baseline at inspection: `f40a785ee777`.

## Post-merge runtime checkpoint

- PR #465 exact head `4427ed9151e9812ea7235c8ae89b53572e0a2de7`: 18 SUCCESS, 3 SKIPPED, all required checks PASS. Merge `50b0cd521148eb403ed9398eed1b124a7ee780de`: canonical API/readiness, Vercel production deployment 6930723700 and Post Deploy Smoke 37749436630 PASS.
- Real owned-review audit: 3/3 complete Gemini 2.5 Flash responses, no fallback; Arabic 5,367 ms / 353 output tokens, incorrect-attempt feedback 3,871 ms / 183, English 4,150 ms / 254. Both lessons have two scenes, two local hints, checkpoint before solution; reply has one scene. Source: local `scratch/teaching-board-live-v3.json`. Ledger usage actual, pricing unknown; zero recorded cost does not establish billing cost.
- Manual sample review: the trusted units-digit result is zero; both languages agree, hints do not expose the result, feedback identifies addition versus multiplication. This is one existing owned question, not multi-subject certification.
- Actual responses combined prose and dollar math inside formula fields and emitted literal newline/formatting escapes. Frontend repair renders prose in its detected direction and isolated equations with bounded untrusted KaTeX; invalid equations fall back to escaped React text. No repair inference or additional server request. Browser fixture reproduces Arabic/English/feedback formatting, checks no KaTeX errors, readable math and 390px overflow; real phone/tablet audible voice and microphone remain unverified.

- PR #459 runtime head `919bed2f`: 19 CI SUCCESS, 3 SKIPPED, all three required checks PASS; merged as `1984efca10740f726c32df325b87591b62806810`.
- Canonical API confirmed exact merge identity and readiness, Vercel Production deployment status SUCCESS, Post Deploy Smoke SUCCESS.
- One existing owned-review Arabic lesson probe returned the safe trusted explanation fallback. Visible output 435 tokens, input 1,440, total 1,875: the thinking-token gap disappeared, but the storyboard was invalid. Explanation correctness is not certified from this fallback.
- Follow-up branch `codex/teaching-board-live-validation` starts from current main `7f6fb2b5` (unrelated verbal certification fix after #459). It constrains the planner to two compact scenes and adds text-free structural diagnostics only to admin-owned `board-audit-` requests. It also makes explicit English language requests authoritative in the planner.
- Native desktop Chrome speech start/end events passed. This does not certify audible quality or native phone/tablet microphone capture.

## Real observations before the repair

### Structured content compiler follow-up

- PR #463 head `e9af0a8a`: 18 SUCCESS, 3 SKIPPED, all required checks PASS; merge/deployment `a65412001bf0a2835cfa06910107580e57c548ae`, canonical API/readiness/Vercel/Post Deploy Smoke PASS.
- Three owned-review requests: Arabic lesson valid in 5,572 ms / 410 output tokens; feedback valid in 3,432 ms / 106 output tokens; English fell back in 4,578 ms / 372 output tokens, diagnostics JSON incomplete. The Arabic model response had seven scenes and no checkpoint despite the two-scene prompt. Therefore valid JSON alone does not prove the practice behavior.
- Next branch `codex/teaching-board-structured-plans` uses a compact content-only provider schema. Server code owns exactly two lesson scenes, stable element IDs, checkpoint before the solution, two hints and boxed result. Follow-ups compile to one scene. Public storyboard_v1 and legacy cached plans remain compatible; newly generated board responses must match the compact format/mode/language.
- Gemini receives the supported JSON Schema, including required content fields and exactly two hints. Reference: https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en. This prevents relying on a prose instruction to define scene structure, and reduces JSON overhead without increasing the 450-token cap.
- Formula delimiters are stripped before safe KaTeX validation/rendering. Compiler tests cover required practice, mode/language mismatch, unsafe formulas, stable IDs and result boxing; adapter tests cover scoped schema propagation.
- The live auditor now requires all three complete responses, English, practice before solution, one-scene feedback and three actual bounded usage records. These structural checks still require manual educational/voice review.

- Canonical `/api/ai/status` and authenticated status report Gemini 2.5 Flash configured, three Free pools, and paidAllowed=false.
- One authenticated provider test succeeded on its first attempt in 8,158 ms.
- Four bounded synthetic prompts carried this branch's planner instructions through the existing live `/ai/chat` gateway: Arabic math, English physics, Arabic chemistry, and incorrect-step feedback. All four used Gemini, none used fallback, but all returned truncated JSON; 0/4 passed the storyboard validator.
- Client latencies: 7,152 / 5,310 / 4,656 / 4,962 ms. Ledger visible output: 28 / 25 / 28 / 25 tokens, with total minus input equal to 696 tokens per response. Pricing is unknown; stored zero estimated cost does not prove zero billable cost.
- This is an existing-chat prompt sample, not proof of the new question_tutor JSON-mode route or its 450-token cap. No question, result, review card or grade was created/changed. Normal admin login and AI interaction/usage records were generated.

## Root-cause hypothesis and focused repair

The usage gap and truncation are consistent with dynamic thinking exhausting the bounded output allowance. Google documents that thinking counts against max output, and Gemini 2.5 Flash supports thinkingBudget=0: https://ai.google.dev/gemini-api/docs/generate-content/thinking.

- Only board-mode requests opt into disabling thinking on compatible Gemini 2.5 Flash models. Normal chat, other capabilities and unsupported models retain existing configuration.
- The planner asks for 2–3 compact scenes, one action per scene, short narration/question/hints, and one scene for follow-ups. The question-tutor cap remains 450; no automatic repair inference or budget increase.
- Board cache revision changes to avoid retaining old planner responses. Existing legacy cache identity remains unchanged.
- Deterministic adapter tests assert thinkingBudget=0 and unchanged 450 cap, unchanged normal chat, and omission of unsupported configuration on Pro/3.x.

## Post-deploy proof still required

`scripts/audit-teaching-board-live.ts` requires explicit credentials and expected release SHA, uses an existing review owned by the authenticated audit account, and makes at most three question-assistant requests. It stops on a fallback/invalid plan, exports only its own response/usage records, and never creates educational data.

Successful structural checks do not certify explanation correctness. Review the actual returned explanation/feedback, verify language and hint leakage, and test native microphone/TTS on a real phone/tablet before marking production CLOSED. Cross-subject samples, cost with known pricing, and real-device audio remain open.
