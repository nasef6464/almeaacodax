# Course Missing Guided Quiz Content Repair - 2026-06-02

## Scope

- Production course: `course_1779224794108` / `الا ستعداد للقدرات`.
- Broken linked curriculum quiz: `quiz_1777929187194_central` / `اختبار موجّه جديد`.
- Previous symptom: the course tests tab surfaced the item as `رابط الاختبار يحتاج مراجعة` with `غير جاهز` because the quiz source existed with zero questions and was still pending review.

## Repair

- Updated the existing production quiz document only.
- Added 4 approved question references from the same path and subject:
  - path: `p_1777779639431`
  - subject: `sub_1777779748206`
- Set the quiz to production-ready metadata:
  - `isPublished=true`
  - `showOnPlatform=true`
  - `approvalStatus=approved`
  - `mode=central`
- Kept general access restricted with `access.type=private` and a course-specific placeholder group so the quiz is usable from the course context without turning it into a broad public directed quiz.

## Verification

- `node scripts/smoke-course-file-access-contract.mjs` -> PASS 18/18.
- Production API check:
  - `GET https://almeaacodax.vercel.app/api/courses/course_1779224794108` -> 200.
  - Course curriculum still links `quiz_1777929187194_central`.
  - `GET https://almeaacodax.vercel.app/api/quizzes?limit=200` -> 200.
  - Linked quiz returned with 4 questions, `isPublished=true`, `showOnPlatform=true`, and `approvalStatus=approved`.

## Result

- The remaining content action from the course tests curriculum proof is closed at the data layer.
- No frontend or backend code change was required.
- Browser screenshot verification was attempted, but the local sandbox blocked Chromium startup with `spawn EPERM`; API verification and the local contract were used instead.
