# BATCH 100O — Admin Dashboard CRUD Actions Runtime Sweep + Course/Lesson/Quiz Linkage Audit

**التاريخ:** 2026-05-21  
**الحالة:** Programmatically closed, production verification pending

## السبب
هذه الدفعة جاءت بعد ملاحظات المالك أن بعض الدورات تظهر في الإدارة ولا تظهر بوضوح في صفحة التعلم، وأن ربط الدورة/المادة/الدروس/الاختبارات يحتاج فحصًا عمليًا، مع الحفاظ على نظام الدفعات وعدم خلط تحسينات تصميمية واسعة.

## نطاق الدفعة
- فحص وإصلاح الربط العام بين صفحة التعلم وقوائم الدورات والاختبارات حسب `pathId` و`subjectId`.
- فحص أن استدعاء الدروس والاختبارات داخل منشئ المناهج يحتوي بحثًا وفلترة وقائمة قابلة للتمرير.
- عدم تغيير تصميم الواجهة أو الألوان أو الـ layout.
- عدم إصلاح كل أزرار CRUD في لوحة الإدارة دفعة واحدة؛ ما بقي منها يوضع في دفعات لاحقة.

## السبب الجذري المؤكد
- API الإنتاج كان يحتوي الدورة المطلوبة، لكن `content/bootstrap?scope=learning` لا يحمل الدورات/الاختبارات في payload التعلم، وصفحة التعلم تعتمد على تحميل لاحق من `/courses` و`/quizzes`.
- مسار `/api/courses` لم يكن يطبق فلاتر `pathId/subjectId/search` على مستوى السيرفر، وكاش الواجهة للدورات لم يكن يفصل النتائج حسب المسار والمادة.
- مسار `/api/quizzes` لم يكن يطبق فلاتر `pathId/subjectId`، والكاش العام للاختبارات لم يكن scoped.
- لذلك كان ممكن تظهر صفحة التعلم بقوائم غير متطابقة أو ناقصة عند الانتقال بين المواد/المسارات أو بسبب الكاش.

## ما تم تنفيذه
- إضافة دعم `pathId` و`subjectId` إلى `PaginationOptions` في API client.
- جعل كاش الدورات في الواجهة مفصولًا حسب `page/limit/pathId/subjectId/search`.
- تمرير فلاتر `pathId/subjectId/search` من adapter إلى API للدورات والاختبارات.
- إضافة validation وفلاتر server-side في `GET /api/courses` حسب المسار والمادة والبحث، مع الحفاظ على visibility rules.
- إضافة cache key scoped وفلاتر server-side في `GET /api/quizzes` حسب المسار والمادة.
- إضافة backfill موجه داخل `LearningSection` يجلب الدورات والاختبارات الخاصة بالمسار/المادة الحاليين عندما تكون بيانات store ناقصة.
- إضافة smoke contract يحرس الربط العام ويؤكد بقاء بحث/تمرير استدعاء الدروس والاختبارات داخل `AdvancedCourseBuilder`.

## الملفات المعدلة في هذه الدفعة فقط
| الملف | نوع التغيير | السبب |
|---|---|---|
| `components/LearningSection.tsx` | تعديل وظيفي محدود | Backfill scoped للدورات والاختبارات حسب المسار والمادة |
| `services/api.ts` | تعديل API client/cache | دعم فلاتر path/subject في الدورات وفصل cache key |
| `services/adapter.ts` | تعديل تمرير params | تمرير فلاتر الدورات/الاختبارات للـ API |
| `server/src/routes/course.routes.ts` | تعديل backend route | فلترة آمنة للدورات حسب path/subject/search |
| `server/src/routes/quiz.routes.ts` | تعديل backend route | فلترة وكاش scoped للاختبارات حسب path/subject |
| `scripts/smoke-batch100o-admin-crud-course-linkage-contract.mjs` | ملف جديد | حراسة contract الدفعة |
| `package.json` | إضافة script | إضافة `smoke:batch100o-admin-crud-course-linkage` |
| `BATCH_100O_ADMIN_DASHBOARD_CRUD_ACTIONS_RUNTIME_SWEEP_COURSE_LESSON_QUIZ_LINKAGE_AUDIT_2026-05-21_AR.md` | تقرير جديد | توثيق الدفعة |
| `PROJECT_STATUS.md` | تحديث حالة | تسجيل حالة الدفعة |
| `docs/SPARK_BATCH_LEDGER_AR.md` | تحديث Ledger | تسجيل الدفعة |
| `docs/SPARK_EXECUTION_ROADMAP_AR.md` | تحديث خطة | تسجيل التالي |
| `docs/NEXT_SESSION_HANDOVER_AR.md` | تحديث تسليم | تمكين الحساب التالي من الاستمرار |

## الملفات التي كانت معدلة مسبقًا ولم يتم لمسها
| الملف/المسار | السبب |
|---|---|
| `App.tsx` | تعديل قديم خارج نطاق 100O |
| `contexts/AuthContext.tsx` | تعديل قديم خارج نطاق 100O |
| `dashboards/admin/FinancialManager.tsx` | تعديل قديم خارج نطاق 100O |
| `dashboards/admin/SchoolPortalManager.tsx` | تعديل قديم خارج نطاق 100O |
| `dashboards/admin/UsersManager.tsx` | تعديل قديم خارج نطاق 100O |
| `pages/QuizPage.tsx` | تعديل قديم خارج نطاق 100O |
| `server/src/routes/notification.routes.ts` | تعديل قديم خارج نطاق 100O |
| `server/src/routes/taxonomy.routes.ts` | تعديل قديم خارج نطاق 100O |
| `server/src/services/notificationService.ts` | تعديل قديم خارج نطاق 100O |
| تقارير وملفات untracked قديمة متعددة | موجودة قبل الدفعة ولم يتم إدخالها في commit |

## الفحوص
| الأمر | النتيجة | ملاحظات |
|---|---|---|
| `npm run smoke:batch100o-admin-crud-course-linkage` | PASS | Contract الربط والبحث |
| `npm --prefix server run build` | PASS | TypeScript backend build |
| `npm run typecheck` | PASS | أول محاولة 124s timeout ولم تُحسب، إعادة 300s نجحت |
| `npm run build` | PASS | Frontend build نجح |
| `npm run smoke:course-visibility` | PASS | قواعد visibility للدورات |
| `npm run smoke:learning-quiz` | PASS | 7/7 checks |
| `npm run smoke:student-journey` | PASS | 7/7 checks |
| `npm run smoke:quiz-integrity-guard` | PASS | 4/4 checks |
| `npm run smoke:batch100n-admin-tab-e2e` | PASS | Regression تبويب الإدارة |
| `npm run smoke:batch100k-homepage-admin-sweep` | PASS | Regression homepage/admin |

## فحص الإنتاج
- الحالة الحالية: Pending حتى يتم push وانتظار Vercel/Render ثم تشغيل smoke إنتاجي.
- المطلوب بعد النشر:
  - `npm run smoke:frontend:strict`
  - `npm run smoke:health-readiness`
  - فحص `/api/courses?pathId=...&subjectId=...`
  - فحص `/api/quizzes?pathId=...&subjectId=...`
  - فحص رابط صفحة التعلم في الإنتاج.

## التحقق اليدوي المطلوب
1. افتح `https://almeaacodax.vercel.app/category/p_1777779639431?subject=sub_1777779748206&tab=courses&verify=100o`.
2. تأكد أن دورات المادة تظهر ولا تختفي بسبب كاش غير scoped.
3. افتح `https://almeaacodax.vercel.app/admin-dashboard?tab=courses&verify=100o`.
4. داخل منشئ المناهج، تأكد أن استدعاء الدروس/الاختبارات يحتوي بحثًا وقائمة قابلة للتمرير.
5. افتح `https://almeaacodax.vercel.app/admin-dashboard?tab=questions&verify=100o` وافحص أن مركز الأسئلة لا يعرض قائمة فارغة بسبب contract pagination.

## المخاطر المتبقية
- فحص CRUD runtime الكامل لكل أزرار لوحة الإدارة يحتاج دفعات لاحقة لكل تبويب أو مجموعة تبويبات.
- مركز الأسئلة يحتاج دفعة Runtime CRUD مستقلة إذا بقيت مشكلة “إضافة سؤال لا يظهر” في الإنتاج بعد هذا الإصلاح.
- بعض الملفات dirty القديمة خارج نطاق الدفعة ما زالت موجودة ويجب عدم رفعها عشوائيًا.
- تحسينات ألوان الصفحة الرئيسية وأيقونات الدروس التي طلبها المالك نُفذت في دفعات سابقة جزئيًا، وأي تحسينات إضافية يجب أن تكون دفعة UI-settings مستقلة.

## هل تم إغلاق الخطر؟
برمجيًا: نعم، تم إغلاق خطر الكاش/الفلترة العامة الذي يمنع ربط صفحة التعلم بالدورات والاختبارات الصحيحة.  
إنتاجيًا: قيد الانتظار حتى يتم push/deploy والتحقق.

## الدفعة التالية المقترحة
`BATCH 100P — Admin Question Bank Runtime CRUD + Production Browser Verification`
