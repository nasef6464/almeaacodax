# Course Quiz Context Access - 2026-06-02

## Scope

- Closed the course quiz access gap where a quiz opened from a course could fall back to its global quiz access instead of the course-specific access selected by the admin.
- This protects the intended LMS rule: the same quiz can be free preview in one course, paid inside another course, and have a different access state in the quiz center.

## Changes

- `utils/quizLinks.ts`
  - Quiz routes can now carry `courseId` and `courseLessonId`.
- `components/CourseOverview.tsx`
  - Official course assessments and suggested course tests pass `courseId`.
  - Embedded course quiz lessons pass both `courseId` and `courseLessonId`.
- `components/CoursePlayer.tsx`
  - Embedded quiz launches from the course player pass full course context.
- `pages/QuizPage.tsx`
  - For `source=course`, access is resolved from the course lesson/assessment first.
  - `free_preview` opens as preview inside that course.
  - `enrolled_paid` opens for students who bought/enrolled in the course or have a matching courses package.

## Verification

- PASS `node scripts/smoke-course-quiz-context-contract.mjs`
- PASS `npm run build`
- PASS `npm --prefix server run check`
- PASS production smoke: `npm run smoke:frontend:strict` passed 29/29 and confirmed production is serving commit `fa4ab8d6`.

## Delivery Note

This is intentionally scoped to quiz access from inside courses. It does not change the global quiz center access rules or the admin's ability to reuse the same quiz in other places with different access.
