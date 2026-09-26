# ALMEAA — Master Control

> **نقطة الدخول التنفيذية العليا للمشروع من 2026-09-26.**

هذا المجلد هو المرجع التنفيذي الوحيد الذي يحدد: ماذا نعمل الآن، ماذا أُغلق، ماذا بقي، وما شروط الانتقال للخطة التالية.

## ابدأ من هنا

1. `ALMEAA_GRAND_MASTER_PLAN_AR.md` — الخطة الأم 0 → 9.
2. `CURRENT_EXECUTION_STATUS_AR.md` — الحالة الحالية المختصرة.
3. `ISSUES_AND_DECISIONS_AR.md` — المشاكل والقرارات المعمارية/التشغيلية.
4. `EXECUTION_LOG_AR.md` — سجل التنفيذ والأدلة.
5. `../REFERENCE_CENTER/README_AR.md` — خريطة مراجع الـDomain.

## ترتيب الحقيقة

1. Git `main` الحالي.
2. هذا المجلد.
3. العقود والمراجع المتخصصة المرتبطة من الخطة الأم.
4. CI/PR/Live evidence.
5. الوثائق والخطط القديمة = Supporting / Historical فقط.

## قاعدة العمل

- خطة واحدة فقط تكون قيد التنفيذ.
- لا نبدأ Plan N+1 قبل إغلاق Exit Gate لـPlan N.
- لا نعيد بناء عمل مثبت على `main`.
- لا ندمج فرعًا قديمًا wholesale لمجرد أنه ahead؛ نعيد تطبيق الفجوة الحقيقية فقط.
- كل تغيير مهم يسجل: baseline، branch/PR، tests، live proof، المشاكل، القرار، المتبقي، والخطوة التالية.
- أي تعارض بين وثيقة قديمة والكود الحالي يُحسم لصالح Git HEAD + Master Control + evidence الحديثة.

## المرجع التشغيلي الخارجي

GitHub Issue **#269 — ALM-MASTER-001 — Grand Master Execution & Market Readiness** هو لوحة المتابعة المختصرة للخطة الأم.
