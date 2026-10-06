# ALMEAA Adaptive Phase 6 — Mastery Levels, Goals & Readiness

Status: IMPLEMENTED / STACKED; EXACT-HEAD CI PENDING PREDECESSOR GATES
Date: 2026-09-21

## Objective
Provide understandable mastery levels, explicit short/long mastery goals, and an internal readiness decision that uses mastery + coverage + evidence + recency without predictive AI claims.

## Mastery policy
Shared client policy:
- insufficient evidence -> needs_measurement
- <50 -> foundation
- 50..<75 -> developing
- 75..<90 -> proficient
- >=90 -> mastered
Default minimum reliable evidence is 3.

Readiness is an interpretable internal score:
- mastery 55%
- coverage 20%
- evidence confidence 15%
- recency 10%
It is used for routing/explanation, not as an external exam prediction.

## Server truth
Added scoped GET `/quizzes/mastery-readiness`.
- authenticated user only
- pathId required
- subjectId optional
- bounded SkillProgress read
- evidence-weighted mastery
- returns coverage, evidence confidence, recency, total/reliable skills/evidence and explanation.

## Mastery goals
Added additive `MasteryGoal` model and scoped APIs:
- GET /quizzes/mastery-goals
- POST /quizzes/mastery-goals
- PATCH /quizzes/mastery-goals/:goalId
Targets: topic | section | path.
Horizons: short | long.
Students may manage their own goals. Staff may target only students resolved inside their existing report scope. Goal creation also validates that the path exists and, when a subject is supplied, that the subject belongs to that exact path.

## Student UI
Reports now:
- preserves the Phase 5 path + subject filters before readiness/goal reads;
- consumes server readiness for the active path/subject with deterministic local fallback;
- routes ready learners to mastery review, insufficient evidence to measurement, and weak learners to treatment;
- shows active mastery goals and supports quick short/long goal creation;
- keeps mastery level on skill report rows;
- uses an independent scoped recheck action rather than reusing the same treatment link.

## Compatibility / data impact
MasteryGoal is additive. No existing scoring, QuizResult, QuestionAttempt, SkillProgress, RBAC, or historical data is deleted or rewritten.

## Resource impact
Readiness read is projection-limited and capped at 500 scoped progress rows. Goal list is capped at 100. Taxonomy validation performs only point lookups for path/subject. No media load and no AI call is introduced.

## Verification
Focused contract: `node scripts/smoke-adaptive-phase6-mastery-readiness-contract.mjs`.
Full frontend/server typecheck/build and exact-head required CI remain mandatory before merge.

## Rollback
The new read/goal routes and additive model can be removed without changing existing assessment or reporting data.
