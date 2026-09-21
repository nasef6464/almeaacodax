# ALMEAA Adaptive Phase 5 — Internal Smart Learning Path / Next Best Action

Status: IMPLEMENTED / STACKED; EXACT-HEAD CI PENDING PREDECESSOR GATES
Date: 2026-09-21

## Objective
Replace AI-driven adaptive routing with an internal deterministic engine, scoped by path/subject, with fingerprint/cache and a server-truth read model.

## Implemented
- Added deterministic client adaptive path service with bounded in-memory fingerprint cache.
- Removed the SmartLearningPath dependency on AI generation.
- Removed hard-coded fallback path/subject IDs from learning-path generation.
- Added server-side Next Best Action ranking from SkillProgress, scoped by authenticated user + path + optional subject.
- Added versioned fingerprint and ETag/private cache response semantics.
- SmartLearningPath prefers server-scoped signals and falls back to the deterministic local read model if the authenticated read is unavailable.
- Plan next action now consumes the same internal engine rather than a separate ad-hoc priority rule.
- No AI call is used for mastery, routing, trend interpretation, or Next Best Action.

## Ranking inputs
Current policy uses mastery deficit, status, evidence volume, trend when available, and recency. Insufficient evidence is routed to measurement before a strong diagnostic conclusion.

## Multi-path
Server route requires pathId. subjectId is optional but preserved when supplied. No global cross-path mastery merge is performed.

## Performance/resource impact
- Response is bounded to four candidates.
- Server read is projection-limited and max 100 SkillProgress rows within one authenticated scope.
- ETag + private max-age=30 enables short-lived reuse.
- Client fingerprint cache is capped at 50 entries.
- AI calls/tokens for Smart Learning Path: zero.

## Compatibility
The legacy async `generateLearningPath` export remains available but now delegates to the internal engine, preserving consumers while removing AI behavior.

## Verification
Focused contract: `node scripts/smoke-adaptive-phase5-next-best-action-contract.mjs`.
Full frontend/server typecheck/build and exact-head CI remain mandatory before merge.

## Integration dependency
Phase 2's scoped SkillProgress identity/index strengthens this route after ordered integration. No destructive migration is introduced here.
