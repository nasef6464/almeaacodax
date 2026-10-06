# ALMEAA Adaptive Phase 5 — Smart Learning Path + Taxonomy-Scoped Dashboards

Status: IMPLEMENTED / AWAITING PREDECESSOR GATES + EXACT-HEAD CI
Date: 2026-09-21

## Objective
Make the learner's next-best-action path internal-first and deterministic, while ensuring student, teacher, supervisor, and report analytics stay isolated by learning taxonomy rather than blending skills across paths/subjects.

## Implemented
- Added an internal Smart Learning Path policy with deterministic ranking, bounded 5-item output, versioned fingerprinting, and a 50-entry in-memory cache.
- No AI request is required for normal path generation.
- Student Smart Path dashboard supports path then subject filtering from enrolled/data-driven taxonomy.
- Student Reports support path then subject filters before skill selection/recommendation.
- Staff Reports request path/subject scope from the API instead of downloading broad analytics then hiding rows.
- Quiz result list and analytics endpoints accept optional pathId/subjectId scope.
- Path+subject combinations are kept coherent with one $elemMatch when both filters are present.
- Supervisor skill-map aggregation keys by path + subject + skill; the UI adds dynamic path and subject filters.
- Teacher classroom skill radar no longer uses demo/static quantitative/verbal skill arrays. It reads finalized classroom history from the server.
- Teacher classroom reports and radar support class + path + subject scope.
- Classroom diagnostics key skill evidence by path + subject + skill and recompute scoped responses/correct counts after taxonomy filtering.

## Future taxonomy invariant
No current path/subject list is treated as exhaustive. New paths, subjects and skills flow from stored taxonomy/session/result data. IDs may be added later without modifying policy source.

## Resource/bandwidth rules
- Smart Learning Path is local/internal-first; no provider call for routine ranking.
- Recommendation output is capped at five actions.
- Fingerprint cache is bounded to 50 entries.
- Staff report filtering is pushed into API queries where supported to reduce transferred rows.
- Teacher classroom views reuse the existing classroom-history request and filter in-memory; no extra per-skill request loop is added.
- No speculative DB index is added. Atlas Performance Advisor previously returned zero suggested indexes and zero slow-query samples.

## Compatibility
Historical results without full path/subject scope remain readable. Scoped filters intentionally exclude evidence that cannot prove it belongs to the selected taxonomy; the unfiltered view remains available for legacy records.

## Verification
Focused contract:
`node scripts/smoke-adaptive-phase5-smart-path-scope-contract.mjs`

Required before merge:
- frontend typecheck/build
- server typecheck/build
- focused report/adaptive contracts
- predecessor Phase 4 closure
- exact-head required CI

## Exit
Phase 5 can merge only after the stacked predecessor order is satisfied and exact-head required gates are green.
