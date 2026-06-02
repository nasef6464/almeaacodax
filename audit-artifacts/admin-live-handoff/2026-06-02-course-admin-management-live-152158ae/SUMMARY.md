# Course Admin Management Live Audit - 2026-06-02

## Scope
- Live admin check for the Qudrat quantitative subject course workspace.
- Target course: `course_1779224794108` / `الا ستعداد للقدرات`.
- Focus: course curriculum management, reused lessons/quizzes, preview vs paid access, course assessments, and course files.

## Result
- PASS: Admin can reach the subject workspace through `paths -> القدرات -> الكمي -> إدارة الدورات`.
- PASS: The target course edit action opens the course builder.
- PASS: The curriculum builder exposes "استدعاء درس" and "استدعاء اختبار" from the shared centers.
- PASS: Each course item has per-course access control, including free preview and paid-after-purchase.
- PASS: Course-level assessments and course files are visible in the builder.
- PASS: Opening a quiz item shows "إعدادات الاختبار داخل هذه الدورة", not the lesson builder.
- PASS: The quiz modal explains that the setting is scoped to this course and does not mutate the original quiz in the quiz center.
- PASS: No blocking console errors or 5xx network failures were recorded in the final proof.

## Evidence
- `admin-subject-courses-list.png`
- `admin-course-row-buttons.png`
- `admin-course-builder-curriculum-controls.png`
- `admin-course-quiz-settings-modal.png`
- `admin-course-management-proof.json`

## Note
- During the audit, an unsafe fallback click hit the row "رفض" action once before exact targeting was corrected. The course was immediately restored to `approved + published + visible`; the final proof and subsequent checks ran after restoration.
