# Refactor V2 Checkpoint — Reports Scoped Analytics

التاريخ: 2026-08-18

## الهدف

استمرار تفكيك `pages/Reports.tsx` على الفرع `refactor/repository-v2-safe` بدون تغيير سلوك المنتج أو API contracts أو الصلاحيات أو عمليات الإنشاء/الإرسال.

## ما تم نقله

تم نقل الاشتقاقات العرضية الخاصة بنطاق المشرف/المعلم/الإدارة إلى:

`pages/Reports/scopedAnalyticsViewModel.ts`

ويشمل ذلك فقط:

- بناء قائمة أولويات التدخل من أضعف مهارة/طالب/مادة.
- بناء ملخص المتابعة النصي للنطاق الحالي.

## ما بقي داخل Reports.tsx

- تحميل scoped analytics وscoped quiz results من API.
- React state وeffects.
- النسخ والمشاركة والتصدير.
- AI remediation calls.
- إنشاء Intervention Study Plan.
- إرسال التنبيهات وكل mutations والـside effects.

بالتالي لم تنتقل ملكية أي mutation أو API call إلى الـview-model الجديد.

## حماية السلوك

تم الحفاظ على نصوص التدخل، ترتيب الأولويات، role scope labels، fallbacks وCSS classes كما كانت.

العقد المباشر:

`scripts/smoke-reports-scoped-analytics-boundary-contract.mjs`

ويتحقق من delegation، ثبات النصوص والمعنى، عدم وجود React/store/API/browser dependencies، وحدود الحجم.

## التحقق

- دفعة Student Analytics السابقة أغلقت على commit `e673b4c7eb848a507b98c0cef1d3da0e640f28c6` مع Safety Gate كامل وVercel Preview: PASS.
- Scoped Analytics extraction طبق على commit `272d589e820e82b4d384bc6843564e1f982da0cb` بعد نجاح Phase Review قبل commit التطبيق.
- هذا checkpoint يضيف العقد إلى Safety Gate الأساسي ويزيل executor/codemod المؤقتين.
- لا تعتبر الدفعة مغلقة نهائيًا إلا بعد Safety Gate + Preview على checkpoint النهائي.

## قاعدة الاستمرار

الدفعة التالية يجب أن تبقى صغيرة وpure قدر الإمكان، مع Direct Contract مستقل، وألا يتم لمس `main` أو دمج PR #3 أثناء Refactor V2.
