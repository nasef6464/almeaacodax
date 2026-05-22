# BATCH_20ZG_TAXONOMY_BOOTSTRAP_DECOMPOSITION_RETEST_2026-05-18_AR

التاريخ: 2026-05-18
اسم الدفعة: BATCH 20ZG — Taxonomy Bootstrap Retest + Decomposition
الحالة: Programmatically closed, production verification pending

## السبب
اختبارات التحمل السابقة أظهرت أن taxonomy/bootstrap جزء من عنق الزجاجة، وكان مطلوب تقليل payload الأولي مع الحفاظ على التوافق.

## نطاق الدفعة
- تحسين taxonomy bootstrap فقط.
- لا تغيير في التصميم أو الألوان أو layout.
- لا تعديل في منطق التقييم أو الصلاحيات خارج نطاق taxonomy bootstrap.

## ما تم تنفيذه
- إضافة `phase=core|full` إلى مسار `GET /api/taxonomy/bootstrap`.
- جعل `phase=core` يعيد payload أخف (تأجيل skills الثقيلة للمرحلة الكاملة).
- تعديل التخزين المؤقت العام ليكون حسب phase بدل قيمة واحدة.
- إضافة `X-Taxonomy-Phase` في الاستجابة.
- تحديث `services/api.ts` و`services/adapter.ts` لدعم phase.
- تحديث `App.tsx` ليحمّل taxonomy core أولاً في مسارات التعلم ثم taxonomy full بالخلفية.
- مواءمة نصوص contract smoke المطلوبة بدون كسر السلوك.

## الملفات المعدلة في هذه الدفعة فقط
- `server/src/routes/taxonomy.routes.ts`
- `services/api.ts`
- `services/adapter.ts`
- `App.tsx`
- `server/src/routes/content.routes.ts` (compat alias فقط)
- `PROJECT_STATUS.md`
- `docs/SPARK_BATCH_LEDGER_AR.md`
- `docs/SPARK_EXECUTION_ROADMAP_AR.md`
- `BATCH_20ZG_TAXONOMY_BOOTSTRAP_DECOMPOSITION_RETEST_2026-05-18_AR.md`

## ملفات كانت معدلة مسبقًا ولم يتم لمسها
- ملفات الإدارة الكبيرة الظاهرة مسبقًا في `git status` مثل:
  - `dashboards/admin/FinancialManager.tsx`
  - `dashboards/admin/UsersManager.tsx`
  - `dashboards/admin/SchoolPortalManager.tsx`
- ملفات notification/services المعدلة مسبقًا خارج نطاق هذه الدفعة.

## الفحوص
- `npm --prefix server run build`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run smoke:performance`: PASS
- `npm run smoke:health-readiness`: PASS

## فحص الإنتاج
- لم يتم تشغيل retest حي c100/c300 بعد هذه الدفعة.
- الحالة: Production verification pending.

## خطوات التحقق اليدوي
1. افتح صفحة تعلم (مثل `/category/...`) بعد تحديث الإنتاج.
2. راقب Network لطلب `GET /api/taxonomy/bootstrap?phase=core` أولاً.
3. تأكد من وصول طلب `phase=full` لاحقًا بالخلفية.
4. تأكد أن التنقل والمهارات يعملان بدون كسر.
5. شغّل عينة حمل c100/c300 وتحقق من انخفاض timeouts مقارنةً بما قبل 20ZF/20ZG.

## المخاطر المتبقية
- لا يوجد إثبات تحميل حي جديد بعد التعديل حتى الآن.
- اختناقات أخرى (غير taxonomy) قد تبقى في مسارات bootstrap الثقيلة.

## الدفعة التالية المقترحة
BATCH 22 — CSRF Cookie Protection
