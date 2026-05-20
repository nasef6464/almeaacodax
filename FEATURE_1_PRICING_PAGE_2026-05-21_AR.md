# FEATURE-1 إغلاق صفحة الباقات (Pricing) — 2026-05-21

## النتيجة
- الحالة: **Closed**
- المسار العام: تم إنشاء صفحة باقات عامة وربطها بالملاحة وSEO وsitemap.

## ما تم تنفيذه
- إضافة صفحة جديدة:
  - `pages/Pricing.tsx`
- ربط المسار في التطبيق:
  - `/pricing` داخل `App.tsx`
- إضافة عنصر "الباقات" في الهيدر:
  - `components/Header.tsx`
- تحديث SEO route meta لصفحة الباقات:
  - `App.tsx`
- إضافة رابط `/pricing` في خريطة الموقع:
  - `server/src/routes/seo.routes.ts`

## التحقق
- `npm run typecheck` ✅ PASS
- `npm run build` ✅ PASS
- `npm --prefix server run build` ✅ PASS
- `npm run smoke:seo` ✅ PASS
- `npm run smoke:health-readiness` ✅ PASS

## ملاحظات
- تم الحفاظ على قاعدة الإغلاق: تنفيذ + تحقق + smoke قبل الرفع.
