# ALMEAA Adaptive Phase 8 — Incremental School Skill Aggregates & Drill-down

Status: IMPLEMENTED / STACKED; EXACT-HEAD CI PENDING PREDECESSOR GATES
Date: 2026-09-21

## Objective
Provide school/staff skill analytics without rescanning full QuizResult/QuestionAttempt history on every dashboard request. The hierarchy is:
`school -> path -> subject -> class/group -> student -> skill`
with reverse drill-down:
`path/subject/skill -> classes -> students`.

## Write-side read model
Two additive collections are introduced:
1. `SchoolSkillEvidence`: one immutable/idempotent evidence row per school result + path + subject + skill.
2. `SchoolSkillAggregate`: one materialized row per school + class + user + path + subject + skill.

The quiz submission side-effect:
- does nothing for results without a verified schoolId;
- derives school/class only from the existing server-authoritative submission context;
- bulk-upserts evidence by stable `evidenceKey`;
- recomputes only touched aggregate scopes from the evidence ledger;
- materializes cumulative mastery and a recent-five scoped window;
- remains non-critical to quiz submission success.

No school/class scope is inferred from current membership after the fact.

## Idempotency
`evidenceKey = result/submission identity + pathId + subjectId + skillId`.
Retrying the same school result does not add a second evidence row. Aggregate recomputation occurs from the evidence ledger after the upsert, so a retry can repair a previously interrupted aggregate write.

## Metrics
The read model exposes:
- cumulative evidence-weighted mastery;
- recent mastery from the five most recent result-evidence rows in the exact user/path/subject/skill scope;
- improving/stable/declining trend;
- evidence confidence;
- student coverage;
- support count/rate using the shared support-mastery threshold;
- last evidence time.

Coverage and support rate always include denominators; if authorization scope is truncated the response and UI explicitly flag that condition.

## Authorization and taxonomy
- Endpoint is staff-only: admin, school_admin, supervisor, teacher.
- Student set is resolved through the existing report authority owner, not from request parameters.
- teacher managedPathIds / managedSubjectIds remain enforced.
- class drill-down filters the already-authorized students by group membership before querying aggregate rows.
- studentId cannot escape the authorized set.
- pathId + subjectId + skillId are required for class/student drill-down.
- same-named skills in different paths/subjects remain independent.

## New endpoint
`GET /quizzes/analytics/school-skills`

Bounded query:
- groupBy = skill | class | student
- optional pathId, subjectId, classId, studentId, skillId
- limit max 100
- class/student drill-down requires pathId + subjectId + skillId

The endpoint reads `SchoolSkillAggregate` only. It does not scan QuizResult or QuestionAttempt.

## UI
`SchoolSkillAggregatePanel` is integrated into staff Reports:
- initial skill summary uses the currently selected path/subject/class filters;
- classes load only after a skill is opened;
- students load only after a class is opened;
- school_admin is explicitly labeled and included in staff report controls;
- no preload of every class/student hierarchy.

## Live data audit
Read-only Atlas query against `almeaa.quizresults` for rows with both non-empty `schoolId` and skill analysis returned **0 historical documents** at implementation time.

Therefore:
- no historical school aggregate backfill was executed;
- no current membership was used to guess historical school/class ownership;
- Phase 8 becomes populated incrementally by future verified school assessment submissions.

## Resource report
### VERIFIED
- New dashboard endpoint reads the aggregate collection only.
- Initial UI request returns max 20 skill rows; class max 50; student max 100.
- No media payload and no AI call.
- No broad student-history fetch is introduced by the new panel.
- School read-model write is skipped entirely for non-school results.
- Evidence writes and aggregate updates use bulkWrite rather than per-row request loops.
- Recent window is five scoped result-evidence rows, not global recent history.

### PARTIAL
- Write-side recomputation issues two scoped aggregation pipelines for touched scopes after a school result. This is bounded by the result's touched skill scopes but production p50/p95 cannot be measured until real school evidence exists.
- Proposed indexes match the implemented query shapes, but live index usage cannot be proven before deployment/data.

### NOT PROVEN YET
- Production latency p50/p95 and CPU/memory impact with representative school volume.
- Exact transferred-byte delta under representative institutional traffic.
These belong to Phase 10 benchmark/hardening and exact-head production-readiness evidence.

## Schema/index policy
Additive only. No existing collection or index is dropped or rewritten.
- SchoolSkillEvidence: unique evidenceKey + exact scoped chronological index.
- SchoolSkillAggregate: unique scoped identity + school/path/subject/class/skill mastery read index.

## Verification
Focused contract:
`node scripts/smoke-adaptive-phase8-school-skill-aggregates-contract.mjs`

Required before merge:
- frontend/server typecheck and build
- existing adaptive/report/security contracts
- predecessor Phase 7 closure
- exact-head required CI

## Rollback
The two read-model collections, side-effect hook, endpoint and UI panel are isolated/additive. They can be disabled or removed without rewriting QuizResult, QuestionAttempt, SkillProgress, school membership, or assessment scoring.
