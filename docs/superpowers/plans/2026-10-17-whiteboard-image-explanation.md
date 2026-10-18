# Whiteboard Image Explanation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native implementation after owner plan review; do not delegate implementation tasks. One focused independent review before merge.

**Goal:** Explain an authorized question image with bounded scene-linked marks and existing narration, without video or repeated image/provider work on replay.

**Architecture:** Add opt-in storyboard v2 beside unchanged v1. The server validates source/version, owns reference answers and caches a compact plan; React draws normalized marks on the actual image rectangle using the existing playback clock. Unsupported image/provider paths use the existing trusted reference without guessing coordinates.

**Tech Stack:** Existing TypeScript/Express/Mongoose AI gateway, Gemini adapter, React/SVG, browser speech, Playwright; no new service or production collection.

**Spec:** ../specs/2026-10-17-whiteboard-image-explanation-design.md — scope approved by owner message «ابد» after the design review question; execution plan still awaits review.

## Global Constraints

- Preserve v1, authorization, historical scores, learning progress, billing/quota policy and original question/image records. No bulk bank generation or production content writes.
- Four image marks maximum; box/ellipse/arrow only; finite coordinates in[0,1], valid scene reference and positive area/arrow length. No model-supplied free SVG/HTML.
- HTTPS approved R2 question origin/path only, no redirects; actual PNG/JPEG/WebP signature, at most1,572,864bytes,5second fetch deadline including body; reject SVG.
- At most one actual vision provider HTTP attempt per plan,12second deadline,900output tokens; no hidden adapter retry/model fallback. Cache lookup before image fetch.
- No unsupported-provider image discard. Gemini only for this slice, subject to existing configured route/paid/quota policy; unavailable means trusted local fallback.
- Native implementation in this session is recommended to honor the owner's low-token preference; existing independent branch review remains required.

## Review Focus

1. Stable image URL with changed bytes: version-bound cache and rendering; missing reliable version means no image marks (Tasks1–3).
2. Misleading Content-Length or slowly streamed body: count actual bytes, abort body and entire fetch by deadline (Task2).
3. A Gemini pool with several keys/models: one failed image attempt must not fan out paid retries (Task2).
4. Closing/collapsing/reopening an image or resizing after it loads: no stale dimensions or floating annotations (Task4).
5. Historical attempt/source mismatch or another student's review: no canonical image substitution, image fetch or shared-cache disclosure (Task3).

## Task1 — Wire contract and image identity

**Files:** new `server/src/modules/ai/contracts/teachingImageStoryboard.ts`, new `server/src/modules/ai/application/teachingImageIdentity.ts`; update `types.ts`, `services/apiGroups/aiApi.ts`, `server/src/modules/quizzes/presentation/questionPresentation.ts`, `server/src/routes/review.routes.ts`, and the existing review-library question projection located by its GET handler. Do not expose raw sourceMeta/answer fields.

**Interfaces:** `TeachingImageMark = {id,sceneId,kind:'box'|'ellipse',x,y,width,height} | {id,sceneId,kind:'arrow',from:{x,y},to:{x,y}}`; `TeachingStoryboardV2 = {version:2,language,scenes:TeachingScene[],image:{url:string,version:string,marks:TeachingImageMark[]}}`. `validateTeachingImageStoryboard(value:unknown):TeachingStoryboardV2|null` reuses v1 scene validation; invalid marks remove the image layer, invalid scenes reject the plan. `teachingImageIdentity(question):{url:string,version:string}|null` hashes canonical imageUrl plus sourceMeta.imageHash/imageVersion; without a reliable image version returns null. Add optional safe `teachingImageVersion:string` to current authorized question DTOs before stripping sourceMeta; legacy/historical payloads lacking it retain v1.

- [ ] Write `scripts/test-teaching-image.ts`: accept four valid marks; fifth,NaN,Infinity,negative/overflow coordinates,zero area,zero-length arrow,duplicate IDs,missing scene,HTML/free paths are refused without losing valid text. Assert v1 unchanged; same URL/different image hash changes identity; learner projection never adds correctOptionIndex/sourceMeta. Run and observe RED.
- [ ] Implement the interfaces and additive DTOs; extend boardMode with `storyboard_v2` and optional `imageVersion` (opaque version only, never image URL/Base64 from learner). Require server/client version agreement before marks.
- [ ] Run `node --import ./server/node_modules/tsx/dist/loader.mjs scripts/test-teaching-image.ts` and existing `scripts/test-teaching-storyboard.ts`; expect PASS. Commit exact files.

## Task2 — Bounded image loading and one-attempt vision

**Files:** new `server/src/modules/ai/infrastructure/teachingQuestionImage.ts`, new `server/src/modules/ai/application/teachingVisionPolicy.ts`; update provider adapters and the `AiGatewayCallOptions/callAiWithMeta` bridge in `server/src/routes/ai.routes.ts` without moving unrelated gateway behavior.

**Interfaces:** `loadTeachingQuestionImage(identity,policy,fetchImpl):Promise<{data:string,mimeType:'image/png'|'image/jpeg'|'image/webp'}|null>`; policy has approved URL base,maxBytes1_572_864,timeoutMs5000. `AiProviderCallOptions.singleAttempt?:boolean`; `AiGatewayCallOptions.requiredImage?:true` filters providers before dispatch and refuses unsupported ones. For this path singleAttempt prevents extra key/pool/model attempts and caps total provider time at12000ms/maxOutputTokens900. Existing text calls retain behavior and accounting. Base64 is transient and never logged/cached.

- [ ] Extend `test-teaching-image.ts` with fake streams: redirected/internal/nonapproved origin/path,encoded path escape,unsupported/mismatched magic bytes,oversize with absent/false Content-Length,slow body/headers,disconnect; assert null,abort and no subsequent provider call. Assert exact limit accepted and limit+1 rejected. Observe RED.
- [ ] Add mocked adapter/gateway assertions: missing Gemini,policy-denied paid pool and unsupported provider never receive an image; several keys/models with first failure still yield exactly one HTTP attempt. Preserve existing text retry tests.
- [ ] Implement loader/policy/singleAttempt, then run focused tests and server typecheck `node server/node_modules/typescript/bin/tsc --noEmit -p server/tsconfig.json`; expect PASS. Commit exact files.

## Task3 — Authorized cached visual lesson

**Files:** new `server/src/modules/ai/application/teachingImageLesson.ts`; update `sharedTeachingScenario.ts`, `compactTeachingPlan.ts`, `questionTeachingPlan.ts`, and only the question-assistant handler in `server/src/routes/ai.routes.ts`.

**Interfaces:** `generateTeachingImageLesson({identity,reference,prompt,language,loadImage,callVision}):Promise<{text:string,storyboard:TeachingStoryboardV2|null,imageSentToProvider:boolean}>`. Compact output adds bounded marks tied to server-created scene IDs; server still inserts the trusted reference answer. Never accept a provider answer as a new answer key. Version/image metadata comes from the server rather than model assertions.

- [ ] Extend `scripts/test-teaching-scenario-cache.ts` and isolated HTTP coverage in new `scripts/test-teaching-image-http.ts`: ownership403 before cache/fetch; school isolation; private followups stay private; current-source match only; historical mismatch stays v1; hit gives0fetch/0provider,miss gives1fetch/at most1provider; changed hash/reference/contract invalidates key; error returns existing reference with no second paid attempt. Observe RED.
- [ ] Put image generation inside existing authorized,version-keyed inflight/cache boundary. Separate v2 keys from v1; include image identity and contract/policy version; preserve TTL. Add truthful imageSentToProvider/cacheHit/usage metadata with no bytes or learner identity in shared prompts.
- [ ] Run image HTTP and shared-cache tests using isolated Mongo (reuse existing integration harness); expect PASS and zero writes outside isolated fixtures. Commit exact files.

## Task4 — Scene-linked image drawing

**Files:** new `components/results/teaching/TeachingImageOverlay.tsx`; update `QuestionPreview.tsx`, `TeachingBoard.tsx`, `useTeachingPlayback.ts`, `InteractiveSmartTeacher.tsx`, `QuestionAssistantPanel.tsx`, and the Results/ReviewSession/Favorites question-preview mappings only to carry teachingImageVersion.

**Interfaces:** `TeachingImageOverlay({image:{url,version},marks,sceneIndex,elapsedMs,scenes,expectedImageVersion})`; component draws only when both displayed URL and version match. `QuestionPreview` owns an inline wrapper fitting the rendered image content (not object-contain whitespace); ResizeObserver/image load updates geometry. Annotation draw duration250ms,part of the deterministic scene timeline, with the existing WhiteboardHand at the actual SVG path point. No CSS animation independent of playback.

- [ ] Add five synthetic cases to new `scripts/fixtures/teaching-image.tsx` and `scripts/test-teaching-image-browser.mjs`: geometry,fraction image,table,Arabic image,and no image. RED assertions cover320/390/1280,portrait/landscape,late image load,collapse/reopen,failed image,version/URL mismatch,pause/seek/replay/speed,reduced-motion,and no page overflow. No real provider/data writes.
- [ ] Implement v2 negotiation only for reliable loaded identity; v1/text fallback otherwise. Preserve one-button entry,existing audio recovery,optional transcript and source question content. Bind marks to active scene and wait for actual narration start.
- [ ] Run existing tutor/motion browser tests plus new image test; visually inspect real styled screenshots including fractions and marks. Expect PASS. Commit exact files.

## Task5 — Verification and scoped publication

**Files:** update `.github/workflows/teaching-board-gate.yml`, directly affected architecture/reference maps, current Master Control/execution state, and add `docs/audits/WHITEBOARD_IMAGE_EXPLANATION_2026-10-17.md`. No new workflow, manual Vercel preview or production migration.

- [ ] Run focused contract/cache/HTTP/browser tests serially on the memory-constrained Windows host. Run root/server typechecks and build proportionately; interrupted checks are not PASS. Add new tests to the existing teaching-board gate.
- [ ] Perform at most3 live vision calls with synthetic nonpersonal images through existing configured settings and quota/ledger. Record actual provider attempts,cost,latency and manual reference/region review. If unavailable or incorrect, leave image rollout disabled and report unproven; do not replace this with mock certification. Implement rollout under existing product settings/configuration,default off until this gate passes.
- [ ] Obtain one focused independent whole-branch review; fix blockers. Update tests/evidence on exact final source,stage exact files,push one focused PR,attach it,and wait for all required CI. Merge only with passing checks and authorized scope; preserve unrelated owner/generated changes.
- [ ] Verify automatic main release identity,READY deployment and actual published owned learner UI,with response interception clearly labeled where used. Confirm no question/result/progress production writes. Enable image mode only after real visual gate passes; keep text fallback available. Record precise final evidence and remaining handwriting/scale limitations.

## Self-review and handoff

Spec coverage: Tasks1/3 own identity,privacy and cache; Task2 owns bounded media/provider cost; Task4 owns image geometry/playback; Task5 owns live correctness and release gates. The five Review Focus conditions have explicit tests above. No new database collection or service is required. Implementation method proposed: native in this session,then one independent final review; owner reviews this plan before product code changes.
