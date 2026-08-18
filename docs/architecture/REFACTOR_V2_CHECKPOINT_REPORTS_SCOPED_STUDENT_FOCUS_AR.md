# Refactor V2 Checkpoint — Reports Scoped Student Focus

التاريخ: 2026-08-18

## الهدف

تقليل مسؤوليات `pages/Reports.tsx` بنقل إسقاط بطاقات الطلاب الأكثر احتياجًا إلى View-Model نقي، مع إبقاء التصدير والـReact والـside effects داخل الصفحة.

## ما تم نقله

تم إنشاء:

`pages/Reports/scopedStudentFocusViewModel.ts`

ويملك الآن:

- اختيار أول 4 طلاب من النطاق المفلتر.
- اختيار أول مهارتين ضعيفتين لكل طالب.
- حل المهارة الأساسية من الكتالوج.
- بناء رابط الاختبار الموجه للطالب والمجموعة والمهارة.
- اختيار tone البطاقة حسب متوسط أداء الطالب.

## السلوك المحفوظ

- عدد البطاقات بقي بحد أقصى 4.
- عدد المهارات الظاهرة لكل طالب بقي بحد أقصى 2.
- مطابقة المهارة بقيت باستخدام `displayText` على اسم المهارة.
- رابط المتابعة يحتفظ بنفس `pathId/subjectId/sectionId/skillId/targetUserId/targetGroupId`.
- حد الحالة العاجلة بقي `averageScore < 50`.
- نفس CSS tones الحمراء/الكهرمانية بقيت كما هي.

## ما بقي داخل Reports.tsx عمدًا

- `downloadScopedStudentsWorkbook`.
- تحميل XLSX والكتابة إلى الملف.
- كل React state/effects.
- كل API calls وmutations والـside effects.
- استخدام `student.followUpLink` في واجهة المستخدم.

## إصلاح عقد الملكية

أثناء Phase Review ظهر أن `scripts/smoke-performance-contract.mjs` كان ما يزال يفرض وجود `targetUserId: student.id` و`targetGroupId: student.groupIds?.[0]` داخل `Reports.tsx`.

لم يتم إرجاع الحساب إلى الصفحة ولم يتم إضعاف الاختبار. تم تحويل العقد إلى المالك الجديد:

`pages/Reports/scopedStudentFocusViewModel.ts`

مع بقاء عقد الأداء يتحقق من أن الصفحة نفسها تستخدم `student.followUpLink`.

## الحماية

العقد المباشر:

`scripts/smoke-reports-scoped-student-focus-boundary-contract.mjs`

Phase Review:

`tools/refactor/phase-review-reports-scoped-student-focus.mjs`

تم تطبيق extraction على commit `2e326e8cbfe4b6712c4d37697e2eeb981012244d` بعد نجاح Phase Review بعد إصلاح ownership في Performance Contract.

## آخر baseline ثابت قبل هذه الدفعة

Checkpoint Institutional Hub `ad77b35e2e967e8b0ab919c77745699c6dcebfa0` اجتاز baseline كاملًا 54/54. Vercel Preview بقي متأثرًا بـ `build-rate-limit` الخارجي.

## قاعدة الاستمرار

PR #3 يظل Draft ولا يتم دمجه، و`main` لا يُلمس. لا تعتبر هذه الدفعة مغلقة نهائيًا إلا بعد إضافة العقد إلى Safety Gate الأساسي ونجاح baseline على checkpoint النهائي.
