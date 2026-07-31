# BATCH 03 — Platform Integration Secrets Security

التاريخ: 2026-05-16

الحالة: Programmatically closed, production verification pending

## السبب
الدفعة مخصصة للحماية من تسريب مفاتيح وأسرار التكاملات المرتبطة بـ Google / Facebook / WhatsApp / Email / Sentry / Redis وغيرها عبر الواجهات المعرّفة للإدارة، قبل أي تطوير أمني أو تكاملي إضافي.

## نطاق الدفعة
نطاق الدفعة يقتصر على:
- حماية استرجاع/إرجاع إعدادات التكاملات في الـ backend.
- حماية استرجاع تاريخ التكاملات ونتيجة الاسترجاع.
- تحديث script التحقق (runtime contract) ليتأكد من الحماية.
- تحديث تقرير الدفعة ودفتر الـ ledger.

لا تشمل الدفعة:
- تعديل UI.
- تغيير روابط OAuth أو الحقول في صفحات الإدارة.
- إضافة/إزالة مزوّدات جديدة.

## ما تم تنفيذه
1. إضافة/استخدام ماسك أمني إضافي لتفريغ Secrets في سجل التاريخ:
   - تم تعريف `maskIntegrationSnapshot` داخل `server/src/routes/content.routes.ts`.
   - هذا الماسك يعتمد على نفس آلية إخفاء الحقول الحساسة (`appSecret`, `clientSecret`, `apiKey`, `accessToken`, `botToken`, `verifyToken`).

2. تحديث استرجاع تاريخ التكاملات:
   - `GET /platform-integrations/history` لم يعد يرجّع snapshot كامل خام.
   - يرجّع عناصر مختصرة آمنة: `_id`, `updatedBy`, `note`, `createdAt` + `providerSecretState`.
   - تم حذف أي احتمالية لعرض أسرار مباشرة من سجل التاريخ في هذا المسار.

3. تحديث استرجاع restore:
   - `POST /platform-integrations/history/:id/restore`:
     - بعد تطبيق restore على الإعدادات، يتم إرجاع `settings` بشكل masked (خفيف) بدلًا من الإرجاع المباشر.

4. تحديث فحص التكاملات:
   - ملف `scripts/smoke-integrations-runtime-contract.mjs` تم إضافة تحققين جديدين:
     - تاريخ التكاملات يرجع حالة آمنة فقط.
     - restore endpoint يرجع settings ممسوحة.

## الملفات المعدلة في هذه الدفعة
- `server/src/routes/content.routes.ts`
- `scripts/smoke-integrations-runtime-contract.mjs`
- `docs/PLATFORM_INTEGRATION_SECRETS_FIX_2026-05-14_AR.md`
- `docs/SPARK_BATCH_LEDGER_AR.md` (تحديث حالة الدفعة)

## ملفات كانت معدلة مسبقًا ولم يتم لمسها في هذه الدفعة
- `dashboards/admin/FinancialManager.tsx`
- `dashboards/admin/PlatformIntegrationsManager.tsx`
- `dashboards/admin/SchoolPortalManager.tsx`
- `docs/project-handover/10_BACKLOG_FOR_NEXT_AGENT.md`
- `docs/project-handover/17_STRICT_BATCH_RULE_AR.md`
- `docs/project-handover/README.md`
- `package.json`
- `server/src/routes/auth.routes.ts`
- `server/src/routes/notification.routes.ts`
- `server/src/routes/payment.routes.ts`
- `server/src/services/notificationService.ts`
- `services/api.ts`
- `scripts/smoke-data-visibility-regression-contract.mjs`
- `scripts/smoke-payment-tampering-contract.mjs`
- وثائق/دفعات سابقة غير تابعة لهذه الدفعة في مجلد `docs/` (غير متعلقة تنفيذيًا بعمل هذه الدفعة)

## الفحوص
- command: `npm run smoke:integrations-runtime`
  - النتيجة: نجحت (PASS 9/9).
- command: `npm run server:build`
  - النتيجة: نجحت.

## فحص الإنتاج
- الحالة: لم يتم التحقق الإنتاجي المباشر في هذه الدفعة.
- السبب: التعديل على سلوك حماية استرجاع الـ history و restore يحتاج تشغيل سريع على بيئة Render بعد الإيداع النهائي للتأكد من تأثير الواجهة.
- الحالة الحالية: Programmatically closed, production verification pending.

## خطوات التحقق اليدوي
1. افتح لوحة الإدارة -> إدارة التكاملات.
2. افتح أدوات الشبكة في المتصفح.
3. تحقق من استجابة `GET /content/platform-integrations/history`:
   - لا يوجد مفاتيح مثل `appSecret` أو `clientSecret` أو `apiKey` أو `accessToken` بقيم حقيقية.
4. اختبر زر الاسترجاع في أحد سجل `restore`:
   - استجابة `POST /content/platform-integrations/history/:id/restore` يجب أن تعيد `settings` به حقول سرية مفرغة (`""`).
5. شغّل smoke المذكور أعلاه في بيئة التطوير.

## المخاطر المتبقية
- هناك ملفات إعدادات تكاملات قد تحتوي على أسرار فعلية في قاعدة البيانات (هذا طبيعي) لكن الواجهة/الإرجاع الآن مفلتر.
- لم يتم إجراء اختبار End-to-end للإنتاج في هذه الدفعة.
- لا يزال من الأفضل فحص كل endpoint يقدم بيانات التكاملات في حال وجود مسارات أخرى خارج `content.routes.ts`.

## الدفعة التالية المقترحة
BATCH 04 — Admin Users Pagination