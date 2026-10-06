# Gate 6 — Courses Closure Evidence

التاريخ: 2026-09-05

الفرع: `codex/gate6-questions-curriculum-operations`

## الحالة

- Questions: `CLOSED / VERIFIED Strong MVP`.
- Curriculum/Learning ownership: `CLOSED / VERIFIED Strong MVP`.
- Courses: `CLOSED / VERIFIED Strong MVP`.
- Operations: `ACTIVE` — هو النطاق التالي في Gate 6.

## الفجوة التي أُغلقت

كان client contract يرسل `kind=learning|package` عبر `coursesApi`، لكن `GET /api/courses` لم يكن يعرّف `kind` في `courseListQuerySchema`. وبما أن Zod يزيل query fields غير المعرفة، كان النوع يُتجاهل فعليًا ويمكن أن تعود نفس القائمة المختلطة لمساري Learning Product وPackage/Commerce Product. كذلك كان Admin `CoursesManager` يعرض package products داخل سطح إدارة LMS.

هذا كان يخرق معيار Gate 6 المحدد في الخطة: **فصل Learning Product عن Package/Commerce Product**.

## C-01 — Learning Product / Package Product boundary

Runtime commit: `1642ee83ef78968b2a6d38e7a20a7745b3035134` (`feat(courses): separate learning and package product surfaces`).

التغيير المحدود:

- `GET /api/courses` يقبل `kind: learning | package | all` مع `all` كافتراضي للمحافظة على compatibility الحالية.
- `kind=learning` يضيف `isPackage != true`، و`kind=package` يضيف `isPackage = true` إلى نفس query owner؛ لا schema جديد ولا persistence موازٍ.
- cache key يتضمن `kind` لمنع إعادة نتيجة Learning cached لمسار Package أو العكس.
- `CoursesManager` أصبح learning-only باستخدام `isLearningCourse(...)`، وأزيلت منه labels/readiness logic الخاصة بالباقات؛ إدارة الباقة تبقى في surfaces التجارية المخصصة لها.
- لم تتغير URLs الحالية أو Assessment scoring/session semantics أو RBAC role definitions أو Payments ownership أو production data.
- لا global `tenantId`، لا SaaS multi-tenancy، لا microservices، ولا buyer-specific core forks.

## Verification

العقد الدائم:

- `scripts/smoke-gate6-courses-product-boundary-contract.mjs`

Integrated verification head:

- commit `b62a918f8e8b7cffc4ec7c6dee60d1d5a71d788f` (`test(gate6): wire courses product boundary contract`).
- Platform V3 Phase + Handover Gate run `33961796559`: `SUCCESS`.
- job `101294839988` — `Cross-phase + handover regression`: `SUCCESS`.
- خطوة `Gate 6 courses product boundary contract`: `SUCCESS`.
- نفس الـjob مرر أيضًا API phase 4، Security/RBAC، Exam/Payment، Production Ops، QA، Deployment Handover، وFull Handover Suite.

## قرار الإغلاق

معيار Courses التجاري في `FINAL_MASTER_PLAN_V3_AR.md` و`CHAT_EXECUTION_GOALS_AR.md` هو فصل Learning Product عن Package/Commerce Product. الفجوة المثبتة أُغلقت، وعقدها مر على الـHEAD المتكامل. لا توجد فجوة بيع أخرى مثبتة داخل Courses تبرر توسيع النطاق الآن.

لذلك:

- Courses = `CLOSED / VERIFIED Strong MVP`.
- أي تحسين إضافي في course authoring أو commerce presentation بلا blocker مثبت = `DEFERRED`.
- الهدف التالي داخل Gate 6 = **Operations: storage/media, queues/jobs, observability, backup/restore, security/release checklist**.

لا يُغلق Gate 6 بالكامل قبل إغلاق Operations وتسجيل ما هو `NOT PROVEN/BLOCKED` في production-like load certification، ثم إعداد Final Product Readiness Report وفق قرار المالك.
