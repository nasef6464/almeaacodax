# ALMEAA Adaptive Phase 4 — Server-Authoritative Recheck Evidence

Date: 2026-09-21 (Asia/Riyadh)

## Goal

A recheck/self-assessment completed by an authenticated learner must become server-authoritative evidence. Client-calculated score/mastery is never accepted as canonical evidence.

## Server contract

New endpoint:

`POST /api/quizzes/self-assessment/submit`

Authenticated payload contains only:
- submissionId
- questionIds
- selected answers
- elapsed time
- path / subject / optional section
- optional skillIds
- evidenceType
- optional display title

The server:
1. reloads every question from MongoDB;
2. preserves legacy/current subject compatibility;
3. rejects unavailable/hidden/unapproved/out-of-scope questions;
4. verifies requested path/subject/skill scope;
5. calculates correctness, score, question review, and skill evidence from database truth;
6. resolves embedded subskills as first-class skill IDs;
7. stores a QuizResult with a unique submissionKey;
8. runs normal SkillProgress / review side effects;
9. returns the learner-safe serialized result.

## Evidence types

Supported:
- assessment
- remediation
- recheck
- mastery_review

Prepared quiz submission can also carry the same evidenceType contract.

## Idempotency

`submissionKey = self-assessment:<userId>:<submissionId>`

A repeated request returns the already stored result instead of applying mastery twice.

## Embedded subskills

Production questions commonly reference embedded `Skill.subSkills[].id`.

Phase 4 adds:
- `buildSkillDocumentsByIdsQuery`, which resolves both main skill IDs and `subSkills.id`;
- a flattened submission read model that maps embedded subskills to the parent path/subject/section scope.

This prevents score evidence from losing subskill name/scope metadata.

## Double-count prevention

Authenticated self quizzes no longer persist a mastery-updating QuestionAttempt on every answer click. Their canonical evidence is the completed server QuizResult.

QuestionAttempt remains:
- server-scored when used independently;
- a report fallback only when there is no completed recent QuizResult in the selected scope.

This prevents the same completed assessment from being counted once per answer and again as a final result.

## Frontend behavior

- real authenticated session -> server submission;
- guest or explicit dev-only session -> local result remains available for non-production demonstration;
- submissionId is preserved in the saved snapshot so retries remain idempotent;
- recheck route carries `evidenceType=recheck`;
- subject matching uses `subjectId || subject`;
- embedded subskills are resolved for self-quiz context display.

## Resource impact

- one bounded server submission at completion;
- max 20 questions in this endpoint;
- one question fetch, bounded skill/subject/section reads;
- no AI calls;
- no media bytes;
- no new unbounded arrays;
- result cache invalidated only after a committed result.

## Contracts

`scripts/smoke-adaptive-server-recheck-contract.mjs` guards:
- backend authority;
- scope validation;
- idempotency;
- embedded subskill resolution;
- evidence type persistence;
- authenticated completion-only submission;
- canonical/legacy subject compatibility;
- completed-result precedence in reports.

## Remaining work after Phase 4

- treatment-loop decision policy based on recheck outcome;
- mastery/readiness transition rules;
- SmartLearningPath internal-first ranking;
- spaced review / mastery challenge;
- school aggregates;
- optional AI assistant remains explicit-user-action only.
