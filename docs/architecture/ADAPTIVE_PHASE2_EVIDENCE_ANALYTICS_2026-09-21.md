# ALMEAA Adaptive Phase 2 — Evidence Accuracy and Performance

Date: 2026-09-21 (Asia/Riyadh)

## Live evidence baseline

Read-only Atlas inspection before Phase 2:

- `skillprogresses`: 743 documents.
- Documents with persisted `evidenceCount`: 0.
- Documents with non-empty `lastQuizId`: 13.
- Documents with empty `lastQuizId`: 730.
- Documents with `attempts = 3`: 364.
- `quizresults`: 4 current result documents.
- `questionattempts`: 15 current attempt documents.

Conclusion: historical `SkillProgress` is a derivative/legacy aggregate and MUST NOT be treated as the canonical recent evidence source for student decisions. Recent student reporting derives from `QuizResult.skillsAnalysis` with QuestionAttempt fallback.

## Changes in this phase

### Bounded recent evidence window

Adaptive student skill analysis now uses the latest **5 quiz results** by default after path scoping.

- The limit is bounded to 1..20.
- The selected path is applied before recent slicing.
- Period-level performance remains broader than the adaptive window.
- Question-attempt fallback is also path-scoped when path metadata exists.

### Evidence-weighted mastery

Previous report behavior averaged one skill mastery value per quiz, which meant a one-question skill observation had the same weight as a ten-question observation.

The report now:
- uses `questionCount` as evidence weight when present;
- uses `correctCount` for correct evidence when present;
- preserves historical results that lack these fields with a one-observation fallback;
- keeps `attempts` as observation count;
- keeps `totalEvidence` as evidence volume;
- determines reliability from evidence volume.

### Stable skill identity

QuestionAttempt fallback is keyed by `skillId`, not display name. Same-name skills can no longer collapse into one bucket.

### SkillProgress write performance

Quiz submission side effects no longer do one read + one update per skill.

New shape:
1. one bounded read of existing progress rows for affected skill IDs;
2. in-memory evidence merge;
3. one unordered `bulkWrite`.

The single-question path follows the same batched pattern.

### Replay protection

Each SkillProgress row stores a bounded list of the most recent 20 evidence keys.

- Quiz result evidence key: `submissionKey`, falling back to result id.
- Question attempt evidence key: deterministic question-attempt identity.
- Replaying the same recent evidence skips the progress update.
- The key list is bounded; no unbounded array growth is introduced.

This is a derivative-cache replay guard. Canonical result uniqueness still belongs to QuizResult submission identity.

## Resource impact

Expected improvements:
- removes per-skill N+1 SkillProgress reads/writes;
- report analysis is bounded to five recent quiz results by default;
- no AI calls are added;
- no media is loaded;
- no production migration is required;
- legacy SkillProgress rows upgrade lazily when new evidence arrives.

## Compatibility

- Existing QuizResults without `questionCount/correctCount` remain readable.
- Existing SkillProgress rows without `evidenceCount/recentEvidenceKeys` remain readable.
- Existing legacy question subject compatibility remains unchanged.
- No destructive data cleanup is part of this phase.

## Exit criteria

Phase 2 is complete only when exact-head validation proves:
1. frontend typecheck green;
2. API typecheck green;
3. frontend/API production builds green;
4. reports analytics contract green;
5. performance contract green;
6. adaptive mastery evidence contract green;
7. adaptive skill-progress performance contract green;
8. Safety / Production / Recovery / Backend / Public UI / Deep required gates green, excluding a separately identified external Vercel build-rate-limit blocker.
