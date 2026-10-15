# TAH-MATH V2 — intensive-run checkpoint (2026-10-15 Asia/Riyadh)

**Status: NOT FINAL CLOSED.** Source of truth: MongoDB Atlas `almeaa`, `subjectId=sub_1777784609152`, `pathId=p_1777779653351`. This report records verified read-after-write results; does not mark unseen images approved.

## Scheduled work
Five hourly runs are configured at 04:00, 05:00, 06:00, 07:00 and 08:00 Asia/Riyadh on 2026-10-15. Work on *mathematics subject only*; do not create subject-level mocks. Each run must read live Atlas/GitHub state first and use compare-and-set on question status before any write.

## Current verified snapshot
- **2,385 total** math questions. **151 approved** with 151 explanations and 151 verified option sets; **2,234 draft** (976 from `TAHMATHV2_COL26` and 1,258 from `TAHMATHV2_COL26OLD`).
- Source pictures: **36 / 1,012 COL26 approved in total**, including 2 approved before today's intensive run; COL26OLD still 0 / 1,258 approved. 115 independent original text questions previously approved.
- Since the preceding user-turn snapshot (**117 approved**), **34 additional image questions were scientifically approved**, from the verified 36-image batch, with exact source crop pixels and SHA checks, semantic/math solution, four actual options (diagram descriptions for diagram-only alternatives), source-mapped subskills and saved explanations. Other simultaneous hourly automation actions may be contributing to the same 34; avoid double-credit for work.
- **2 named scientific HOLD cases**, still draft and excluded: `q_tahmath_v2_col26_p005_q02` ambiguous numerical progression; `q_tahmath_v2_col26_p006_q15` source logic/conditional premise/answer ambiguity. Both include `DO_NOT_PUBLISH` in reviewer notes.
- **171 drills**: 3 approved, published and publicly verified at API; 168 draft. **57 ordinary tests** remain draft, not mock exams. All main/subtopics retain parent/free inheritance (30 main, 110 child, first 5 main free including 20 child); no changes to other subjects or student attempts.
- Distinct questions referenced by assessments: 2,385 (prior verification); no new question bank rows inserted in this intensive turn.

## Work proof and provenance
- Batch manifest: `ops/tah-math-v2-qa-batch-36-20261015.json` contains 36 precise question IDs, R2 hashes, existing option letter, skill claims and source item IDs.
- Downloader: `scripts/tah-math-v2-qa-batch-36.mjs` and `.github/workflows/tah-math-v2-qa-batch-36.yml` retrieve actual R2 bytes in 3 parallel groups of 12 with SHA-256 checks. Workflow: https://github.com/nasef6464/almeaacodax/actions/runs/38662865501 . Jobs (0/12/24) completed successfully; the agent visually inspected the retrieved images, did not merely trust hashes.
- Previously verified live published drills API: https://github.com/nasef6464/almeaacodax/actions/runs/38656547823 (Render canonical `https://almeaacodax-k2ux.onrender.com/api`). One stale published `assessmentversions` version1 for foundation quiz `TAH-MATH-VIDEO-02-01` was safely superseded by published version2; continue to reconcile version snapshots on every newly published quiz.
- GitHub work-in-progress PR #553: https://github.com/nasef6464/almeaacodax/pull/553 ; pending merge/production deployment and authenticated learner E2E. **Do not interpret content approved in Atlas as quiz published/visible.**
- Review attribution: `ALMEAA_AI_INDEPENDENT_IMAGE_MATH_QA_20261015` / equivalent other concurrent approvedBy markers; **AI math/browse review, NOT human-teacher sign-off**.

## Next execution priority
1. Start from 2,234 draft photo questions, excluding HOLD cases unless source corrected. Fetch new crops in larger verified batches (target 400 fresh photos/run only to extent accurately visually/math reviewed; record actual count and misses).
2. Check image cropping/wording, calculate key independently, correct topic/subskill taxonomy and explanation; use Atlas guarded draft-to-approved updates only; log exact issue, leave any ambiguity HOLD.
3. Do not publish mixed/unapproved drills or tests. Select drills whose full question ID set is approved, validate entitlement and RBAC, publish new immutable `assessmentversions` with safe superseding, then external Render learner-safe smoke and full-browser student answer/result E2E.
4. Finish PR #553 security/admin preview deployment/CI; avoid edits to four-subject path-wide mock exams.
5. Never claim FINAL CLOSED until all required subject questions and assessments are verified, published as appropriate, and user roles/images/results are validated.

Do not artificially create or duplicate source questions to meet a numeric target; independence and safety override velocity.
