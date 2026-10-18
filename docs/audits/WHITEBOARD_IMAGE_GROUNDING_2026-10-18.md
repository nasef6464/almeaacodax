# Image grounding correction — 2026-10-18

Status: PARTIAL_PUBLISHED_OFF / LIVE_LOCALIZATION_FAILED; image rollout remains OFF. Baseline main09908539 (PR572); branch codex/whiteboard-image-grounding.

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

## Live audit and release checkpoint
The owner approved exactly2 further calls. Both Gemini2.5 HTTP statuses were200, yielding valid plans and actual usage: Geometry1226input/389output/1615total tokens,6209ms; Fraction1313input/359output/1672total,3302ms. Native batch3287tokens/748output; pricing unknown. Manual clean-source overlays FAILED localization: four geometry boxes in blank margin; fraction boxes partially cover numerators. Thus native conversion is locally correct but insufficient to certify model grounding. Keep rollout OFF. Exactly7taskHTTP attempts have now been authorized and used; no eighth is authorized.
Artifacts: scratch/teaching-native-live-proof.json and scratch/native-live-Geometry-regions.png / native-live-Fraction-regions.png. No production content/results/progress writes. Local fixture Mongo stopped after verifying its owned process/root; data folders preserved.
PR573 merged cfc92fb681a108fd14ea5e84c814ba0f58c46a91 from65981e96a0b9405e0326fd0d21d0db81772fb339 with16SUCCESS/5conditionalSKIP/all3requiredPASS. Publication identity and UI verification pending at this checkpoint. This local post-release evidence update is retained for the next focused documentation batch.

Publication verified: Vercel dpl_2oJrwLVtSfgar3K3iAyucXiToADn productionREADY/main alias matches cfc92fb6; API cfc92fb681a1/ready=true/database connected. Post Deploy Smoke39115136496 SUCCESS. Published owned learner UI390px PASS,1synthetic AI response and intercepted speech,0provider calls/0domain writes/21API reads. Initial health timeout during rollout was followed by matching healthy release identity; no unresolved runtime failure. This proves retained published v1 rendering, not successful image localization or fresh phone audio certification.
