# Gate 6 — Courses C-01 Product Boundary Handoff

التاريخ: 2026-09-05

الفرع: `codex/gate6-questions-curriculum-operations`

## الحالة

- Questions: `CLOSED / VERIFIED Strong MVP`.
- Curriculum/Learning ownership: `CLOSED / VERIFIED Strong MVP`.
- Courses: `PARTIAL` — أُغلقت دفعة C-01 فقط، ولا يعني ذلك إغلاق نطاق Courses بالكامل أو Gate 6.
- Operations: لم يبدأ في هذه الدفعة.

## الفجوة المثبتة

كان client contract يرسل `kind=learning|package` عبر `coursesApi`، لكن `GET /api/courses` لم يكن يعرّف `kind` في `courseListQuerySchema`. وبما أن Zod يزيل query fields غير المعرفة، كان النوع يُتجاهل فعليًا ويمكن أن تعود نفس القائمة المختلطة لمساري Learning Product وPackage/Commerce Product. كذلك كان Admin `CoursesManager` ما يزال يعرض package products داخل سطح إدارة LMS.

## Batch C-01 — Learning Product / Package Product read boundary

Runtime commit: `1642ee83ef78968b2a6d38e7a20a7745b3035134` (`feat(courses): separate learning and package product surfaces`).

التغيير المحدود:

- `GET /api/courses` يقبل الآن `kind: learning | package | all` مع `all` كافتراضي للمحافظة على compatibility الحالية.
- `kind=learning` يضيف `isPackage != true`، و`kind=package` يضيف `isPackage = true` إلى نفس query owner؛ لا schema جديد ولا persistence موازٍ.
- cache key يتضمن `kind` لمنع إعادة نتيجة Learning cached لمسار Package أو العكس.
- `CoursesManager` أصبح learning-only باستخدام `isLearningCourse(...)`، وأزيلت منه labels/readiness logic الخاصة بالباقات؛ إدارة الباقة تبقى في surfaces التجارية المخصصة لها.
- لم تتغير URLs الحالية أو Assessment scoring/session semantics أو RBAC role definitions أو Payments ownership أو production data.
- لا global `tenantId`، لا SaaS multi-tenancy، لا microservices، ولا buyer-specific core forks.

## Contract / delivery evidence

- `scripts/smoke-gate6-courses-product-boundary-contract.mjs` يثبت وجود `kind` في server query contract، الفصل في filter/cache، وفصل Admin learning surface عن package identity.
- one-off delivery scaffold شغّل frontend/API install + typecheck + build + عقد C-01 + `git diff --check` قبل كتابة runtime commit، ثم حذف `.github/workflows/gate6-course-boundary-apply.yml` و`tools/gate6/apply-course-product-boundary.mjs` من المنتج النهائي.
- PR checks الناتجة مباشرة عن runtime commit صُنفت `action_required` بدون jobs لأن commit كُتب بواسطة `github-actions[bot]`; هذا ليس product regression ولا test failure. هذا handoff commit البشري فوق نفس runtime tree مقصود أيضًا لإعادة تشغيل PR CI على الـHEAD المتكامل.

## Closure / stop rule

تتوقف هذه الدفعة بعد C-01. لا يُعلن Courses `CLOSED / VERIFIED` إلا بعد نجاح CI المطلوب على الـHEAD المتكامل وإعادة فحص معايير Courses التجارية الحالية لإثبات عدم وجود فجوة حقيقية أخرى. إذا ثبت الإغلاق، يكون الهدف التالي في تشغيل لاحق هو Operations حسب الترتيب التجاري الموثق، وليس مزيدًا من UI polish أو schema redesign.
