# 01 — اختبارات رؤية البيانات (Regression Tests)

**التاريخ:** 2026-05-16  
**الحالة:** Fully closed

## السبب
دفعة BATCH 01 تهدف لحماية محتوى التعليم من الاختفاء بعد أي تعديل في الـrouting أو الـloading أو التحسينات المستقبلية.  
نضيف فحوص smoke تضمن أن المسارات والعناصر التعليمية لا تختفي.

## نطاق الدفعة
- اختبارات smoke فقط، بدون تغيير UI.
- بدون تعديل routing.
- بدون تعديل business logic أو RBAC أو pagination.
- بدون تعديل منطق الأداء.

## ما تم تنفيذه
1. تفعيل ملف التحقق: `scripts/smoke-data-visibility-regression-contract.mjs`.
2. تشغيل فحوصات:
   - `npm run build`
   - `npm run typecheck`
   - `npm run smoke:data-visibility-regression`
3. تحديث حالة الدفعة في سجل الـ batches:
   - `docs/SPARK_BATCH_LEDGER_AR.md`
4. تحديث التقرير النهائي للدفعة:
   - `DATA_VISIBILITY_REGRESSION_TESTS_2026-05-14_AR.md`

## الملفات المعدلة في هذه الدفعة
- `DATA_VISIBILITY_REGRESSION_TESTS_2026-05-14_AR.md`
- `docs/SPARK_BATCH_LEDGER_AR.md`

## الملفات المعدلة مسبقًا ولم يتم لمسها في هذه الدفعة
- `BATCH_00_CURRENT_STATE_VERIFICATION_2026-05-14_AR.md`
- `package.json`
- `server/src/routes/auth.routes.ts`
- `server/src/routes/content.routes.ts`
- `server/src/routes/notification.routes.ts`
- `server/src/routes/payment.routes.ts`
- `server/src/services/notificationService.ts`
- `server/src/models/PlatformIntegrationHistory.ts`
- `services/api.ts`
- `scripts/smoke-integrations-runtime-contract.mjs`
- `scripts/smoke-payment-tampering-contract.mjs`
- `dashboards/admin/FinancialManager.tsx`
- `dashboards/admin/PlatformIntegrationsManager.tsx`
- `dashboards/admin/SchoolPortalManager.tsx`
- `docs/project-handover/10_BACKLOG_FOR_NEXT_AGENT.md`
- `docs/project-handover/17_STRICT_BATCH_RULE_AR.md`
- `docs/project-handover/README.md`
- `docs/NEXT_SESSION_HANDOVER_AR.md`
- `docs/BATCH_GOOGLE_CALLBACK_COMPAT_ALIAS_2026-05-14_AR.md`
- `docs/BATCH_INTEGRATIONS_RUNTIME_AUDIT_2026-05-14_AR.md`
- `docs/BATCH_INTEGRATIONS_RUNTIME_GUARD_2026-05-14_AR.md`
- `docs/BATCH_INTEGRATIONS_TEST_DELIVERY_2026-05-14_AR.md`
- `docs/BATCH_INTEGRATIONS_SECRET_HARDENING_2026-05-14_AR.md`
- `docs/BATCH_INTEGRATIONS_PRODUCTION_CHECKLIST_2026-05-14_AR.md`
- `docs/BATCH_INTEGRATIONS_HISTORY_RESTORE_2026-05-14_AR.md`
- `docs/BATCH_PAYMENT_COUNTRY_PRESETS_2026-05-14_AR.md`
- `docs/BATCH_PAYMENT_ADMIN_UI_PRESETS_SUMMARY_2026-05-14_AR.md`
- `docs/BATCH_PAYMENT_REQUESTS_SERVER_PAGINATION_2026-05-14_AR.md`
- `docs/BATCH_PAYMENT_REQUEST_FILTERS_COUNTRY_METHOD_2026-05-14_AR.md`
- `docs/BATCH_PAYMENT_REQUESTS_GLOBAL_SUMMARY_RESET_FILTERS_2026-05-14_AR.md`
- `docs/BATCH_SUPERVISOR_REPORTS_FINAL_2026-05-14_AR.md`
- `docs/BATCH_ROLE_ACCEPTANCE_VERCEL_2026-05-14_AR.md`
- `PAYMENT_AMOUNT_TAMPERING_FIX_2026-05-14_AR.md`
- `PLATFORM_INTEGRATION_SECRETS_FIX_2026-05-14_AR.md`
- `load-tests/results/` (مجلد)

## الفحوص
- `npm run build`  
  **النتيجة:** نجحت
- `npm run typecheck`  
  **النتيجة:** نجحت
- `npm run smoke:data-visibility-regression`  
  **النتيجة:** نجحت بالكامل (28 فحصًا مرريًا)

## فحص الإنتاج
- تم تنفيذ فحص الإنتاجي لروابط الواجهات وواجهات الـ API المشار إليها في السكربت.
- ✅ `https://almeaacodax.vercel.app` مفتوحة.
- ✅ `https://almeaacodax-k2ux.onrender.com/api/health` يرد بصحة الخدمة.
- ✅ فحوص المسارات/المحتوى (`/taxonomy/bootstrap`, `/content/bootstrap`, `/quizzes`, `/quizzes/questions`) نجحت.
- ❗تم التحقق من منع وصول المستخدم غير المصرّح للمسارات الإدارية عبر سكربت الـ smoke (401).

## المخاطر المتبقية
- لا توجد مخاطر حرجة جديدة بعد إغلاق الدفعة.
- يفضل فحص بصري دوري عند أي تعديل في الـ routes أو bootstrap في دفعات لاحقة.

## هل يوجد شيء مفتوح؟
- لا يوجد.

## الدفعة التالية المقترحة
- BATCH 04 — Admin Users Pagination
