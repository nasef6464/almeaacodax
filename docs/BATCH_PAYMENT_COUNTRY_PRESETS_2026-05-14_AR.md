# دفعة مقفولة: إعدادات الدفع حسب الدولة + ملخص طلبات الدفع — 2026-05-14

## الهدف
تسهيل التشغيل للمدير بدون تعديل يدوي مرهق، مع ضبط أوضح لبيئة مصر/السعودية، وإتاحة ملخص سريع لحالات طلبات الدفع.

## ما تم تنفيذه (Backend + API)
1. إضافة **Presets جاهزة للدول** في الدفع:
   - `SA` (السعودية)
   - `EG` (مصر)
2. إضافة endpoint لإحضار presets:
   - `GET /api/payments/settings/presets`
3. إضافة endpoint لتطبيق preset مباشرة على إعدادات الدفع:
   - `POST /api/payments/settings/apply-country-preset`
   - Payload: `{ "country": "SA" | "EG" }`
4. إضافة endpoint ملخص حالات الطلبات:
   - `GET /api/payments/requests/summary`
   - يرجع: `all / pending / approved / rejected / cancelled`
5. تحديث `services/api.ts` بإضافة:
   - `getPaymentCountryPresets`
   - `applyPaymentCountryPreset`
   - `getPaymentRequestsSummary`

## الملفات المعدلة
- `C:\ALMEAA MAY - codax\server\src\routes\payment.routes.ts`
- `C:\ALMEAA MAY - codax\services\api.ts`

## التحقق
- `npm --prefix server run build` ✅
- `npm run typecheck` ✅
- `npm run smoke:payment-providers` ✅
- `npm run smoke:api-phase4` ✅

## ملاحظة
- الدفعة مقفولة على مستوى الـ Backend/APIs.
- ربط أزرار مباشرة في واجهة الإدارة لهذه endpoints يمكن إضافته كدفعة UI مستقلة لاحقة بدون كسر أي شيء شغال.
