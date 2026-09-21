# ALMEAA Adaptive Phase 9 — Question Assistant Gateway

Status: IMPLEMENTED / STACKED; EXACT-HEAD CI PENDING PREDECESSOR GATES
Date: 2026-09-21

## Objective
Add an optional, explicit-click AI assistant for one reviewed question without moving scoring, mastery, routing, or adaptive decisions into AI.

The assistant is available from Results > Review Solutions only. Core assessment and mastery behavior remains deterministic and server-authoritative.

## Trusted context boundary
The request contains only:
- resultId
- questionId
- help level
- optional short follow-up message

The server resolves and verifies:
- the result belongs to the authenticated learner;
- the question exists inside that result's saved review;
- saved question text/options/selected answer;
- saved or bank correct answer for review context only;
- trusted saved/bank explanation;
- current linked skill names when available.

No full test history, full student profile, full question bank, school roster, or unrelated mastery history is sent to the provider.

The response API never returns the trusted answer key or trusted explanation fields themselves. It returns only the generated/help text and runtime metadata.

## Progressive help
Supported levels:
1. hint
2. stronger_hint
3. concept
4. steps
5. follow_up

The prompt explicitly states that AI does not score, correct, or modify mastery. The student is already in post-test review context.

## Visual-question policy
- Image bytes are **not** sent to AI by default.
- The question assistant calls the provider with text prompt only.
- For a visual question, trusted textual explanation is preferred.
- If a visual question has no trusted textual explanation, the AI provider call is blocked and the student receives a safe internal fallback requesting trusted visual description/support.
- UI tells the student that the image is not sent by default.

This preserves the canonical text-first visual-question policy and avoids extra image bandwidth/tokens.

## Provider gateway and fallback
The assistant reuses the existing provider-agnostic gateway:
- configured provider priority;
- sequential fallback only;
- no parallel paid fan-out;
- request timeout;
- local fallback when providers fail.

Phase 9 adds a lightweight circuit breaker:
- three consecutive failures opens a provider circuit;
- open period = 60 seconds;
- successful call resets the provider health;
- provider health is surfaced through AI status;
- direct admin provider tests remain available independently.

## Budgets and limits
Existing:
- global 24h AI budget
- per-user 24h AI budget

Added:
- per-school 24h AI budget
- question-assistant per-user minute limit
- provider output-token cap
- prompt hard bound
- client follow-up message max 800 chars

Cache hits and budget-blocked internal fallbacks are marked non-billable so they do not consume external-call budget.

## Cache / dedupe
New additive `AiQuestionAssistCache`:
- SHA-256 cache key over user + result + question + help level + follow-up + context version;
- TTL index;
- short configurable cache period;
- provider-failure fallback cache is capped to a short two-minute lifetime;
- in-process in-flight dedupe prevents duplicate simultaneous calls on the same instance.

A second cache read occurs inside the in-flight guard before calling a provider.

## Telemetry
Question-assistant interactions record:
- user
- school scope when available
- provider/model
- latency
- fallback
- cache hit
- help level
- result/question IDs
- prompt/response character counts
- image-present flag
- imageSentToProvider=false
- compact provider errors

Provider secrets are never stored in these records.

## UI
`QuestionAssistantPanel` is mounted only inside a reviewed question.
It performs no request on mount and exposes explicit buttons:
- تلميح
- تلميح أقوى
- اشرح الفكرة
- خطوات الحل
- سؤال متابعة

Changing reviewed questions remounts the panel and keeps the interaction scoped to the active question.

## Security / authority
- endpoint requires authentication;
- result lookup includes authenticated `userId`;
- requested question must be present in that result's saved review;
- no request parameter can select another student's result;
- answer key remains server-side;
- provider URLs continue through the existing public-HTTPS/SSRF guard;
- provider secrets remain server-side.

## Resource report
### VERIFIED
- AI is explicit-click only.
- No AI call occurs on Results/Review render.
- No image bytes are sent by the question assistant.
- Provider fallback is sequential.
- Per-user/per-school/global budgets are enforced before a provider call.
- Cache hit avoids provider call.
- Output tokens are capped.
- Prompt is bounded and question-scoped.
- No mastery/scoring write occurs from the AI endpoint.

### PARTIAL
- Token telemetry is represented by prompt/response character counts because current provider adapters do not expose normalized token-usage metadata for every provider.
- In-flight dedupe is process-local; cross-instance duplicate suppression relies on the shared cache after the first write, not a distributed lock.

### NOT PROVEN YET
- Production cache-hit ratio.
- Provider-specific token/cost p50/p95.
- School-budget distribution under real institutional usage.
These are Phase 10 benchmark/hardening items.

## Verification
Focused contract:
`node scripts/smoke-adaptive-phase9-question-assistant-contract.mjs`

Required before merge:
- frontend typecheck/build
- server typecheck/build
- AI security/config contracts
- result security/answer exposure contracts
- predecessor Phase 8 closure
- exact-head required CI

## Rollback
Question-assistant cache, endpoint, circuit breaker, UI panel, and new budget settings are additive. They can be disabled/removed without rewriting QuizResult, Question, SkillProgress, assessment scoring, adaptive routing, or school analytics.
