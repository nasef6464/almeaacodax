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

## أدلة الفحص
- `audit-artifacts/admin-live-handoff/2026-05-30-admin-critical-live-postfix/`
- `audit-artifacts/admin-live-handoff/2026-05-30-admin-groups-schools-critical-postfix-live/`
- `audit-artifacts/final-delivery-2026-05-29/live-student-ai-chat-browser-post-schoolportal-fix-2026-05-30.json`
- `audit-artifacts/final-delivery-2026-05-29/in-app-browser-admin-groups-final-2026-05-30.png`
