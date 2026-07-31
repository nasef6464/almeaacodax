# PROJECT 100% READINESS AUDIT AND EXECUTION PLAN — 2026-05-21

## اسم الدفعة
PLAN_100_READINESS_AUDIT_AND_EXECUTION_PLAN_2026-05-21_AR

## الحالة
Fully closed (documentation/reconciliation only)

## الغرض
تجميع آخر حالة حقيقية للمشروع بعد عمل الحساب السابق، وتحديث خطة الوصول إلى جاهزية 100% قبل بدء أي دفعة إصلاح جديدة. هذه الدفعة لا تغير كود التشغيل ولا تعدل الواجهة، بل تحدد الطريق التنفيذي التالي بناءً على الملفات الحالية والتقارير الأخيرة.

## مصادر الفحص
- `PROJECT_STATUS.md`
- `docs/NEXT_SESSION_HANDOVER_AR.md`
- `docs/SPARK_BATCH_LEDGER_AR.md`
- `docs/SPARK_EXECUTION_ROADMAP_AR.md`
- `docs/CONNECTED_SERVICES_HANDOVER_AR.md`
- `docs/CODEX_5_3_DEEP_AUDIT_AND_CONTINUOUS_PLAN_AR.md`
- `FIX_6R_WHATSAPP_OTP_REVALIDATION_2026-05-21_AR.md`
- `FIX_5_TAP_PAYMENT_INTEGRATION_2026-05-21_AR.md`
- `FIX_3A_SMOKE_AUTH_AUTOMATION_HARDENING_2026-05-21_AR.md`
- `FIX_9A_SCALE_REVALIDATION_EVIDENCE_PACK_2026-05-21_AR.md`
- `BATCH_COURSE_RELATED_FILES_ACTIONS_PARITY_2026-05-21_AR.md`
- ملفات المسارات واللوحات الأساسية داخل `dashboards/`, `pages/`, `components/`, `services/`, `server/src/routes/`, `server/src/models/`.

## ملخص الحكم الحالي
المشروع أصبح قويًا كـ MVP متقدم وقابل للتجربة التجريبية المنظمة، وتوجد دفعات كثيرة مغلقة بالكامل. لكنه ليس جاهزًا بعد بنسبة 100% لإطلاق عام أو توسع كبير؛ السبب ليس نقصًا واحدًا، بل مجموعة تحقق نهائي تشمل: أسرار التشغيل، الدفع الحي، واتساب، التحمل، تدقيق كل اللوحات بصريًا ووظيفيًا، وتنظيف تضارب ملفات التسليم.

## الجاهزية التقريبية الحالية
- Pilot محدود ومراقب: 85% إلى 90%.
- إطلاق مدفوع محدود: 75% إلى 82% بشرط توثيق Tap أو اعتماد الدفع اليدوي رسميًا.
- إطلاق عام واسع: 65% إلى 72%.
- 500+ مستخدم متزامن: غير جاهز حاليًا بسبب FIX-9A.
- جاهزية 100%: غير متحققة حتى إغلاق البنود المتبقية أدناه.

## ما تم إغلاقه بقوة من الحساب السابق
- CSRF موجود ومفعل في API والعميل.
- Sentry وصل إلى إغلاق إنتاجي مع إثبات حدث حي في BATCH 27C.
- BrowserRouter مستخدم في `App.tsx` مع جسر توافق legacy hash.
- Pricing / PWA / Dark Mode / Leaderboard / Search / Parent Dashboard / AI Mock Exams / Previous Years Bank مغلقة حسب التقارير الحديثة.
- Subscription Flow مغلق برمجيًا وفنيًا.
- Course player وCourse overview وCourse files actions حصلت على عدة إصلاحات مغلقة حتى آخر commit منشور.
- Admin Ops Health endpoint مغلق.
- Payment tampering محمي server-side حسب تقارير BATCH 02R/FIX-5.
- Integration secrets encryption at rest مغلقة في BATCH 24 حسب التقارير.

## البنود غير المغلقة 100%

### 1. FIX-9A — التحمل والتوسع
الحالة: Blocked (infra + secrets prerequisites)

المطلوب:
- ترقية MongoDB Atlas إلى M2 أو أعلى.
- ترقية Render من Free إلى Starter أو أعلى.
- توفير `SMOKE_ADMIN_TOKEN` أو `SMOKE_ADMIN_EMAIL` + `SMOKE_ADMIN_PASSWORD` في بيئة الفحص.
- إعادة load verification لـ 100/300/500/1000 وتوثيق p95/p99/error rate.

### 2. FIX-5 — Tap Payment
الحالة: Programmatically closed (live key dependent)

المطلوب:
- إضافة مفاتيح Tap الحقيقية أو sandbox إلى Render.
- تنفيذ معاملة sandbox حقيقية.
- توثيق `chargeId/transactionId` وتأكيد webhook/grant access.

### 3. FIX-6R — WhatsApp OTP
الحالة: Blocked (Owner env required)

المطلوب:
- اختيار مزود WhatsApp: Meta Cloud أو HTTP provider.
- إضافة متغيرات البيئة المطلوبة.
- اختبار إرسال OTP فعلي إلى رقم حقيقي.

### 4. FIX-3A — Smoke Auth Automation
الحالة: Programmatically closed (secret dependent)

المطلوب:
- إضافة `SMOKE_ADMIN_TOKEN` أو بيانات admin fallback في GitHub Actions/بيئة الفحص.
- تشغيل `smoke:operational` و `smoke:sentry-live-proof` بدون تدخل يدوي.

### 5. التدقيق البصري والوظيفي لكل اللوحات
الحالة: غير مكتمل كدفعة مستقلة مغلقة

المطلوب:
- فحص admin/student/teacher/supervisor/parent/public في المتصفح الداخلي.
- توثيق كل شاشة، كل وظيفة رئيسية، كل خطأ ظاهر، وكل نقص ربط.
- عدم إصلاح أي شيء داخل دفعة التدقيق؛ الإصلاحات تقسم بعد ذلك.

### 6. الدورات والمنهج ومشغل الدورات
الحالة: توجد إصلاحات كثيرة مغلقة، لكن طلب المالك الأخير يفتح تدقيقًا أوسع

ملاحظات يجب تضمينها في التدقيق القادم:
- احتمالية تكرار حقول المسار/المادة/التصنيف داخل إعدادات الدورة.
- التأكد من ظهور المادة دائمًا بجانب المسار، وليس المهارات فقط.
- استدعاء الدروس والاختبارات داخل Curriculum Builder يحتاج بحث/فلترة حسب المسار والمادة.
- يجب التأكد أن الدورة الأولى تظهر في صفحة التعلم للطالب إذا كانت “ظاهر على المنصة” و “جاهزة للطالب”.
- يجب فحص مشغل الدورة كما يراه الطالب: الدروس، الاختبارات، الملفات، الروابط، التنقل، progress.

## الملفات المعدلة مسبقًا قبل هذه الخطة ولم يتم لمسها
هذه الملفات كانت ظاهرة في `git status` قبل دفعة الخطة الحالية، ويجب عدم خلطها مع أي دفعة جديدة إلا بعد مصالحة مستقلة:
- `App.tsx`
- `contexts/AuthContext.tsx`
- `dashboards/admin/FinancialManager.tsx`
- `dashboards/admin/SchoolPortalManager.tsx`
- `dashboards/admin/UsersManager.tsx`
- `pages/QuizPage.tsx`
- `scripts/smoke-batch12-go-live.mjs`
- `scripts/smoke-performance-contract.mjs`
- `server/src/routes/notification.routes.ts`
- `server/src/routes/taxonomy.routes.ts`
- `server/src/services/notificationService.ts`
- عدة تقارير BATCH قديمة معدلة.

قرار مهم: لا يتم عمل reset أو revert لهذه الملفات تلقائيًا. يجب إنشاء دفعة `WORKTREE_HYGIENE` فقط إذا احتجنا تصنيفها.

## خارطة الطريق المحدثة للوصول إلى 100%

### BATCH 100A — Full Dashboard & Role Functional Audit
الأولوية: قصوى

الهدف:
فحص جميع اللوحات والوظائف من الكود والمتصفح الداخلي، بدون إصلاحات، لإنتاج matrix دقيقة بكل الأخطاء والنواقص.

النطاق:
- Admin Dashboard: كل التبويبات والعمليات الحساسة.
- Student Dashboard: التعلم، الاختبارات، النتائج، الملفات، الخطط، الاشتراكات.
- Teacher Dashboard: المحتوى، الطلاب، المجموعات، النتائج، القيود.
- Supervisor Dashboard: المدارس، التقارير، الاستيراد/التصدير، scope.
- Parent Dashboard: الأبناء، التقارير، الخصوصية.
- Public Website: الهوم، التسعير، الدورات، الدخول، SEO links.

الفحوص:
- `npm --prefix server run build`
- `npm run typecheck`
- `npm run build`
- `npm run smoke:frontend:strict`
- `npm run smoke:health-readiness`
- `npm run smoke:course-visibility`
- `npm run smoke:dashboards-phase11`
- فحص بصري من المتصفح الداخلي للإنتاج والمحلي عند الحاجة.

المخرجات:
- `BATCH_100A_FULL_DASHBOARD_ROLE_FUNCTIONAL_AUDIT_2026-05-21_AR.md`
- جدول شاشة/دور/وظيفة/نتيجة/خطورة/دفعة إصلاح مقترحة.

معيار الإغلاق:
- لا توجد إصلاحات داخل الدفعة.
- تقرير تدقيق كامل + تحديث handover/status/ledger.

### BATCH 100B — Course Builder & Course Player Linkage Closure
الأولوية: عالية جدًا

الهدف:
إصلاح ما يثبت في 100A حول تكرار حقول إعدادات الدورة، ربط المسار/المادة/المهارات، ظهور الدورة للطالب، واستدعاء الدروس/الاختبارات بفلترة.

النطاق المتوقع:
- `dashboards/admin/CourseBuilder.tsx`
- `dashboards/admin/AdvancedCourseBuilder.tsx`
- `components/CourseOverview.tsx`
- `components/CoursePlayer.tsx`
- `contexts/AppContext.tsx` أو store إن لزم
- smoke جديد أو محدث لعقد course builder.

قبول:
- لا تكرار غير مقصود لحقول المسار/المادة.
- اختيار المادة موجود دائمًا ومرتبط بالمسار.
- استدعاء الدروس/الاختبارات يسمح بالبحث والفلترة حسب مادة الدورة.
- الدورة الجاهزة تظهر للطالب في التعلم.
- مشغل الدورة يعمل من منظور الطالب.

### BATCH 100C — Smoke Secrets & Post-Deploy Automation Closure
الأولوية: عالية

الهدف:
إغلاق FIX-3A حيًا بعد توفير أسرار smoke.

قبول:
- GitHub Action post-deploy smoke ينجح بدون تدخل يدوي.
- `smoke:operational` و `smoke:sentry-live-proof` PASS.

### BATCH 100D — Tap Sandbox Transaction Closure
الأولوية: عالية قبل أي مدفوعات حقيقية

قبول:
- معاملة Tap sandbox حقيقية.
- webhook موثق.
- access grant صحيح.

### BATCH 100E — WhatsApp OTP Live Closure
الأولوية: متوسطة/عالية حسب قرار المنتج

قبول:
- OTP يصل فعليًا على WhatsApp.
- verify يعمل.
- rate-limit والتدقيق مفعّلان.

### BATCH 100F — Backup/Restore Production Drill
الأولوية: عالية قبل launch

قبول:
- نسخة backup حقيقية.
- restore في بيئة اختبار أو dry-run موثق.
- لا فقدان بيانات.

### BATCH 100G — Scale Upgrade & Load Retest
الأولوية: قصوى قبل إعلان عام

قبول:
- Render Starter أو أعلى.
- Atlas M2 أو أعلى.
- نتائج c100/c300/c500 موثقة.
- قرار c1000 واضح: pass أو blocked مع السبب.

### BATCH 100H — Final Launch Readiness Decision
الأولوية: نهائية

قبول:
- تقرير Launch/No Launch واضح.
- قائمة مخاطر متبقية.
- قرار: Pilot / Paid Beta / Public Launch.

## قاعدة العمل المحدثة للحسابات القادمة
عند قول المالك “اكمل” داخل دفعة مفتوحة، المعنى العملي:
- لا تبدأ دفعة جديدة.
- استمر حتى إغلاق الدفعة الحالية وفق الشروط.
- شغّل الفحوص المطلوبة.
- حدّث التقرير والledger وPROJECT_STATUS وNEXT_SESSION_HANDOVER.
- ارفع GitHub عند وجود تغييرات مقصودة.
- انتظر نشر Vercel/Render عند الحاجة.
- افحص الرابط الإنتاجي `https://almeaacodax.vercel.app/` والمتصفح الداخلي للصفحات المتأثرة.
- إذا لم يمكن تحقق دور أو خدمة بسبب أسرار/مفاتيح/بنية، اكتبها Blocked ولا تكتب Fully closed.

## القرار النهائي لهذه الدفعة
- لا نبدأ إصلاحات الآن قبل BATCH 100A.
- الدفعة التالية المقترحة: `BATCH 100A — Full Dashboard & Role Functional Audit`.
