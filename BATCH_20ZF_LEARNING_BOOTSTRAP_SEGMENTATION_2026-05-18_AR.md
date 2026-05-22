# BATCH_20ZF_LEARNING_BOOTSTRAP_SEGMENTATION_2026-05-18_AR

التاريخ: 2026-05-18
اسم الدفعة: BATCH 20ZF — Learning Bootstrap Segmentation
الحالة: Programmatically closed, production verification pending

## السبب
مسار `GET /api/content/bootstrap?scope=learning` كان يحمّل payload ثقيلًا (خصوصًا lessons/libraryItems) في أول طلب، وهذا كان مرتبطًا بارتفاع timeouts في اختبارات الضغط c300.

## نطاق الدفعة
- تعديل مرحلي للـ learning bootstrap فقط.
- لا تغيير في التصميم أو الألوان أو layout.
- لا تغيير في scoring أو الأمن الخاص بالإجابات.

## ما تم تنفيذه
- إضافة مرحلة تحميل جديدة في السيرفر: `phase=core|full` داخل `/content/bootstrap`.
- عند `scope=learning&phase=core`:
  - يتم إرجاع `topics` فقط من بيانات التعلم الثقيلة.
  - يتم تأجيل `lessons` و`libraryItems` لتقليل حجم الاستجابة الأولية.
- إضافة `X-Content-Phase` في الاستجابة لتسهيل التتبع.
- تحديث طبقة API وAdapter لدعم `phase`.
- تحديث bootstrap في `App.tsx`:
  - يبدأ بطلب `learning/core` سريع.
  - ثم يحمّل `learning/full` بالخلفية ويعمل hydrate لـ lessons/libraryItems/studyPlans.

## الملفات المعدلة في هذه الدفعة فقط
- `server/src/routes/content.routes.ts`
- `services/api.ts`
- `services/adapter.ts`
- `App.tsx`
- `PROJECT_STATUS.md`
- `docs/SPARK_BATCH_LEDGER_AR.md`
- `docs/SPARK_EXECUTION_ROADMAP_AR.md`
- `BATCH_20ZF_LEARNING_BOOTSTRAP_SEGMENTATION_2026-05-18_AR.md`

## ملفات كانت معدلة مسبقًا ولم يتم لمسها
- `dashboards/admin/FinancialManager.tsx`
- `dashboards/admin/SchoolPortalManager.tsx`
- `dashboards/admin/UsersManager.tsx`
- `server/src/app.ts`
- `server/src/routes/notification.routes.ts`
- `server/src/services/notificationService.ts`
- `scripts/smoke-performance-contract.mjs`
- وباقي الملفات الظاهرة في `git status` قبل بدء الدفعة.

## الفحوص
- `npm --prefix server run build`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run smoke:route-loading`: PASS
- `npm run smoke:production-hardening`: PASS
- `npm run smoke:health-readiness`: PASS
- `npm run smoke:performance`: FAIL (فشل تعاقدي مسبق في `server/src/routes/taxonomy.routes.ts` متطلب نص Cache-Control)

## فحص الإنتاج
- لم يتم تنفيذ retest حمولة حي c300 داخل هذه الدفعة.
- الحالة: Production verification pending.

## خطوات التحقق اليدوي
1. افتح الصفحة التعليمية (مثل `/category/...`) بعد مسح الكاش.
2. راقب Network لطلب `/api/content/bootstrap?scope=learning&phase=core`.
3. تأكد أن الاستجابة الأولية أسرع وحجمها أقل من السابق.
4. تأكد من ظهور طلب لاحق `/api/content/bootstrap?scope=learning&phase=full` بالخلفية.
5. تأكد أن الدروس/المكتبة تظهر طبيعيًا بعد اكتمال الطلب الخلفي.

## المخاطر المتبقية
- لم يتم إثبات c300 production run بعد هذا التعديل.
- `taxonomy/bootstrap` لا يزال يحتاج معالجة مستقلة (الدفعة التالية 20ZG).
- لا تزال هناك حاجة لإعادة اختبار `/quizzes/results` تحت حمل أعلى.

## الدفعة التالية المقترحة
BATCH 20ZG — Taxonomy Bootstrap Retest + Decomposition
