# نقطة متابعة Refactor V2 الحالية

هذا الملف هو المختصر التشغيلي السريع بجانب السجل الكامل `REFACTOR_V2_EXECUTION_LEDGER_AR.md`.

## الهدف الثابت

إعادة تنظيم ALMEAA كـ **Modular Monolith** واضح وقابل للتوسع، بدون تغيير سلوك المنتج أو الـURLs أو API contracts أو auth/RBAC أو quiz integrity أو payment/access semantics أو بيانات الإنتاج.

## ما أصبح ثابتًا

- العمل البنيوي على `refactor/repository-v2-safe`، و`main` لا يُدمج معه قبل Release Candidate مغلق بالكامل.
- Architecture Gate يمنع فقد routes/mounts وruntime broken imports وdependency cycles وتجاوز budget.
- Module Boundary Gate يحمي الوحدات الجديدة وحدود Schools child/parent.
- Quick Gate أثناء الدفعات الصغيرة، وFull Safety Gate عند إغلاق الدفعات.
- Vercel Preview Gate شرط إغلاق إضافي، لكنه لا يحول مشكلة quota خارجية إلى عيب كود.
- المرجع المحلي للـAgents: `docs/development/LOCAL_AGENT_SYNC_AR.md` والسكربت `tools/sync-refactor-local.ps1`.

## آخر فحص كود مؤكد

على commit `d32c5b24186606d10c4c453a66c7ff6dae743946`:

- frontend typecheck: **PASS**.
- API typecheck: **PASS**.
- frontend production build: **PASS**.
- API production build: **PASS**.
- architecture + module boundaries: **PASS**.
- Schools management/XLSX/import/readiness/relationships/workspace/roster/package/access/presentation contracts: **PASS**.
- performance + package revenue + relationship audit: **PASS**.
- routes + runtime source + quiz integrity + auth security + API security: **PASS**.
- repository audit: `49` frontend routes، `236` backend route entries، `25` router mounts، `0` unresolved runtime imports، `0` dependency cycles، و`82` hotspot فوق 400 سطر مقابل budget `83`.
- `SchoolsManager.tsx`: `4308` أسطر في آخر import contract.

## حالة Vercel الحالية

آخر failure ظهر بعنوان `build-rate-limit` من Vercel Hobby بسبب كثرة Preview builds خلال الساعة، وليس failure في TypeScript أو build داخل GitHub Actions.

لذلك:

- لا يتم تخفيف Vercel Preview Gate.
- لا تُعلن المرحلة مغلقة نهائيًا حتى يعود Preview إلى `success`.
- يتم تجميع التعديلات في commits أكبر ومنطقية وتقليل عدد branch pushes لتجنب استهلاك quota بلا داعٍ.

## إغلاق دفعة Schools Relations Presentation ✅

- Safety Gate run `#285`: **PASS**.
- Vercel Preview Gate لنفس checkpoint: **PASS**.
- تم فصل status/readiness وquick supervisor UI مع بقاء API/store/orchestration خارج presentation children.

## دفعة Schools Reports Presentation

- تم استخراج reports tab من `SchoolsManager.tsx` إلى `SchoolReportsPanel.tsx`.
- تم فصل handover/readiness report إلى `SchoolHandoverReportSummary.tsx`.
- تم فصل performance metrics/weak skills/class summaries إلى `SchoolPerformanceReportPanel.tsx`.
- Full Reports Phase Review: **PASS** قبل commit الإغلاق.
- commit الكود المطبق: `bea54ce18a35ff982488dd97d44624d521fc90c5`.
- نتائج الفحص المباشر بعد الاستخراج: `SchoolsManager.tsx = 4115` سطر، `SchoolReportsPanel = 85`، `SchoolHandoverReportSummary = 158`، `SchoolPerformanceReportPanel = 133`، مع `49` frontend routes و`236` backend entries و`25` mounts و`0` runtime broken imports و`0` cycles.
- Safety Gate للكود نفسه مرّ على جميع فحوص الكود، بينما Vercel Preview ما زال متأثرًا بـ `build-rate-limit` الخارجي.
- القبول النهائي للدفعة ينتظر Preview أخضر دون تغيير معايير القبول.

## دفعة Schools Student Roster Presentation

- تم نقل البحث/فلترة الفصل/جدول الطلاب/النقل/الإزالة/التصفح إلى `SchoolStudentRosterPanel.tsx`.
- API/store/mutation ownership بقي في `SchoolsManager.tsx`؛ child يستقبل callbacks صريحة فقط.
- `rosterViewModel.ts` بقي مسؤولًا عن projection/filter/pagination عالي الكفاءة.
- Full Roster Phase Review: **PASS** قبل commit التطبيق.
- commit الكود المطبق: `12b8ebfabf5dd03f4947eaf9923e97763a97ed64`.
- بعد الاستخراج أصبح `SchoolsManager.tsx = 3989` سطر و`SchoolStudentRosterPanel.tsx = 192` سطر، مع بقاء typecheck وproduction builds وعقود المدارس سليمة في Phase Review.
- هذا checkpoint التوثيقي يعيد تشغيل Safety Gate + Vercel Preview Gate لأن commit التطبيق صدر من GitHub Actions ولا يعيد تشغيل workflows تلقائيًا.
- القبول النهائي للدفعة ينتظر Safety Gate + Vercel Preview Gate على نفس شجرة الكود.

## المسار التالي

1. تفكيك class operating cards بعد تثبيت roster boundary النهائي.
2. إغلاق hotspot المدارس بعد Full Gate + Preview Gate.
3. الانتقال إلى `pages/Reports.tsx` ثم `server/src/routes/content.routes.ts` و`server/src/routes/quiz.routes.ts` بنفس البروتوكول.

## قاعدة الاستمرار لأي Agent

ابدأ دائمًا من:

`AGENTS.md` -> `docs/architecture/PROJECT_MAP.md` -> هذا الملف -> `REFACTOR_V2_EXECUTION_LEDGER_AR.md` -> آخر Safety Gate.

ولا تعتبر أي refactor ناجحًا لمجرد أن الملفات أصبحت أصغر؛ يجب أن يبقى السلوك والعقود والفحص والنشر التجريبي مثبتين.

## دفعة Schools Class Operating Card Presentation

- تم فصل عرض بطاقة تشغيل الفصل إلى `SchoolClassOperatingCard.tsx`.
- rename/delete/supervisor/course mutations بقيت في `SchoolsManager.tsx` وتصل للـchild عبر callbacks صريحة.
- تم الحفاظ على إجراءات إضافة الطالب، كشف الفصل، Excel، المحتوى والأكواد، المشرفين والدورات بدون تغيير النصوص أو التدفق.
- Full Class Card Phase Review: **PASS** قبل commit التطبيق.
- القبول النهائي ينتظر Safety Gate + Vercel Preview Gate على checkpoint التحقق.

## دفعة Schools Workspace Courses/Classes Presentation

- تم فصل عرض دورات المدرسة إلى `SchoolCoursesPanel.tsx`.
- تم فصل shell الفصول والإنشاء الجماعي وتجميع `SchoolClassOperatingCard` إلى `SchoolClassesPanel.tsx`.
- course/class mutations بقيت في `SchoolsManager.tsx` وتصل للـchildren عبر callbacks صريحة.
- Full Workspace Sections Phase Review: **PASS** قبل commit التطبيق.
- القبول النهائي ينتظر Safety Gate + Vercel Preview Gate على checkpoint التحقق.

## دفعة Schools Overview Operators Presentation

- تم فصل بطاقة إضافة الطالب المنفرد إلى `SchoolSingleStudentPanel.tsx`.
- تم فصل عرض مدير/مشرف المدرسة ونطاقاته إلى `SchoolWideSupervisorsPanel.tsx`.
- إنشاء الطالب وربط/إزالة المشرف وتأكيد الإزالة بقيت في `SchoolsManager.tsx`؛ المكونات الجديدة تستقبل callbacks صريحة فقط.
- Full Overview Operators Phase Review: **PASS** قبل commit التطبيق.
- القبول النهائي ينتظر Safety Gate + Vercel Preview Gate على checkpoint التحقق.

## دفعة Schools Overview Operations Summary

- تم فصل لوحة التركيز ومؤشرات المدرسة وملخص تشغيل الفصول إلى `SchoolOverviewOperationsPanel.tsx`.
- تغيير التبويب والتمرير للمناطق التشغيلية بقي في `SchoolsManager.tsx` عبر callbacks صريحة.
- لم تنتقل أي API/store mutation إلى مكوّن العرض الجديد.
- Full Overview Summary Phase Review: **PASS** قبل commit التطبيق.
- القبول النهائي ينتظر Safety Gate + Vercel Preview Gate على checkpoint التحقق.

## دفعة Schools Command Center Presentation

- تم فصل مركز التشغيل، جاهزية التسليم، رحلة التسليم والإجراءات الأساسية إلى `SchoolCommandCenterPanel.tsx`.
- التنقل، التمرير، إنشاء الفصل، فتح الطالب، توجيه المشرف وبوابة المتابعة بقيت في `SchoolsManager.tsx` عبر callbacks صريحة.
- لم تنتقل أي API/store mutation أو منطق إنتاجي إلى مكوّن العرض الجديد.
- Full Command Center Phase Review: **PASS** قبل commit التطبيق.
- القبول النهائي ينتظر Safety Gate + Vercel Preview Gate على checkpoint التحقق.
