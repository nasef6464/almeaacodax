# ALMEAA Adaptive Phase 4 — Treatment / Recheck Loop Evidence

Status: IMPLEMENTED / STACKED; EXACT-HEAD CI PENDING EXTERNAL PREDECESSOR GATES
Date: 2026-09-21

## Objective
Implement the deterministic post-diagnosis loop:
Diagnosis -> explanation/support -> remediation practice -> independent recheck -> decision.

## Implemented
- Added explicit question evidence types: `assessment | remediation | recheck | mastery_review`.
- Persisted and validated evidence type on QuestionAttempt; client hydration preserves it.
- Added deterministic internal treatment policy; no AI call is used for diagnosis or routing.
- Added scoped short remediation, recheck, and mastery-review link builders carrying path/subject/section/skill.
- Reports now separate adaptive remediation from recheck instead of pointing both buttons to the same action.
- Self-quiz treatment sessions retain evidence type through saved progress and result source.
- Self-quiz question evidence is committed once per question at finish, not on option changes, preventing evidence inflation.

## Decision policy
- insufficient evidence -> measure first.
- mastered -> mastery review / spaced-review candidate.
- improving but not mastered -> focused remediation then recheck.
- weak/declining -> alternate explanation/support + remediation then recheck.
- otherwise -> remediation then recheck.

## Compatibility/data impact
QuestionAttempt change is additive. Existing attempts default to `assessment`. No destructive migration, scoring change, RBAC change, or deletion.

## Resource impact
Treatment routing is internal and deterministic. Short self-quizzes are bounded (default remediation 7 questions, recheck 5, review 5). No media preload and no AI request is added.

## Verification
Focused contract: `node scripts/smoke-adaptive-phase4-treatment-recheck-contract.mjs`.
Full typecheck/build and exact-head CI remain mandatory before merge.

## Rollback
Remove evidence-type-aware links/policy and optional QuestionAttempt field; legacy assessment behavior remains valid.
