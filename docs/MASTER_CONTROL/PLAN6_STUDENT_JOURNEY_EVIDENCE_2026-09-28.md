# PLAN 6 — Student Journey & Learning Loop Certification Evidence

Date: 2026-09-28
Baseline: main@95e8cb7399431da481a0d69ef3420a16bbb8c66c
PR: #292

## Certified loop

Dashboard → Content/Test → Question → Attempt → Result → Review → Saved/Mistake → Voice/Smart Tutor → Remediation → SkillProgress → Next Best Action.

## Existing contracts retained

- One Question → One Image → One Code.
- Quant image questions keep learner choices as أ/ب/ج/د only.
- ReviewCard remains server truth for saved/mistake review.
- Review library is bounded and scoped by path/subject.
- Question Assistant is voice-only in learner review UI; no text input is exposed.
- Voice explanation playback is present in result review and ReviewSession.
- SkillProgress is deterministic server evidence; no AI scoring/mastery/routing.
- Next Best Action consumes deterministic SkillProgress evidence.

## Live production data evidence

Read-only Atlas audit against active `almeaa` database:

- SkillProgress rows: 777 across 5 users.
- SkillProgress rows with recommendedAction: 777.
- Rows with bounded recentEvidence: 34.
- Maximum evidenceCount observed: 22.
- Latest live SkillProgress evidence timestamp observed: 2026-09-26T17:08:32.943Z.
- ReviewCard rows: 51.
- Saved review cards: 6.
- Mistake/error-recovery cards: 42.
- QuestionAttempt rows inspected: 20, including assessment and mastery_review evidence.

These values are observational evidence only; no production row was changed by this audit.

## Exact-head E2E enhancement

`scripts/live-assessment-commercial-audit.mjs` now additionally proves on isolated Mongo:

1. A wrong submitted question appears in mistake review.
2. Saved and mistake review preserve canonical question identity.
3. Voice explanation is visible in ReviewSession (PLAN 1 voice gap regression guard).
4. Voice-only Question Assistant is authorized from result/saved/mistake review.
5. A short mistake practice writes a correct `QuestionAttempt` with `evidenceType=remediation`.
6. `SkillProgress.evidenceCount` for the same skill increases after remediation.
7. The remediated question is rescheduled by spaced review.
8. `Next Best Action` returns the same remediated skill in its candidate scope.

## Closure rule

PLAN 6 is not green until:
- PR #292 exact head passes required CI including Deep Pre-Merge E2E;
- PR is merged to main;
- production runtime is healthy on a main SHA containing the merge.
