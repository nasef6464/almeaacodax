# FIX-7 — Subscription Flow Completion — 2026-05-21

## الحالة
- النتيجة: `Fully closed`

## ما تم تنفيذه
1. إضافة واجهات اشتراك جديدة داخل `payment.routes`:
   - `POST /api/payments/subscribe`
   - `GET /api/payments/subscription`
   - `DELETE /api/payments/subscription`
2. إضافة كتالوج خطط اشتراك واضح داخل السيرفر:
   - `basic` = 49 SAR / 30 يوم
   - `premium` = 99 SAR / 30 يوم
   - `annual` = 799 SAR / 365 يوم
3. إنشاء طلب اشتراك كـ `PaymentRequest` من نوع `subscription` بدل غياب مسار الاشتراكات سابقًا.
4. ربط تفعيل الاشتراك تلقائيًا عند اعتماد الطلب (review/webhook path) عبر تحديث:
   - `user.subscription.plan`
   - `user.subscription.expiresAt`
5. إلغاء الاشتراك يعيد الخطة إلى `free` ويلغي أي طلبات اشتراك معلقة للمستخدم.

## التعديلات التقنية
- تحديث enum في نموذج `PaymentRequest` لدعم النوع الجديد `subscription`.
- توسعة خدمة اعتماد الدفع الحالية للتعامل مع حالة الاشتراك بدون كسر مسار شراء الدورات/الباقات.

## الفحوص
- `npm --prefix server run build` ✅ PASS
- `npm run typecheck` ✅ PASS
- `npm run build` ✅ PASS
- `npm run smoke:payment-providers` ✅ PASS
- `npm run smoke:payment-tampering` ✅ PASS
- `npm run smoke:health-readiness` ✅ PASS
- `npm run smoke:frontend:strict` ✅ PASS

## الملفات المتأثرة
- `server/src/models/PaymentRequest.ts`
- `server/src/routes/payment.routes.ts`

## ملاحظة تشغيلية
- هذا الإغلاق يكمل **تدفق الاشتراك داخل المنصة** (Create/Status/Cancel + Activation on approval).
- ربط Tap recurring المباشر يظل دفعة منفصلة (FIX-5) عند توفر مفاتيح Tap.
