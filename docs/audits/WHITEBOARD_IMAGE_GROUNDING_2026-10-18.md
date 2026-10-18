# Image grounding correction — 2026-10-18

Status: LOCAL_VERIFIED / LIVE_NOT_PROVEN; image rollout remains OFF. Baseline main09908539 (PR572); branch codex/whiteboard-image-grounding.

## Observed defect and bounded correction

The previous clean live geometry sample returned the right answer but placed one box away from digit6. Playback geometry itself passed synthetic tests. The provider prompt requested custom x/y/width/height and ambiguously excluded margins. This is a plausible grounding-contract cause, not proof that the model's semantic localization is repaired.

[Google's image-understanding documentation](https://ai.google.dev/gemini-api/docs/image-understanding) specifies box_2d as [ymin,xmin,ymax,xmax], normalized0..1000. The internal provider schema now uses that representation and explicitly includes the entire original image and white margins. Server-only teachingImageGrounding validates finite integer tuples and converts them to the unchanged public normalized0..1 marks. Arrows use native [y,x] point pairs. Invalid, mixed legacy, reversed or out-of-bounds coordinates discard only the image layer; trusted explanation remains usable.

The private/shared v2 cache policy changes to native-box2d-v1, preventing old coordinate plans from filling the new path. Text v1 cache identity is unchanged. No image processing service, package, OCR, second provider attempt, storage migration, public DTO change, grading change or production content write was added.

## Evidence

- New conversion regression failed against old source, then passed;14 synthetic generation fixtures cover conversion, axes, invalid tuples, invalid/mixed legacy marks, trusted-answer fallback and one call per fixture.
- Lesson, identity, shared-cache, single-attempt provider and AI8 regressions passed. The cache test asserts exact legacy v1 identity and invalidation of the old v2 policy.
- Server typecheck exited0. Isolated authenticated HTTP passed after native fixture conversion; strengthened HTTP assertions also require the native provider schema and unchanged public geometry.
- Existing image/playback browser contracts remain unchanged; final CI will rerun them.
- The opt-in live audit now requires an explicit model argument and records provider HTTP statuses, preventing accidental use of a local env model during a limited audit.

The previous five approved actual HTTP attempts remain spent. Two additional clean-image calls were requested from the owner and have not been performed at this checkpoint. Local mocks do not certify model accuracy. Independent focused review, exact-head CI and publication remain pending. Keep the feature OFF unless a valid live localization gate passes.
