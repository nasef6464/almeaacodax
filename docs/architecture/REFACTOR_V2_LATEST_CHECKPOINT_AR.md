# آخر نقطة تحقق — Refactor V2

> هذا الملف مختصر استئناف سريع، بينما يبقى `REFACTOR_V2_EXECUTION_LEDGER_AR.md` هو السجل التاريخي الرئيسي.

## آخر مرحلة مغلقة

**Schools Workspace — Decision / Handover View-Model: مغلقة بنجاح.**

- الفرع: `refactor/repository-v2-safe`.
- لا يوجد أي دمج إلى `main` ولا نشر Production ضمن هذه المرحلة.
- تم استخراج منطق readiness/operating decisions/handover من `SchoolsManager.tsx` إلى `dashboards/admin/SchoolsManager/workspaceViewModel.ts`.
- `SchoolsManager.tsx` أصبح قرابة `4307` أسطر أثناء اختبار المرحلة، بعد أن كان يتجاوز 5200 سطر في بداية العمل.
- Direct workspace logic/performance contract: PASS، و10,000 عملية حساب في عشرات المللي ثانية داخل CI.
- Quick Gate: PASS.
- Full Schools Workspace Phase Review: PASS.
- Refactor V2 Safety Gate run `#163`: PASS على commit `ed2d0dddfa16e9412cda6b8ca2bf90ab9c254825`.
- Architecture contract ما زال يحافظ على `49` frontend routes، `236` backend route entries، `25` router mounts، `0` unresolved runtime relative imports، و`0` dependency cycles.
- School management contract: `22/22 PASS`.
- XLSX safety: `18/18 PASS`.
- typecheck/build للواجهة والـAPI، performance، relationships، route loading، runtime source، quiz integrity، auth security وAPI security: PASS.

## أخطاء/اختبارات تم تصحيحها أثناء المرحلة

1. عقد school-management الخاص بتفعيل الطالب بكود المدرسة كان مربوطًا بتنفيذ backend قديم. تمت مراجعة `auth.routes.ts` والتأكد من أن السلوك الحالي ما زال يحفظ `schoolId` و`groupIds` للمستخدم، يضيفه إلى `Group.studentIds` ويزامن `totalStudents`؛ تم تحديث العقد ليتحقق من السلوك الحالي بدل النص القديم.
2. عقد Batch 136 كان يبحث عن نص `ربط المشرفين` داخل God Component فقط. بعد استخراج القرار إلى feature-owned view model، تم تعديل العقد ليتتبع المصدر الجديد بدل إجبار النص على العودة إلى `SchoolsManager.tsx`.
3. تمت إضافة budget دائم يمنع رجوع `SchoolsManager.tsx` فوق `4350` سطرًا في عقد workspace الحالي.

## المرحلة التالية

**Schools Workspace & Presentation — roster/filter/pagination + UI section boundaries.**

الترتيب:

1. فصل pure view-model الخاص ببحث/فلترة/صفحات roster الطلاب من `SchoolsManager.tsx` مع direct tests لحالات `all`, `unassigned`, class filter, search, page clamping.
2. فحص أي O(n²) واضح في علاقات الطلاب/الفصول وتحويل lookups المتكررة إلى Sets/Maps داخل pure calculation إن أمكن بدون تغيير النتائج.
3. بعدها فصل أكبر أقسام presentation إلى components محددة props، مع منع child-to-parent imports.
4. مراجعة `SchoolPackagesPanel.tsx` و`SchoolRelationsPanel.tsx` وتقليل coupling.
5. عند استقرار hotspot المدارس، الانتقال إلى `pages/Reports.tsx` ثم backend hotspots `content.routes.ts` و`quiz.routes.ts`.

## بروتوكول كل دفعة

`تغيير صغير -> Direct Contract -> Quick Gate -> إصلاح أي failure -> Full Phase Review -> Standard Safety Gate -> تسجيل checkpoint`.

لا يتم تخفيف اختبار لمجرد تمرير CI؛ إذا تغير شكل الكود مع بقاء السلوك، يُعاد توجيه العقد إلى الحدود الجديدة بعد التحقق من الدلالة. وإذا ظهر تراجع وظيفي حقيقي، يتم إصلاح الكود نفسه.

## Roster/filter/pagination extraction — Full Phase Review PASS

- تم نقل بحث/فلترة/pagination طلاب المدرسة إلى `SchoolsManager/rosterViewModel.ts`.
- unassigned filtering يستخدم Set لمعرفات الفصول بدل `schoolClasses.some` داخل كل طالب، مع الحفاظ على نفس النتيجة.
- لا تعتبر الدفعة مغلقة إلا بعد direct contract + Quick Gate + Full Review + Standard Safety Gate.

- Roster Full Phase Review: **PASS** قبل إنشاء commit الدفعة؛ القبول النهائي ينتظر Standard Safety Gate.
