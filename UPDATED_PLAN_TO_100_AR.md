# خطة الوصول إلى 100% — مُحدَّثة بعد الفحص الشامل
التاريخ: 2026-05-21 | النقطة الحالية بعد الفحص: 79%

## النتيجة الحقيقية بعد الفحص
المشروع قوي جدًا كمنصة تعليمية تجريبية، لكنه لا يصل إلى 100% بسبب أربعة عوائق رئيسية مؤكدة من الكود والفحوص:
1. تسريب إجابات الاختبارات الصحيحة داخل نتائج الاختبار.
2. نطاق صلاحيات منتدى النقاشات واسع للمعلم/المشرف.
3. وجود نصوص عربية تالفة في صفحات/رسائل إنتاجية.
4. عدم تطابق commit الإنتاج مع آخر GitHub main، مع فشل smokes التي تحتاج `SMOKE_ADMIN_TOKEN` محليًا.

## الإصلاحات الحرجة — بدونها لا إطلاق
| الأولوية | الإصلاح | الملفات المحتملة | التعقيد | التأثير |
|---|---|---|---|---|
| 1 | منع تسريب إجابات الاختبار في API ونتائج الطالب | `server/src/routes/quiz.routes.ts`, `server/src/routes/quizResults.routes.ts`, `pages/Results.tsx`, smoke جديد | عالي | يغلق خطرًا أمنيًا مباشرًا. |
| 2 | تضييق RBAC/scope في منتدى النقاشات | `server/src/routes/discussions.routes.ts`, `components/CourseOverview.tsx` عند الحاجة | متوسط | يمنع teacher/supervisor من إدارة نقاشات خارج نطاقهم. |
| 3 | تنظيف النصوص العربية التالفة ومراقبة mojibake | `App.tsx`, `pages/CourseView.tsx`, `server/src/routes/payment.routes.ts`, smoke grep | متوسط | يعالج ظهور علامات استفهام للمستخدم. |
| 4 | مزامنة النشر الإنتاجي وإثبات CI live | GitHub secrets/Render/Vercel لا أسرار في repo | متوسط | يجعل الإغلاق الإنتاجي موثوقًا. |

## الإصلاحات المهمة — قبل الإطلاق الكامل
| الأولوية | الإصلاح | الملفات المحتملة | السبب |
|---|---|---|---|
| 5 | فحص وإصلاح ربط الدورات path -> subject -> skills + ظهور الدورة للطالب | `dashboards/admin/CourseBuilder.tsx`, `dashboards/admin/AdvancedCourseBuilder.tsx`, `dashboards/admin/CoursesManager.tsx`, `pages/SubjectLearningPage.tsx`, `components/CourseOverview.tsx` | المالك أكد أن المادة غير ظاهرة/الدورة لا تظهر/الإعدادات مكررة. |
| 6 | فلاتر استدعاء الدروس والاختبارات داخل Curriculum Builder | `dashboards/admin/AdvancedCourseBuilder.tsx`, `CourseBuilder.tsx` | مع كثرة الدروس يجب البحث والفلترة حسب المسار/المادة. |
| 7 | 404 + Privacy + Terms + About بدون إعادة تصميم | `App.tsx`, صفحات جديدة ضمن نفس النمط | مطلوب لإطلاق تجاري. |
| 8 | Sentry live proof وsource maps/frontend proof | `server/src/observability/sentry.ts`, frontend Sentry init إن لزم، GitHub Action | مراقبة إنتاجية حقيقية. |
| 9 | content/bootstrap وtaxonomy retest بعد إصلاح الربط | `server/src/routes/content.routes.ts`, `taxonomy.routes.ts`, load-tests | استعداد 500+ مستخدم. |

## الميزات المقترحة — للتميز التنافسي
| الميزة | التوقيت المناسب | السبب |
|---|---|---|
| Teacher action center | بعد إغلاق security/performance | يجعل المعلم يرى ما يجب فعله بدل قوائم عامة. |
| Parent weekly digest | بعد ربط التقارير | قيمة قوية لولي الأمر. |
| Certificates polish | بعد إصلاح الاختبارات/الدورات | مفيد تجاريًا. |
| Adaptive learning loop | بعد ثبات quiz/results/review | يميز المنصة عالميًا. |

## ترتيب التنفيذ المقترح
### BATCH 100A — Quiz Result Answer Exposure Hardening
- الهدف: منع أي API response من كشف `correctOptionIndex` أو `explanation` أو الإجابة الصحيحة للطالب، مع الحفاظ على صفحة النتائج بدون كسر.
- النطاق: quiz submit + quiz result detail + frontend results + smoke.
- الفحوص: `npm --prefix server run build`, `npm run typecheck`, `npm run build`, `npm run smoke:learning-quiz`, `npm run smoke:results`, smoke جديد لعدم تسريب الإجابات.
- القبول: لا يظهر `correctOptionIndex` أو `explanation` في ردود الطالب، مع استمرار عرض النتيجة والتحليل.
- الحالة المطلوبة: إغلاق إنتاجي بعد push/deploy/live API check.

### BATCH 100B — Discussions RBAC Scope Hardening
- الهدف: تضييق وصول teacher/supervisor في النقاشات حسب course/school/enrollment scope.
- النطاق: `server/src/routes/discussions.routes.ts` فقط ما أمكن.
- الفحوص: build + RBAC smoke جديد للنقاشات.
- القبول: admin كامل، student enrolled فقط، teacher/supervisor فقط ضمن نطاقه، out-of-scope = 403.

### BATCH 100C — Arabic Mojibake Cleanup + Regression Guard
- الهدف: إصلاح النصوص العربية التالفة المؤكدة وإضافة smoke يمنع رجوع `????` أو `Ø/Ù` في user-facing strings.
- النطاق: `App.tsx`, `pages/CourseView.tsx`, `server/src/routes/payment.routes.ts`، وربما Course builders إن ظهر.
- الفحوص: typecheck/build + smoke mojibake.
- القبول: لا تظهر علامات استفهام في مناطق الفحص، ولا توجد mojibake في الملفات المستهدفة.

### BATCH 100D — Course Builder Relationship & Import UX Functional Fix
- الهدف: توحيد إعدادات الدورات وربطها فعليًا: المسار -> المادة -> المهارات، واستدعاء الدروس/الاختبارات بفلاتر بحث.
- النطاق: CourseBuilder/AdvancedCourseBuilder/CoursesManager/SubjectLearningPage/CourseOverview حسب الحاجة فقط.
- الفحوص: typecheck/build + smoke course visibility + browser admin/student verification.
- القبول: اختيار المادة موجود، لا تكرار مربك، المهارات تتبع المادة، استدعاء الدروس/الاختبارات قابل للبحث والفلترة، الدورة المنشورة تظهر للطالب.

### BATCH 100E — Production Deployment Sync & Post-Deploy CI Secrets
- الهدف: جعل GitHub/Vercel/Render متزامنين وإثبات smoke operational/sentry-live-proof.
- النطاق: CI/config فقط، بدون أسرار في repo.
- القبول: health commit يطابق آخر main أو commit نشر معروف، وفحوص post-deploy PASS.

### BATCH 100F — Public Legal + 404 Completion
- الهدف: إضافة صفحات 404/Terms/Privacy/About بنفس النمط الحالي بدون redesign.
- القبول: routes تعمل، SEO smoke PASS، لا كسر للـ BrowserRouter.

### BATCH 100G — Full Role Browser Acceptance
- الهدف: فحص بصري وعملي لكل دور: admin/student/teacher/supervisor/parent.
- النطاق: audit/report أولاً، ثم إصلاحات صغيرة في دفعات لاحقة.
- القبول: تقرير screenshots/steps/bugs لكل لوحة.

### BATCH 100H — Scale Retest After Fixes
- الهدف: إعادة c100/c300/c500 للتعلم/الدورات/الاختبارات بعد إغلاق bugs الحرجة.
- القبول: تقرير load واضح، ولا إعلان 500+ إلا بدليل.

## متطلبات المالك (قرارات/ربط خارجي لا يحلها الكود وحده)
التفاصيل المالية/الخارجية محفوظة في: `EXTERNAL_PAID_SERVICES_AND_OWNER_BLOCKERS_2026-05-21_AR.md`.
1. تأكيد وجود `SMOKE_ADMIN_TOKEN` صالح في GitHub Actions أو طريقة login production smoke آمنة.
2. ترقية Render عند الحاجة لتقليل cold start.
3. ترقية MongoDB Atlas قبل 500+ concurrent.
4. ربط Tap/بوابة الدفع للإطلاق التجاري.
5. إثبات WhatsApp Cloud API إن كان OTP الحقيقي مطلوبًا بدل console fallback.
6. تدوير أي أسرار تم نشرها سابقًا خارج repo، وعدم حفظها في ملفات المشروع.

## قاعدة الإغلاق لكل دفعة قادمة
- لا تبدأ أكثر من دفعة.
- عند كلمة "اكمل": استمر حتى الإغلاق الكامل للدفعة الحالية.
- الإغلاق الكامل يعني: تنفيذ + فحوص + تقرير + ledger/status + commit/push + انتظار deploy + تحقق حي من `https://almeaacodax.vercel.app/` و`/api/health`.
- لا تكتب `Fully closed` إذا فشل build أو smoke أو لم يتم التحقق الإنتاجي المطلوب.

## التقدير الزمني للوصول إلى 100%
- جلسات Codex المتبقية: 8 إلى 12 جلسة مركزة.
- أسابيع تقريبية: 2 إلى 4 أسابيع حسب سرعة توفير مفاتيح/Secrets الإنتاجية وترقية الاستضافة.
- أول إصلاح مقترح: `BATCH 100A — Quiz Result Answer Exposure Hardening`.
