# ALMEAA Adaptive Phase 7 — Mastery Challenge & Spaced Review

Status: IMPLEMENTED / STACKED; EXACT-HEAD CI PENDING PREDECESSOR GATES
Date: 2026-09-21

## Objective
Turn mastered skills into an evidence-based maintenance loop using actual answer evidence and SM-2 spaced repetition.

## Implemented
- ReviewCard now preserves path/subject/section scope and review type.
- Review cards are created from quiz submissions and self-quiz question evidence.
- Correct/mastery-review evidence is classified as mastery review; weak evidence remains error recovery.
- Review answer writes are idempotent through eventId / lastReviewEventId.
- For MCQ review, the server validates selectedOptionIndex against the question and records a mastery_review QuestionAttempt.
- SkillProgress is updated from the validated review attempt.
- Added scoped mastery challenge discovery from mastered SkillProgress rows.
- Review stats now support path/subject scope and expose due mastery-review count.
- ReviewSession records an actual answer for MCQ cards instead of relying only on learner self-rating.
- Existing quality-based SM-2 input remains as compatibility fallback for non-MCQ review cards.

## Mastery challenge eligibility
Current server rule:
- scoped to authenticated user + path + optional subject,
- mastery >= 90,
- reliable evidence (evidenceCount/attempts >= 3),
- capped candidate read.

## Safety / compatibility
No answer key is sent to the browser in the review payload. Existing ReviewCard records remain valid because all new fields are additive/defaulted.

## Resource impact
- Review reads are scoped and bounded.
- Mastery challenge endpoint returns at most 20 candidates.
- SM-2 remains local deterministic computation.
- No AI call, media preload, or broad cross-path scan is introduced.

## Verification
Focused contract: `node scripts/smoke-adaptive-phase7-mastery-review-contract.mjs`.
Full typecheck/build and exact-head required CI remain mandatory before merge.

## Rollback
New scope/evidence fields and mastery-challenge route can be removed without rewriting historical QuizResult/SkillProgress data.
