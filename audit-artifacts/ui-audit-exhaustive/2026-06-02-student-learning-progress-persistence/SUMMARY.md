# Student Learning Progress Persistence - 2026-06-02

## Scope

- Closed the student learning progress gap where foundation/topic progress could stay at `0` despite completed lessons or finished quizzes.
- Persisted completed lessons through the authenticated preferences API so progress survives refresh and is available to reports, path dashboards, certificates, parent views, and AI context.

## Changes

- `components/LearningSection.tsx`
  - Topic cards now calculate progress from visible lesson IDs and visible quiz IDs.
  - Direct topic links now open with real completed count/progress instead of a fixed zero.
- `store/useStore.ts`
  - `markLessonComplete` now syncs `completedLessons` to the backend for real authenticated users.
- `services/api.ts`
  - `updateMyPreferences` accepts `completedLessons`.
- `server/src/routes/auth.routes.ts`
  - `/auth/me/preferences` validates and stores `completedLessons`.
- `scripts/smoke-student-learning-progress-contract.mjs`
  - Added a regression contract for progress calculation and persistence wiring.

## Verification

- PASS `node scripts/smoke-student-learning-progress-contract.mjs`
- PASS `npm --prefix server run check`
- PASS `npm --prefix server run build`
- PASS `npm run build`

## Delivery Note

This is a targeted fix for the student journey: it does not redesign the dashboard, payments, or course cards. It makes existing progress indicators truthful and durable.
