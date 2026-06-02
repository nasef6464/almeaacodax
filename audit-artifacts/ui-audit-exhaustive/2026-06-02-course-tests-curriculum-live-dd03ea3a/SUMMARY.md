# Course Tests And Files Live Proof - dd03ea3a

Date: 2026-06-02
Frontend: https://almeaacodax.vercel.app
Commit: dd03ea3a

## Scope
- Course: `course_1779224794108`
- Checked tabs: `tests`, `files`
- Purpose: verify that course curriculum quizzes and explicit course assessments appear inside the student course tests tab, and that missing linked quiz sources are visible instead of silently hidden.

## Result
- PASS: production served commit `dd03ea3a`.
- PASS: `npm run smoke:frontend:strict` passed 29/29 after deployment.
- PASS: `npm run typecheck`, `npm run build`, and `node scripts/smoke-course-file-access-contract.mjs` passed before deployment.
- PASS: course tests tab now shows `اختبارات الدورة والمنهج`.
- PASS: linked curriculum tests are visible:
  - `اختبار موجّه جديد`
  - `اختبار محاكي جديد`
- PASS: missing linked quiz source is shown as `رابط الاختبار يحتاج مراجعة` with disabled `غير جاهز` action.
- PASS: ready linked quiz starts from the course tests tab and opens:
  - `/quiz/mock_exam_1778077337192?returnTo=/course/course_1779224794108&source=course&courseId=course_1779224794108&courseLessonId=course_quiz_mock_exam_1778077337192_1779224335630`
- PASS: files tab shows a clear empty state because the course has no directly uploaded files.

## Evidence
- `course-tests-tab-viewport.png`
- `course-tests-live-proof.json`
- `course-ready-test-dom-click-viewport.png`
- `course-ready-test-dom-click-proof.json`
- `course-files-tab-viewport.png`
- `course-files-live-proof.json`

## Remaining Content Action
- Admin should replace or repair the missing source for `اختبار موجّه جديد`; the platform now surfaces this clearly instead of hiding it.
