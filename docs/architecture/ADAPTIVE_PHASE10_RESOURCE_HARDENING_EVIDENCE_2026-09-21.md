# ALMEAA Adaptive Phase 10 — Resource / DB / AI Hardening Evidence

Status: IMPLEMENTED; EXACT-HEAD CI PENDING
Date: 2026-09-21

## Scope
Phase 10 hardens the adaptive/mastery stack already implemented in Phases 2–9. It does not add a new learning authority. The work covers:
- multi-path / multi-subject SkillProgress scope restoration;
- recent-five evidence correctness;
- report evidence weighting;
- DB query/index evidence;
- review scheduling query support;
- AI school-budget query support;
- visual-question AI context minimization;
- guarded scoped-index cutover;
- live storage/media baseline.

Vercel preview quota is treated as an external deployment blocker only; it does not block code, Atlas verification, or GitHub exact-head work.

## Critical regression found and fixed
The stacked Phase 3–9 line had lost part of the clean Phase 2 scoped mastery implementation.

Before this Phase 10 repair:
- SkillProgress model still had legacy unique identity `userId + skillId`;
- write-side mastery looked up progress by `userId + skillId`;
- the learner skill-progress endpoint did not filter by path/subject;
- recent-five evidence summary was absent from this stack;
- student report skill aggregation averaged observations instead of evidence weighting.

Phase 10 restores the canonical contract:
`userId + pathId + subjectId + skillId`.

This is essential for future paths and subjects and prevents abilities/tahsili/NAFES-style scopes from bleeding into each other.

## Restored mastery evidence model
### Write side
`quizSubmissionSideEffects.ts` now:
- normalizes skill observations by path + subject + skill;
- batches existing SkillProgress reads;
- uses `bulkWrite` instead of one read/write pair per skill;
- keeps a bounded replay-key guard;
- keeps a separate recent evidence window;
- evidence-weights cumulative mastery;
- stores recent-five observations;
- supports QuizResult evidence and QuestionAttempt fallback;
- prefers completed result evidence so the same answer is not counted once as a question attempt and again inside the completed result.

### Read side
`GET /quizzes/skill-progress` now supports:
- `pathId`
- `subjectId`
- count-free reads
- cumulative mastery
- recent mastery
- recent evidence count/sample size
- trend

The client API accepts the same scoped filters.

## Student report analytics
Student skill aggregation now:
- keys by `pathId + subjectId + skillId`;
- uses `questionCount` as evidence weight;
- uses `correctCount` when available;
- takes QuestionAttempt only as per-skill compatibility fallback when completed result evidence is absent;
- computes recent mastery from the latest five evidence-bearing observations for the scoped skill;
- exposes trend, confidence, evidence count, and recent sample size;
- keeps cumulative mastery separate from recent mastery;
- exports both cumulative and recent mastery to the workbook.

The window default remains 5 and the server mastery helper keeps the window bounded/configurable at the domain-helper level.

## AI visual context hardening
Question Assistant remains explicit-click only.

Additional Phase 10 hardening:
- strips `<img>` markup from provider prompt text;
- strips direct image URLs;
- strips embedded `data:image;base64` payloads;
- replaces removed visual context with an explicit text marker;
- continues calling providers with text only;
- keeps `imageSentToProvider=false`;
- visual questions with no trusted written explanation remain blocked from external AI discussion.

This is stricter than only preventing image-byte upload: the provider also does not receive image URLs hidden inside question HTML/options.

## Live Atlas baseline
Read-only baseline on database `almeaa`:

| Collection | Documents | Storage |
|---|---:|---:|
| questions | 3,384 | 5.19 MB |
| skillprogresses | 743 | 353.46 KB |
| aiinteractions | 428 | 472.42 KB |
| quizresults | 4 | 303.59 KB |
| questionattempts | 15 | 5.46 KB |
| reviewcards | 0 | 0 B |

### Visual questions
Current live audit:
- visual/image questions: **2,310**
- visual/image questions missing written explanation: **0**

Sample question image URLs resolve directly to Cloudflare R2 public URLs; image bytes do not need to transit Render.

### Lesson media
Live lesson video URL distribution:
- YouTube: **30**
- external demo MP4 (w3schools): **20**

The external demo rows are legacy/content inventory, not Render-hosted media. No video bytes are being migrated through the API in this phase.

## SkillProgress integrity audit
Live Atlas audit before index cutover:
- duplicate `userId + pathId + subjectId + skillId` groups: **0**
- rows missing pathId/subjectId: **0**
- same `userId + skillId` stored in multiple live scopes: **0**

This proves the live data is safe to receive the canonical scoped unique index.

The current live legacy unique `userId + skillId` remains in place until the guarded cutover is executed after the canonical code is deployed. It is safe but temporarily more restrictive than the final identity.

## DB query evidence
### Before scoped-sort index
Legacy user mastery list on a representative user:
- 142 keys examined
- 142 docs examined
- 20 returned
- in-memory sort
- ~1 ms at current small data volume

### After code-aligned scoped-sort index
Created live non-destructive index:
`userId + pathId + subjectId + mastery + lastAttemptAt(-1)`

Representative scoped read:
- 9 keys examined
- 9 docs examined
- 9 returned
- IXSCAN with requested ordering
- no separate sort stage
- ~4 ms observed Atlas execution time

### QuizResult recent-user query
Existing `userId + createdAt(-1)`:
- 1 key examined
- 1 doc examined
- no sort spill
- 0 ms in sampled explain

### QuestionAttempt recent-user query
Existing `userId + createdAt(-1)`:
- 4 keys examined
- 4 docs examined
- 0 ms in sampled explain

### Review due query
Created live non-destructive index:
`userId + pathId + subjectId + nextReviewDate`

Explain:
- IXSCAN on the exact scoped due shape
- 0 keys/docs at current empty-card baseline
- no collection scan

### AI school budget
Created live non-destructive index:
`schoolId + endpoint + createdAt(-1)`

Explain for school Question Assistant budget shape:
- IXSCAN on the exact index
- 0 keys/docs in the sampled recent window
- no collection scan

No index was added merely because a field exists; every live index created here maps to an implemented query shape.

## Guarded unique-index cutover
Added:
`server/src/scripts/ensureAdaptiveMasteryIndexes.ts`

Commands:
- dry run: `npm --prefix server run audit:adaptive-mastery-indexes`
- create/verify canonical scoped unique index: `npm --prefix server run migrate:adaptive-mastery-indexes`
- after deployment verification, remove legacy unique constraint: `npm --prefix server run migrate:adaptive-mastery-indexes:cutover`

Safety rules in the script:
- dry-run by default;
- refuses apply if scoped duplicates exist;
- refuses apply if path/subject scope is missing;
- verifies canonical unique index before any legacy drop;
- never rewrites SkillProgress documents.

The connected Atlas create-index helper does not expose the `unique` option, so the unique cutover is intentionally not faked through a non-unique index. The script is the canonical safe cutover mechanism.

## Resource classification
### VERIFIED
- reports/mastery/readiness/routing remain AI-free in their routine computation;
- question assistant is explicit-click;
- question assistant sends no image bytes and now strips image URLs/markup;
- recent mastery is bounded to five scoped observations;
- skill writes use batched reads and bulkWrite;
- school aggregate endpoint reads its materialized read model rather than QuizResult/QuestionAttempt history;
- school/class/student drill-down remains lazy;
- R2 serves question images directly;
- YouTube serves canonical video content directly;
- scoped DB query shapes now have matching sort/due/budget indexes where live query evidence justified them;
- no live data row was deleted or rewritten in Phase 10.

### PARTIAL
- current live database still has the legacy `userId + skillId` unique index in addition to the intended scoped identity migration. Data audit is clean; guarded cutover is prepared but should occur only after canonical code deployment.
- current institutional school aggregate collections have no representative production volume yet, so high-volume aggregate p95 is not measurable.
- old legacy external demo video URLs remain in content inventory, though they do not consume Render bandwidth.

### NOT PROVEN
- representative production cache-hit ratio for the new question-assistant cache before Phase 9 deployment;
- AI provider token/cost p50/p95 at real learner traffic;
- large-school aggregate p50/p95 before real school evidence exists.

### BLOCKED EXTERNALLY
Render CPU/memory/HTTP/bandwidth metrics are available through the connected Render integration, but the integration currently requires an explicitly user-confirmed workspace before metrics can be read. Phase 10 does not guess a workspace and does not treat that account-selection requirement as a code blocker.

Vercel preview deployment remains quota-limited externally and is not used as a reason to stop this phase.

## Verification contracts
New:
`node scripts/smoke-adaptive-phase10-resource-hardening-contract.mjs`

Also relevant:
- Phase 8 school aggregate contract
- Phase 9 question assistant contract
- adaptive mastery evidence contract
- adaptive skill-progress performance contract
- quiz answer exposure/security contracts
- existing typecheck/build/server checks

## Rollback
All Phase 10 code changes are additive or compatibility-preserving.
The three live indexes created are non-destructive and can be dropped independently if a measured regression appears.
The guarded identity migration never drops the legacy unique index unless the canonical unique index is already verified.
