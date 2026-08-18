# Refactor V2 Checkpoint — Reports Institutional Hub

التاريخ: 2026-08-18

## الهدف

تقليل مسؤوليات `pages/Reports.tsx` عبر نقل اشتقاقات العرض المؤسسي النقية فقط، مع إبقاء النسخ والإرسال والـAPI والـstate والـside effects داخل React.

## ما تم نقله

تم إنشاء:

`pages/Reports/institutionalReportViewModel.ts`

ويملك الآن:

- بناء ملخص الطالب الأول للمتابعة.
- تحديد تسمية الدور المؤسسي.
- بناء الإجراء التالي والنص المستهدف.
- بناء رابط اختبار المتابعة حسب الدور والمهارة.
- بناء روابط الطلاب والتنبيهات حسب الدور.
- بناء نص تنبيه التدخل الجاهز للعرض/النسخ/الإرسال.

## السلوك المحفوظ

- الطالب لا يحصل على Institutional Hub؛ نفس الشرط `Role.STUDENT` بقي محفوظًا.
- تسميات الأدوار بقيت: مدير المنصة، مشرف، معلم، ولي أمر.
- ولي الأمر يبقى رابط متابعته `/dashboard?tab=reports`.
- روابط المدير/المشرف/المعلم بقيت كما كانت.
- رابط الاختبار الموجه يبنى من نفس `pathId/subjectId/sectionId/skillId/targetUserId`.
- ملخص الطالب يعرض بحد أقصى مهارتين ضعيفتين.
- نص التدخل الاحتياطي بقي: شرح قصير ثم تدريب علاجي ثم إعادة قياس.
- نص تنبيه التدخل المؤسسي ومادته وأولوية المهارة بقي بنفس المعنى والنص.

## ما بقي داخل Reports.tsx عمدًا

- `copyInstitutionalAlert` واستخدام `navigator.clipboard`.
- حالات النسخ والمهلات الزمنية.
- `canSendInterventionAlert`.
- `sendInterventionAlert` واستدعاء `api.sendInterventionAlert`.
- حالات loading/error/success الخاصة بالإرسال.
- جميع React effects وmutations والـside effects.

## الحماية

العقد المباشر:

`scripts/smoke-reports-institutional-boundary-contract.mjs`

يتحقق من delegation، ثبات النصوص والروابط حسب الدور، بقاء side effects في الصفحة، نقاء الـview-model، وانتقال ownership في العقود المصدرية.

Phase Review:

`tools/refactor/phase-review-reports-institutional.mjs`

تم تطبيق extraction على commit `636b4d01e2384feb2062d96479f754dc3966b751` بعد نجاح Phase Review قبل commit التطبيق.

## آخر baseline ثابت قبل هذه الدفعة

Checkpoint Directed Quiz Analytics `b90aaa6d2217a526b50eacf6b2b416796eeb5c37` اجتاز baseline كاملًا 53/53. فشل Preview الوحيد كان Vercel `build-rate-limit` الخارجي وليس regression في المشروع.

## قاعدة الاستمرار

PR #3 يظل Draft ولا يتم دمجه، و`main` لا يُلمس. لا تعتبر الدفعة مغلقة من جهة الكود إلا بعد إضافة Institutional Contract إلى Safety Gate الأساسي ونجاح baseline النهائي.
