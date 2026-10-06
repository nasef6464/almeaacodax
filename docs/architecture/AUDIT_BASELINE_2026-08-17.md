# Baseline Audit — 2026-08-17

Branch: `refactor/repository-v2-safe`
Base from main: `f1e8a35950e3c952ab3609235ef8c2ed85584267`

## Why this audit exists

No structural migration should start from an unknown/red baseline. The latest `main` state already had a failed Vercel status and the first clean GitHub Actions baseline run exposed frontend TypeScript regressions. These are being isolated and repaired before any file moves.

## Baseline TypeScript regressions discovered

The first clean CI run found:

- `QuizzesManager.tsx`: runtime-compatible `memberCount` fallback missing from the `Group` type.
- `SmartQuestionSelector.tsx`: `selectedSectionId` referenced before declaration.
- `SubjectQuizzesPanel.tsx`: `isTrueMockExam` imported from the wrong utility module.
- `Dashboard.tsx`: stale import for a missing `pathProgress` module while a local implementation already exists.
- `Dashboard.tsx`: missing `Calculator` icon import.
- `QuizPage.tsx`: legacy `MockExamSection.name` reference; the current field is `title`.
- `QuizPage.tsx`: inline/dead result summary referenced analytics variables that only existed inside `handleFinish`.
- `services/api.ts`: duplicate `getMyNotifications` and `markNotificationRead` object properties; the later definitions already overrode the earlier ones at runtime.

A guarded repair script was used so every edit asserts the exact expected source fragment before changing anything. The repair commit is intentionally separate from repository reorganization.

## Scalability hotspots confirmed from current GitHub source

### 1. Notifications realtime — P0

Current SSE implementation polls MongoDB per connected client every 10 seconds and performs both a new-notifications query and an unread-count query. This is acceptable for small usage but does not scale efficiently to thousands of concurrent students.

Target: preserve the frontend realtime contract while moving fan-out to Redis/Socket/PubSub-driven events rather than per-client Mongo polling.

### 2. Weekly parent report — P0

The API process contains an hourly `setInterval`. On Sunday at the target hour it loads all parent accounts, then queries quiz results parent-by-parent. In a multi-instance API deployment the same job can execute in multiple instances.

Target: BullMQ/Redis scheduler, idempotency key, distributed lock, batched aggregation, retry/observability.

### 3. Global/bootstrap data growth — P0

A growing educational catalog must not require large global datasets on unrelated screens. Data access will be changed gradually to route/domain-scoped pagination/cursors with a compatibility layer so current screens continue to work during migration.

### 4. Group membership arrays — P1

`Group` currently stores `studentIds`, `supervisorIds`, and `courseIds` arrays on the group document. This has a natural scale ceiling for very large schools/classes.

Target (later DB migration, NOT during file moves): add indexed `GroupMembership`, backfill, dual-read/dual-write, switch queries, then retire legacy arrays only after verification.

### 5. Large cross-domain frontend/backend files — P1

The source contains central files that mix orchestration and domain responsibilities (`App`, store, API facade, large dashboards/routes). They will first be moved without behavior changes, then split behind compatibility facades one hotspot at a time.

## Rules for the refactor

1. `main` remains untouched until preview validation and review.
2. File movement and business-logic changes do not share the same commit.
3. Current GitHub code is the source of truth; older reorganized archives are mapping/reference material only.
4. No route, API endpoint, auth/RBAC rule, payment rule, quiz rule, or database schema is silently changed by structural work.
5. Every migration phase must pass typecheck/build/contracts before continuing.
6. No destructive database migration in the structural phase.
7. Performance claims require controlled load tests on production-like infrastructure.
8. Security dependency upgrades are reviewed package-by-package; no blind `npm audit fix --force`.
