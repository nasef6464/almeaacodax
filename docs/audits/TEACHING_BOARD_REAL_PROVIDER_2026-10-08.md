# Teaching board — real provider continuation

Status: PARTIAL. PR #459; continuing from `8f64fee146d927d57517eb269edf4d9745fed728`. Production baseline at inspection: `f40a785ee777`.

## Post-merge runtime checkpoint

- PR #459 runtime head `919bed2f`: 19 CI SUCCESS, 3 SKIPPED, all three required checks PASS; merged as `1984efca10740f726c32df325b87591b62806810`.
- Canonical API confirmed exact merge identity and readiness, Vercel Production deployment status SUCCESS, Post Deploy Smoke SUCCESS.
- One existing owned-review Arabic lesson probe returned the safe trusted explanation fallback. Visible output 435 tokens, input 1,440, total 1,875: the thinking-token gap disappeared, but the storyboard was invalid. Explanation correctness is not certified from this fallback.
- Follow-up branch `codex/teaching-board-live-validation` starts from current main `7f6fb2b5` (unrelated verbal certification fix after #459). It constrains the planner to two compact scenes and adds text-free structural diagnostics only to admin-owned `board-audit-` requests. It also makes explicit English language requests authoritative in the planner.
- Native desktop Chrome speech start/end events passed. This does not certify audible quality or native phone/tablet microphone capture.

## Real observations before the repair

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
