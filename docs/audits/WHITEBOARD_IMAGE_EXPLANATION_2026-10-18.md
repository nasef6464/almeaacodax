# Whiteboard image explanation — 2026-10-18

Status: IMPLEMENTED_VALIDATION_PENDING. Baseline main/89039a11; branch codex/whiteboard-image-explanation. Default AI_TEACHING_IMAGE_ENABLED=false. This is not live vision certification or production closure.

## Delivered boundary

Additive v2 plans carry up to four bounded box/ellipse/arrow marks, linked to the existing narration clock. Canonical current question identity gates image use; historical mismatches retain v1. Images load only from configured R2 question paths with HTTPS, no redirects, verified PNG/JPEG/WebP signatures, 1.5MiB actual-body limit and 5s deadline. A single Gemini attempt has a 12s bound and 900 output-token limit. Image bytes stay transient. Existing quota, accounting, auth, school isolation and caches are reused; no new service, key, video or audio blob.

The client measures the rendered image rather than its surrounding container, checks URL/version, and supports collapse, failure, pause, seek, speed and reduced motion. Trusted reference answers remain server-owned. No historical results, scores or production content were rewritten. Handwritten glyph strokes remain deferred.

## Verification evidence

- Contract/identity, loader, single-attempt provider/body timeout, generation/fallback, timeline, legacy storyboard/audio/cache tests passed locally.
- Actual isolated HTTP router/auth tests passed: ownership, school isolation, historical fallback, missing-version request preceding valid vision request, changed image hash, cache hit=0 image fetches/0 provider calls, and no image bytes in cache.
- Synthetic styled browser tests passed for geometry, fractions, table, Arabic image and no-image cases at 320/390/1280px, plus image bounds, mismatch/collapse/failure and reduced motion. Latest clean artifacts: scratch/teaching-image-clean-sources.
- Root and server typechecks exited0. Full-tutor and motion browser regressions passed on current code; exact-head CI remains pending.
- Independent whole-branch review found two P2 issues: expanded solution annotation order and v2 cache eligibility poisoning. Both were fixed with regression coverage. A narrow re-review could not run because the reviewer account reached its usage limit; independent re-approval is not claimed.

## Real-provider evidence and limitation

Three approved actual Gemini2.5 requests used the existing credential and ordinary local gateway/quota/ledger, synthetic images, and disposable loopback Mongo only. Attempt1 used 1267 actual tokens (133 output), 3641ms, and returned no marks. Attempts2/3 used 1480/1570 tokens (316/327 output), 4376/3610ms, and returned valid plan structures with marks. Aggregate: 3 actual requests, 4317 actual tokens, 776 output tokens. Provider pricing was unknown; estimated zero is not a cost claim.

Manual review invalidated the first region-quality evidence: screenshots of the source image also captured the test overlay and cartoon hand. The exporter now hides that overlay before capturing clean source PNGs; clean geometry/fraction sources were visually inspected. The owner explicitly approved two additional calls, increasing the task cap to5. The first selected the local env model gemini-4-argon and returned trusted local fallback after one actual HTTP attempt. The last explicitly reused the previously working gemini-2.5-flash, returned valid v2 (1163 input,311 output,1474 total tokens;3375ms), but manual review showed the first box missed the digit6. Therefore the clean-source live localization gate FAILED. Rollout stays OFF. Total5 actual HTTP attempts; known successful usage5791 tokens,1087 output; the failed attempt provides no trustworthy consumed-token/cost evidence. No further calls are authorized.

Exact artifacts for the added calls: scratch/teaching-image-live-clean.json, scratch/teaching-image-live-clean-geometry.json and scratch/live-clean-geometry-regions.png. One clean geometry case is insufficient for broader mathematical vision certification even if its localization had passed.

Artifacts are local scratch evidence, not tracked heavy PNGs: teaching-image-live-proof.json, teaching-image-live-final.json, live-marks-Geometry.png, live-marks-Fraction.png, and teaching-image-clean-sources/. They contain synthetic samples only. The opt-in audit script requires explicit credential/image paths and never prints keys.

## Remaining release work

PR572 is open and attached. The teaching-board CI gate passed on88f4b23b. Initial Cross-phase CI failed a source-fragment contract requiring direct safeQuestion return. This was reproduced locally, the sanitizer retained that return with conditional version assignment, and the six contract assertions plus identity/security regression passed without weakening checks. Core architecture also identified the newly approved env flag missing from the explicit extension registry and the provider adapter crossing400 lines. The flag was registered without changing the immutable baseline; deadline/body transport was extracted to aiResponseTransport, keeping the adapter398 lines and the83-file hotspot budget unchanged. Provider and legacy AI3/AI8/config contracts passed after extraction.

Verify required CI on the corrected exact head, then verify automatic main deployment and the published owned learner journey. Production vision activation remains blocked by clean-source localization failure. Do not infer handwriting, scale capacity or general mathematical correctness from these bounded tests.

The initial Full-stack gate also failed its exact due-review projection source contract after the additive imageHash/imageVersion selection. Updated the explicit allowlist to those two fields and strengthened assertions that only derived identity reaches a populated learner DTO, without raw sourceMeta or answer keys. Regression passed; no production access policy changed. Server typecheck passed after transport extraction.

## Post-publication checkpoint (local evidence update)
PR572 merged099085397a02aa3e33d3d4c031c40f0a2e37a5dc from tested source84d5d9d230f804d57a8405acb2be96e413366e29:19SUCCESS/5conditionalSKIP/all3requiredSUCCESS. Vercel dpl_Gc6WMedmwSpbGf59iWfpgdpk6QD5 production READY with main alias; API099085397a02/ready=true/database connected. Post Deploy Smoke39105285466 SUCCESS. Actual published owned student favorites UI passed at390px, with1synthetic AI response and locally intercepted speech,0provider calls/0domain writes/19APIreads. This proves published rendering and retained v1 journey, not live vision quality or new real audible-phone testing. Final status PARTIAL_PUBLISHED_OFF: image-localization gate failed and default image rollout stays disabled. Local post-release documentation is retained for the next focused docs batch; no code changed after tested source.
