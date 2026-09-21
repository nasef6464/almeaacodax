# ALMEAA Adaptive Phase 2 — Scoped Evidence & Recent Analytics

Status: IMPLEMENTED / AWAITING EXACT-HEAD CI
Date: 2026-09-21

## Scope
Phase 2 preserves mastery identity as `userId + pathId + subjectId + skillId`, adds a bounded recent evidence window (default 5, policy-bounded 1..20), deduplicates the recent window by source identity, and exposes scoped path/subject skill-progress reads.

## Changes
- SkillProgress unique identity is scoped by user/path/subject/skill.
- Added bounded `recentEvidence` snapshots; no question text/media is copied.
- Quiz evidence source uses stable submission identity when available; question evidence uses persisted attempt identity.
- Recent analytics are evidence-weighted and expose mastery, evidence count, sample size, and trend.
- Skill progress endpoint accepts optional `pathId` and `subjectId`; legacy unscoped reads remain compatible.
- Added scoped read index matching user/path/subject + mastery/recency.
- No destructive migration, delete, media transfer, or AI call is introduced.

## Compatibility and migration boundary
Existing legacy SkillProgress rows are preserved. Changing the source unique index is additive at model level but production index replacement/backfill MUST remain guarded: do not drop the historical unique index until duplicate/collision audit and deployment evidence prove safe cutover. Runtime writes include the full scoped identity.

## Double-count boundary
Recent windows deduplicate by source ID. Cumulative mastery remains driven by the submission side-effect call; existing QuizResult `submissionKey` is the canonical retry guard. Self-quiz question telemetry is now committed once per question at finish rather than on every option click, preventing answer changes from inflating QuestionAttempt/SkillProgress evidence. Phase 2 does not weaken submission idempotency.

## Resource impact
Recent evidence is capped and contains only sourceId/mastery/evidenceCount/time. No media and no full result/question payload. Scoped index supports report reads without global student-history scans.

## Verification
Focused contract: `node scripts/smoke-adaptive-phase2-scoped-recent-evidence-contract.mjs`.
Existing mastery/performance/data-integrity contracts remain required, plus frontend/server typecheck/build and exact-head required GitHub gates.

## Exit
DONE only after exact-head required CI is green and PR is merged with SHA/CI evidence recorded.
