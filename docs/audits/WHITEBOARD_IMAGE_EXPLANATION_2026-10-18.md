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

Manual review invalidated the region-quality gate: screenshots of the source image also captured the test overlay and cartoon hand. Thus correct solutions and valid structures do not establish localization quality. The exporter now hides that overlay before capturing clean source PNGs; clean geometry/fraction sources were visually inspected. No further provider requests are authorized by the original three-call cap. The owner subsequently approved up to two additional clean-source calls (total task cap5); that bounded audit is running. Keep rollout OFF until a valid manual quality gate passes.

Artifacts are local scratch evidence, not tracked heavy PNGs: teaching-image-live-proof.json, teaching-image-live-final.json, live-marks-Geometry.png, live-marks-Fraction.png, and teaching-image-clean-sources/. They contain synthetic samples only. The opt-in audit script requires explicit credential/image paths and never prints keys.

## Remaining release work

Publish the focused PR, verify required CI on its exact head, then verify automatic main deployment and the published owned learner journey. Production vision activation remains conditional on clean-source live quality evidence. Do not infer handwriting, scale capacity or general mathematical correctness from these bounded tests.
