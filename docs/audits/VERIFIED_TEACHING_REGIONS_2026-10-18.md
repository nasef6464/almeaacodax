# Verified teaching image regions — 2026-10-18

Status: VERIFIED_LOCAL / RELEASE_PENDING. Baseline main/cfc92fb6; branch codex/verified-teaching-regions. Owner approved bounded implementation.

Staff can draw up to four normalized image boxes, name/reorder/delete, explicitly approve and save through existing Question CRUD. Image replacement invalidates approval (including API-only replacement). Identity hashes order/content; legacy identity is unchanged without approved regions. Metadata is optional and absent on old questions. No migration or bank backfill.

Authorized review explanation reuses existing text generation; deterministic composition attaches ordered boxes to the first scene only when canonical/current image identity matches. Private followups and historical image mismatches keep baseline. Approved geometry overrides generated geometry. No extra provider request, image dispatch, fetch, service or collection. Raw staff region metadata is stripped from both owned review DTOs. Existing learner sanitizer removes all aiContext. Free-form vision inference remains default OFF: prior seven authorized HTTP attempts are spent and live localization previously failed.

## Verification

- test-teaching-verified-regions.ts: strict normalized bounds, max4, unique IDs, source binding, identity/cache order, old identity, immutable invalidation, fallback guards, learner privacy, API Zod and Mongoose validation. RED → GREEN.
- test-teaching-regions-http.ts: actual isolated Mongo and authenticated HTTP, staff POST/PATCH persistence, student403, invalid400, outsider404, text-only provider request, deterministic boxes, shared cache reuse, reordering cache invalidation, API image replacement and historical fallback. PASS. Provider mocked; zero real calls or image loads.
- test-teaching-regions-browser.mjs: styled real editor + actual whiteboard at320/390/1280, drawing, draft/approval, source bounds, save/reopen in fixture, replacement, max4, keyboard adjustment, no overflow. PASS. Pointer uses mouse; real touch hardware unverified. Screenshots scratch/teaching-regions-final-ui.
- Root/server TypeScript PASS; image/lesson/motion/scenario-cache and adaptive-review/exam-payment regression PASS. Final exact-head CI required before merge.
- Independent read-only reviewer: no confirmed P1/P2. No provider or production data writes.

Production publication and scoped verification pending. Isolated persistence plus browser fixture do not prove production content editing; no real bank annotations were created. No claims of new audible phone certification, free-form vision accuracy, handwritten glyph generation or production scale.
