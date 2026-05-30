# إصلاح نطاق بوابة المدارس للمدير - 2026-05-30

## السبب
- أثناء فحص لوحة الإدارة الحي ظهر أن تبويب بوابة المدارس يفتح، لكن الفحص الداخلي صنفه REVIEW لأن حساب المدير لا يملك نطاق مدرسة محدد.
- الجذر: المكون كان يبني بيانات المدارس والفصول والطلاب من نطاق المستخدم الحالي فقط. هذا مناسب للمشرف/المدرسة، لكنه غير مناسب للمدير العام.

## الإصلاح
- عند دخول مستخدم بدور المدير، تعرض بوابة المدارس كل المدارس والفصول والطلاب ونتائجهم والباقات والأكواد والدورات والاختبارات المرتبطة.
- بقي السلوك المقيد كما هو للمستخدمين غير المديرين.

## التحقق المحلي قبل النشر
- PASS: فحص أنواع الواجهة.
- PASS: بناء الواجهة.
- PASS: فحص أنواع الخادم.
- PASS: بناء الخادم.

## التحقق المطلوب بعد النشر
- PASS: الإنتاج يخدم commit `f6bd12df`.
- PASS: فحص لوحة الإدارة الحي بعد النشر: 22 تبويب PASS، 0 FAIL.
- PASS: فحص المجموعات/بوابة المدارس/المستخدمين الداخلي بعد النشر: 10 PASS، 0 REVIEW، 0 FAIL.
- PASS: فحص مساعد الطالب الحي من جلسة متصفح حقيقية: تسجيل دخول طالب 200، `/ai/chat` 200، المزود `gemini`، الموديل `gemini-2.5-flash`، و `usedFallback=false`.
- PASS: `smoke:ai-config-bridge`.
- PASS: `smoke:health-readiness`.
- PASS: `smoke:payment-package`.
- PASS: `smoke:batch136-admin-users-schools-parent-payment`.
- PASS: `smoke:student-journey` - 7/7 لمسار تعلم الطالب.
- PASS: `smoke:real-usage-readiness` - 8/8 لجاهزية الاستخدام الحقيقي.
- PASS: `smoke:production-audit` - 9/9 بعد تحديث العقد ليقبل إزالة Firebase legacy بالكامل.
- PASS: `smoke:runtime-source` - 5/5 لتأكيد مصدر التشغيل الحقيقي.
- PASS: `smoke:operational` على الخادم الحي - 71/71 لأدوار المدير والمعلم والمشرف والطالب وولي الأمر.
- PASS: `smoke:auth-frontend` - 6/6.
- PASS: `smoke:auth-account` - 5/5.
- PASS: `smoke:membership-pricing` - 4/4 بعد تحديث العقد إلى تبويب العضويات المستقل.
- PASS: `smoke:mock-exams` - 9/9.
- PASS: `smoke:my-quizzes` - 8/8 بعد تحديث العقد لمسار المستخدم المحمي وملف CSS الحالي.
- PASS: `smoke:reports-role` - 11/11.
- PASS: `smoke:school-management` - 9/9.
- PASS: `smoke:supervisor-dashboard` - 3/3 بعد تحديث العقد إلى أزرار المشرف الحالية.
- PASS: `smoke:payment-providers` - 7/7.
- PASS: `smoke:notifications` - 6/6.
- PASS: `smoke:monitoring` - 6/6.
- PASS: `smoke:seo`.
- PASS: `smoke:api-security` - 6/6.
- PASS: `smoke:csrf` - 4/4.
- PASS: `smoke:quiz-integrity-guard` - 4/4.
- PASS: `smoke:quiz-answer-exposure` - 5/5.
- PASS: `smoke:rbac-school-scope` - 4/4.
- PASS: `smoke:integrations-runtime` - 10/10.
- PASS: إعادة `typecheck` و `build` للواجهة والخادم بعد تحديث عقود الفحص.
- PASS: فحص بصري مركز للضيف والطالب على الإنتاج - 13/13 صفحة، 0 REVIEW، 0 أخطاء Console، 0 أخطاء Network 5xx.
- PASS: فحص بصري مركز لولي الأمر والمعلم والمشرف على الإنتاج - 9/9 صفحات، 0 REVIEW، 0 أخطاء Console، 0 أخطاء Network 5xx.
- PASS: إعادة فحص لوحة المدير النهائية بعد إضافة العضويات لمصفوفة الفحص - 23/23 تبويب PASS، 0 FAIL.
- PASS: تبويب `memberships` داخل لوحة المدير مفحوص بصريا ووظيفيا: 40 عنصر تفاعلي ظاهر، 0 disabled، 0 Console errors، 0 Network 5xx.
- PASS: فحص وظائف الإدارة الآمنة للتبويبات الحرجة - 12/12 PASS، ويشمل المستخدمين، المجموعات، بوابة المدارس، العضويات، المالية، التكاملات، مساعد الإدارة، الصفحة الرئيسية، الإعلانات، الخطوط، النسخ الاحتياطي، والمراقبة.
- PASS: عقود الإدارة الوظيفية المتاحة: `smoke:admin-tabs`, `smoke:admin-memberships-ai-closure`, `smoke:ai-admin-closure`, `smoke:admin-school-command`, `smoke:batch100i-admin-dashboard-functional-qa`, `smoke:batch100n-admin-tab-e2e`, `smoke:batch100o-admin-crud-course-linkage`, `smoke:batch100q-operational-admin-runtime`.
- PASS: عقود إدارة الشكل والمحتوى: `smoke:announcement-ads`, `smoke:platform-fonts`, `smoke:batch100j-homepage-branding-course-icons`, `smoke:batch100k-homepage-admin-sweep`, `smoke:batch100l-homepage-color-picker`, `smoke:batch100m-homepage-live-preview`.

## أدلة الفحص
- `audit-artifacts/admin-live-handoff/2026-05-30-admin-critical-live-postfix/`
- `audit-artifacts/admin-live-handoff/2026-05-30-admin-groups-schools-critical-postfix-live/`
- `audit-artifacts/final-delivery-2026-05-29/live-student-ai-chat-browser-post-schoolportal-fix-2026-05-30.json`
- `audit-artifacts/final-delivery-2026-05-29/in-app-browser-admin-groups-final-2026-05-30.png`
- `audit-artifacts/ui-audit-exhaustive/2026-05-30-focused-public-student-visual/`
- `audit-artifacts/ui-audit-exhaustive/2026-05-30-focused-staff-parent-visual/`
- `audit-artifacts/admin-live-handoff/2026-05-30-admin-critical-final-sweep-with-memberships/`
- `audit-artifacts/admin-live-handoff/2026-05-30-admin-safe-actions-final/`
