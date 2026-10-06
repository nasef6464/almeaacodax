# دفعة مقفولة: فلترة طلبات الدفع حسب الدولة/الوسيلة + وضوح مزود الدفع — 2026-05-14

## ما تم
1. إضافة فلترة على API طلبات الدفع:
   - `paymentCountry` (SA/EG)
   - `paymentMethod` (card/transfer/wallet)
2. ربط الفلاتر داخل واجهة الإدارة (تبويب طلبات الدفع):
   - فلتر الدولة
   - فلتر وسيلة الدفع
3. إظهار الدولة ومزود الدفع داخل صف الطلب مباشرة.
4. تحسين ملف التصدير CSV ليشمل:
   - الدولة
   - مزود الدفع

## الملفات
- `C:\ALMEAA MAY - codax\server\src\routes\payment.routes.ts`
- `C:\ALMEAA MAY - codax\dashboards\admin\FinancialManager.tsx`

## الفحوصات
- `npm --prefix server run build` ✅
- `npm run smoke:payment-providers` ✅
- `npm run smoke:api-phase4` ✅
- `npm run typecheck` ⚠️ انتهى المهلة في بيئة التنفيذ الحالية (timeout) رغم نجاح باقي الفحوصات.

## النتيجة
الدفعة مقفولة وظيفيًا: إدارة الطلبات أصبحت أدق وأسهل للمراجعة عند تعدد الدول ووسائل الدفع.
