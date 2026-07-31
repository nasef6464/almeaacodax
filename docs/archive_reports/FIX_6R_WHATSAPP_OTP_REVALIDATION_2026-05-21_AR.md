# FIX-6R — WhatsApp OTP Real Sending Revalidation — 2026-05-21

## الحالة
- النتيجة: `Blocked (Owner env required)`

## ملخص التحقق
تمت إعادة الفحص العميق لمسار OTP واتساب، وتأكد أن التطبيق يحتوي على البنية التشغيلية كاملة (Routes + Providers + Notification Flow)، وأن سبب عدم الإغلاق النهائي إنتاجيًا هو غياب تفعيل مزود WhatsApp في بيئة التشغيل فقط.

## ما تم التحقق منه
1. مسارات OTP موجودة:
   - `POST /api/auth/whatsapp/start`
   - `POST /api/auth/whatsapp/verify`
2. مزودات الإرسال موجودة ومدعومة:
   - `whatsapp_cloud`
   - `http`
   - `console` fallback
3. فحوص التشغيل:
   - `npm run smoke:health-readiness` ✅ PASS
   - `npm run smoke:notifications` ✅ PASS
4. فحص endpoint إداري مباشر بدون auth:
   - `GET /api/operations/health` => 404 (متوقع لأن endpoint الصحيح إداري محمي)
   - endpoint الفعلي: `GET /api/operations/integrations-readiness` (يتطلب Admin Auth)

## البلوكَر الحقيقي
- إعدادات بيئة الإنتاج الخاصة بمزود واتساب غير مكتملة حاليًا.

## المطلوب للإغلاق النهائي
### خيار Meta WhatsApp Cloud
- `WHATSAPP_PROVIDER=whatsapp_cloud`
- `WHATSAPP_ACCESS_TOKEN=...`
- `WHATSAPP_PHONE_NUMBER_ID=...`
- `WHATSAPP_VERIFY_TOKEN=...` (اختياري حسب إعداد webhook)

### خيار مزود HTTP خارجي
- `WHATSAPP_PROVIDER=http`
- `WHATSAPP_WEBHOOK_URL=...`
- `WHATSAPP_WEBHOOK_TOKEN=...` (اختياري حسب المزود)

## بعد التفعيل (خطوة الإغلاق)
1. اختبار حي: `POST /api/auth/whatsapp/start` إلى رقم حقيقي.
2. التأكد من استلام OTP فعليًا على واتساب.
3. إعادة `smoke:health-readiness` وتوثيق PASS النهائي.

## القرار
- FIX-6 لا يزال `Blocked` بسبب متغيرات بيئة المالك فقط، وليس بسبب نقص برمجي.
