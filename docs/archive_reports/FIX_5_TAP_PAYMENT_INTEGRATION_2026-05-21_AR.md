# FIX-5 — Tap Payment Integration — 2026-05-21

## الحالة
- النتيجة: `Programmatically closed (live key dependent)`

## ما تم تنفيذه
1. إضافة endpoint جديد لإنشاء عملية Tap مباشرة:
   - `POST /api/payments/initiate`
   - يبني طلب دفع موثوق server-side (trusted amount/target)
   - ينشئ `PaymentRequest` بحالة `pending`
   - يستدعي `POST https://api.tap.company/v2/charges`
   - يرجع `redirectUrl` + `chargeId`
2. إضافة webhook endpoint خاص Tap:
   - `POST /api/payments/webhooks/tap`
   - يتحقق من HMAC signature باستخدام `TAP_WEBHOOK_SECRET`
   - عند `CHARGE` + `CAPTURED`:
     - يعتمد الطلب
     - يطبق `grantApprovedPaymentAccess` مباشرة
   - عند failure/cancel:
     - يحدّث الحالة إلى `rejected/cancelled`
3. استمرار حماية anti-tampering:
   - لا يعتمد أي amount من العميل
   - كل الأسعار من trusted target فقط
4. تحديث نموذج الدفع لدعم سياق الاشتراك/التوسعة دون كسر المسارات القائمة.

## الفحوص
- `npm --prefix server run build` ✅ PASS
- `npm run typecheck` ✅ PASS
- `npm run smoke:payment-providers` ✅ PASS
- `npm run smoke:payment-tampering` ✅ PASS
- `npm run smoke:health-readiness` ✅ PASS
- `npm run smoke:frontend:strict` ✅ PASS

## الملفات المتأثرة
- `server/src/routes/payment.routes.ts`
- `server/src/models/PaymentRequest.ts`

## المتبقي للإغلاق النهائي الحي
- توفير مفاتيح Tap على Render:
  - `TAP_API_KEY`
  - `TAP_SECRET_KEY`
  - `TAP_WEBHOOK_SECRET`
  - (اختياري) `TAP_WEBHOOK_URL` / `TAP_MODE`
- تنفيذ معاملة sandbox فعلية وتوثيق `transactionId/chargeId`.

## القرار
- من ناحية الكود والتكامل: مكتمل.
- من ناحية إثبات الدفع الحي sandbox: ينتظر مفاتيح Tap.
