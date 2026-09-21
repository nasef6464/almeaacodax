# ALMEAA Adaptive Phase 7 — Mastery Challenge & Spaced Review

Status: IMPLEMENTED / STACKED; EXACT-HEAD CI PENDING PREDECESSOR GATES
Date: 2026-09-21

## Objective
Turn mastered skills into a scoped evidence-maintenance loop: mastery challenges, spaced review, actual answer evidence for MCQ cards, and idempotent review writes.

## Implemented
- ReviewCard keeps path/subject/section scope plus primary skillId and all linked skillIds.
- Quiz submissions and standalone question evidence create/update review cards.
- Incorrect evidence remains error-recovery; correct/mastery-review evidence can enter the mastery-review loop.
- Review due/stats accept optional path/subject scope.
- Mastery challenge discovery requires path scope, optional subject scope, mastery >= 90 and reliable evidence >= 3.
- MCQ review answers are checked server-side; the answer key is never included in the due-card payload.
- Validated MCQ review answers persist QuestionAttempt with evidenceType=mastery_review and update SkillProgress through the existing evidence owner.
- Review answer event IDs are retried with the same client event identity and consumed atomically on the server so duplicate retries do not create duplicate mastery evidence.
- ReviewSession preserves scope via URL query, lazy-loads question images, and uses actual option selection for MCQ cards.
- Student Reports surfaces a scoped mastery-review panel under the currently selected path/subject.

## Multi-path invariant
All challenge discovery and review navigation carry pathId and subjectId. The Reports panel inherits the student's active path/subject filters. No cross-path mastery aggregation is introduced.

## Multi-skill question invariant
A ReviewCard stores both a compatibility primary skillId and the complete skillIds set. Challenge due counts credit every linked skill without duplicating the card itself.

## Resource and bandwidth
- Due cards default to 20 and cap at 100.
- Mastery challenge candidates cap at 20; Reports requests only 5.
- Due-card question payload is minimal: text/options/image URL/type/skill IDs; no answer key or explanation blob is sent.
- Images are loaded lazily from their existing URL; no proxy/media duplication is introduced.
- ReviewCard adds only one new scoped compound index: userId + pathId + subjectId + nextReviewDate.
- No speculative single-field indexes were added for pathId, subjectId, reviewType or eventId.
- Live Atlas baseline during implementation: reviewcards count = 0; existing live classic indexes = 8. No destructive index operation was performed.

## Compatibility
Existing ReviewCard rows remain readable because new fields are additive/defaulted. Quality-based SM-2 remains available for non-MCQ cards; MCQ cards use validated answer evidence.

## Verification
Focused contract:
`node scripts/smoke-adaptive-phase7-mastery-review-contract.mjs`

Required before merge:
- frontend typecheck/build
- server typecheck/build
- existing adaptive/report contracts
- predecessor Phase 6 closure
- exact-head required CI

## Rollback
New scope/evidence fields, challenge route, report panel and answer evidence path can be removed without rewriting QuizResult, SkillProgress or historical assessment data.
