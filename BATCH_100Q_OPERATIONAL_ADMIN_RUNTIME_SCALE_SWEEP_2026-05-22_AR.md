# BATCH 100Q - Operational Admin Runtime Scale Sweep - 2026-05-22

## الحالة
- الحالة: Fully closed.
- النطاق: تجميع تشغيلي كبير للتغييرات الموجودة في لوحة الإدارة ومسارات runtime بدون تغيير تصميمي.
- قاعدة العمل: staging صريح فقط، ولا استخدام لـ `git add .`.

## ما تم
- ربط `PwaInstallBanner` بالتطبيق وإصلاح نصه العربي المشفر.
- تثبيت CRUD runtime لمركز الأسئلة في `store/useStore.ts` بإرجاع نتائج create/update وانتظار delete قبل تحديث الحالة.
- توسيع إدارة طلبات الدفع بفلاتر الدولة/وسيلة الدفع، pagination، summary، وcountry presets.
- توسيع إدارة المستخدمين ببحث/دور/pagination من الخادم بدل الفلترة المحلية فقط.
- إضافة scoping عملي لتقارير بوابة المدارس حسب المدرسة/الفصل ونوع التقرير.
- دعم `taxonomy/bootstrap?phase=core|full` مع cache منفصل وإسقاط payload المهارات في core.
- إضافة endpoint لاختبار تسليم الإشعارات من لوحة الإدارة، مع حفظ `recipientPhone` في سجلات التسليم.
- تأخير empty-state في صفحة الاختبار حتى 3 ثوان عند انتظار hydrate للأسئلة المرتبطة.
- تحديث عقد الأداء ليتوافق مع cache key الحالي للدورات ومع bootstrap الحالي.
- إضافة `npm run smoke:batch100q-operational-admin-runtime`.

## الفحوص المحلية
- `npm run smoke:batch100q-operational-admin-runtime`: PASS.
- `npm run typecheck`: PASS.
- `npm --prefix server run build`: PASS.
- `npm run build`: PASS.
- `npm run smoke:payment-providers`: PASS.
- `npm run smoke:notification-phase10`: PASS.
- `npm run smoke:performance`: PASS.

## فحص المتصفح قبل النشر
- Browser baseline على الإنتاج الحالي: `admin-dashboard?tab=questions`.
- ظهر `مركز الأسئلة`، وزر `إضافة سؤال جديد`، وحقل البحث، وعدّاد الأسئلة.

## الإغلاق النهائي
- Commit: `3cdb01e`.
- GitHub push: PASS.
- Vercel: PASS، `npm run smoke:frontend:strict` أكد أن الإنتاج يخدم `3cdb01e`.
- Render/API: PASS، `npm run smoke:health-readiness` نجح و`/api/health` أعاد `ready=true` وcommit `3cdb01e0a581`.
- Taxonomy API: PASS، `phase=core` أعاد `skills=0` و`phase=full` أعاد `skills=32`.
- Browser بعد النشر: PASS لتبويبات المالية، المستخدمين، بوابة المدرسة، ومركز الأسئلة، بدون client errors ملتقطة.
