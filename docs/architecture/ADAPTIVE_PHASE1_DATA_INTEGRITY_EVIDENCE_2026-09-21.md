# ALMEAA Adaptive Phase 1 — Data Integrity Evidence

Date: 2026-09-21 (Asia/Riyadh)  
Branch: `chatgpt/adaptive-phase1-data-integrity`  
Stacked on: PR #186 / `chatgpt/residual-structural-question-skill-audit`

## Status

Phase 1 is **IN_PROGRESS** until exact-head CI is green and the guarded mapping audit is re-run from the merged/deployed code path. No production write was performed during this evidence pass.

## Read-only live Atlas baseline

Atlas project: `almeaacodax`  
Cluster: `almeaa`  
Database: `almeaa`

Collection counts observed:

| Collection | Count |
|---|---:|
| paths | 4 |
| subjects | 12 |
| sections | 81 |
| skills | 170 |
| topics | 210 |
| questions | 3,252 |
| quizzes | 219 |
| skillprogresses | 743 |
| quizresults | 4 |
| questionattempts | 15 |

The platform contains separate paths for القدرات، التحصيلي، نافس, plus a synthetic intervention path. Student analytics must therefore remain path/subject scoped.

## Question → Skill integrity

Current live question bank: **3,252** questions.

- Questions with no skill linkage: **0**.
- Unique skill identifiers referenced by `questions.skillIds`: **209**.
- Orphan question skill identifiers: **0**.
- Question/skill path or effective-subject scope mismatches: **0**.
- Legacy quant skill documents under `p_qudrat/sub_quant`: **42**, but current questions reference **0** of them. They remain compatibility debt and MUST NOT be deleted until consumer/cutover proof exists.

Current abilities taxonomy represented by the 209 identifiers:

| Subject | Main skills | Embedded subskills |
|---|---:|---:|
| الكمي | 25 | 95 |
| اللفظي | 13 | 76 |
| Total | 38 | 171 |

### Subject compatibility finding

Most questions still persist the effective subject identifier in the historical `subject` field.

Observed distribution:
- 3,178 questions do not currently have `subjectId`.
- 74 questions have `subjectId = sub_1777779748206`.
- Effective quantitative/verbal scope is still correctly recoverable as `subjectId || subject`.

Therefore:
1. reads/analytics must preserve `subjectId || subject` compatibility;
2. `subjectId` is now preserved by the Mongoose/write/type contracts instead of being silently dropped;
3. a bulk live backfill is **not** performed in this phase without a separate guarded migration and verification.

## Foundation mapping proof

Strict deterministic compatibility mapping was tested with:

`pathId + subjectId + sectionId + normalized subskill name == child topic title`

Results:

| Subject | Subskills | Exactly one topic | Missing | Ambiguous | With drill ref | Missing drill document | With lesson ref |
|---|---:|---:|---:|---:|---:|---:|---:|
| الكمي | 95 | 95 | 0 | 0 | 95 | 0 | 20 |
| اللفظي | 76 | 76 | 0 | 0 | 76 | 0 | 0 |
| Total | 171 | 171 | 0 | 0 | 171 | 0 | 20 |

A title-only match is unsafe because repeated verbal labels such as الترادف / التضاد / المقارنة occur in multiple sections. Section + subject + path removes the ambiguity.

### Content gap is not data corruption

- All 171 subskills have an exact foundation subtopic and a resolvable drill.
- Only 20 quantitative subskills currently have lesson refs.
- Verbal currently has 0 lesson refs and remains text-first.

Missing lesson/video content must be reported as a content-coverage gap, not as a broken taxonomy mapping.

## Runtime contract defect proven before the fix

The live taxonomy endpoint was read from:

`/api/taxonomy/bootstrap?phase=full`

Before this Phase 1 change it returned:
- 74 skill documents total in the public active taxonomy;
- quantitative main docs: 25;
- verbal main docs: 13;
- documents exposing `order`: **0**;
- documents exposing `subSkills`: **0**;
- returned embedded subskills: **0**.

Atlas already contained the embedded hierarchy. The loss occurred in the application contract because the Mongoose `Skill` schema and bootstrap projections omitted `order/subSkills`.

Phase 1 fixes this additively in:
- `server/src/models/Skill.ts`
- `server/src/routes/taxonomy.routes.ts`
- `types.ts`
- `store/useStore.ts`

and guards it with:
- `scripts/smoke-modern-skill-taxonomy-contract.mjs`

## Explicit Topic → Skill contract

Topics previously had no explicit `skillId`, forcing name/id-pattern inference. Phase 1 adds an optional `Topic.skillId` plus a sparse scoped index.

A guarded command is added:

`npm --prefix server run audit:foundation-skill-mapping`

Default behavior is **DRY_RUN**. It refuses writes unless all integrity preconditions pass. Applying requires:

`ALMEAA_APPLY_FOUNDATION_SKILL_MAPPING=true`

The write gate requires:
- every embedded subskill maps exactly once;
- zero missing/ambiguous mappings;
- zero conflicting existing topic mappings;
- every mapped topic has a drill;
- every drill reference resolves;
- zero orphan question skill references;
- zero question/skill scope mismatches.

No live write has been performed in this phase yet.

## Question persistence contract defect

Live raw documents contain newer fields such as:
- `subjectId`
- `skillId`
- `subSkillId`

while the previous `QuestionModel` omitted them. Phase 1 now preserves them through:
- `server/src/models/Question.ts`
- `server/src/modules/quizzes/http/questionQuerySchemas.ts`
- frontend `Question` type.

The historical `subject` field remains supported; no destructive rename occurs.

## Resource implications

This phase adds no media transfer and no AI calls.

Expected runtime impact:
- small additional taxonomy metadata (`order/subSkills`) only when taxonomy bootstrap asks for skills;
- explicit `Topic.skillId` removes future fuzzy scans and makes recommendation lookups/indexing deterministic;
- no full question-history payload was added;
- audit reads only identifiers/scope/link arrays, not question text or media.

## Exit criteria

Phase 1 can be marked DONE only after:
1. frontend typecheck Green;
2. API typecheck/build Green;
3. architecture/module gates Green;
4. modern skill hierarchy contract Green;
5. adaptive data integrity contract Green;
6. exact-head required CI Green;
7. guarded live dry-run after deployed/merged contract still reports 171/171, zero missing/ambiguous/conflict/orphans/scope mismatch;
8. handoff/current-state updated with exact SHA/PR/CI run IDs.

## Next phase after closure

Phase 2: idempotent skill evidence + recent-five scoped analytics + double-count prevention + query/index audit. It must use:
`userId + pathId + subjectId + skillId`
and keep the default recent window configurable rather than hard-coded.


## Live index baseline

Read-only Atlas index inspection was captured before adding any production index.

Relevant existing coverage:
- `questions`: `pathId + subject + sectionId + approvalStatus`, `skillIds + difficulty`, plus subject/update and workflow indexes.
- `skills`: path/subject/section indexes and scoped section composites.
- `topics`: path/subject/section/show/order, parent/order, lessonIds, quizIds, libraryItemIds.
- `skillprogresses`: user/skill unique, user/status/mastery, subject/status/mastery, path/subject/section.
- `quizresults`: user/createdAt, quiz/createdAt, skill-analysis indexes and submission identity.
- `questionattempts`: user/question/createdAt, user/skillIds/createdAt, path/subject/section/createdAt.

The source model contains some newer desired indexes that are not yet visible in the live Atlas index list. Phase 2 MUST validate actual query shapes and `explain`/latency before adding or changing indexes; no speculative production index build is part of Phase 1.
