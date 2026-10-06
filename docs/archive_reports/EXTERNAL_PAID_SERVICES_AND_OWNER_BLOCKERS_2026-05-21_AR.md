# EXTERNAL PAID SERVICES AND OWNER-CONFIG BLOCKERS — 2026-05-21

## الغرض
هذا الملف يفصل كل البنود التي لا يمكن إغلاقها 100% من داخل الكود فقط لأنها تحتاج دفع، ترقية، مفاتيح، حساب خارجي، أو إعداد من لوحة مزود خدمة.

## قاعدة مهمة
أي بند في هذا الملف لا يُعتبر فشلًا برمجيًا إلا إذا توفرت المفاتيح/الترقية/الحسابات ثم فشل الفحص بعدها.

## 1. Render — ترقية الباك إند
الحالة الحالية: مطلوب قبل اختبار تحمل 500/1000 بشكل عادل.

المطلوب:
- ترقية خدمة Render من Free إلى Starter أو أعلى.
- التأكد أن backend لا ينام بسبب inactivity.
- إعادة فحص `/api/health` و `/api/operations/health` بعد الترقية.

سبب الحاجة:
- تقارير FIX-9A تشير إلى timeouts و 502/503 تحت أحمال عالية على البنية الحالية.

الدفعة المرتبطة:
- `BATCH 100G — Scale Upgrade & Load Retest`

## 2. MongoDB Atlas — ترقية قاعدة البيانات
الحالة الحالية: مطلوب قبل اعتماد التوسع.

المطلوب:
- ترقية Cluster من M0 إلى M2 أو أعلى.
- التأكد من indexes وbackups.
- تنفيذ load retest بعد الترقية.

سبب الحاجة:
- أحمال 500/1000 تحتاج قاعدة بيانات أقوى من free tier.

الدفعة المرتبطة:
- `BATCH 100G — Scale Upgrade & Load Retest`
- `BATCH 100F — Backup/Restore Production Drill`

## 3. GitHub Actions / Smoke Admin Secrets
الحالة الحالية: مطلوب لإغلاق فحوص post-deploy آليًا.

المطلوب أحد الخيارين:
- `SMOKE_ADMIN_TOKEN`
- أو `SMOKE_ADMIN_EMAIL` + `SMOKE_ADMIN_PASSWORD`

أماكن الاستخدام:
- GitHub Actions repository secrets.
- بيئة محلية عند تشغيل smoke production من الجهاز.

الفحوص المتوقفة:
- `npm run smoke:operational`
- `npm run smoke:sentry-live-proof`

الدفعة المرتبطة:
- `BATCH 100C — Smoke Secrets & Post-Deploy Automation Closure`

## 4. Tap Payments
الحالة الحالية: الكود مكتمل برمجيًا، لكن الإغلاق الحي يحتاج مفاتيح ومعاملة sandbox.

المطلوب على Render:
- `TAP_API_KEY` أو `TAP_SECRET_KEY`
- `TAP_WEBHOOK_SECRET`
- `TAP_MODE=test` أو ما يعادله
- `TAP_WEBHOOK_URL` عند الحاجة

المطلوب عمليًا:
- تنفيذ معاملة sandbox حقيقية.
- توثيق `chargeId/transactionId`.
- إثبات webhook ثم grant access الصحيح.

الدفعة المرتبطة:
- `BATCH 100D — Tap Sandbox Transaction Closure`

## 5. WhatsApp OTP Provider
الحالة الحالية: البنية موجودة، لكن الإرسال الحقيقي يحتاج مزود مفعّل.

خيار Meta WhatsApp Cloud:
- `WHATSAPP_PROVIDER=whatsapp_cloud`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN` عند الحاجة

خيار HTTP Provider:
- `WHATSAPP_PROVIDER=http`
- `WHATSAPP_WEBHOOK_URL`
- `WHATSAPP_WEBHOOK_TOKEN` عند الحاجة

المطلوب عمليًا:
- إرسال OTP لرقم حقيقي.
- تأكيد وصول الرسالة.
- تأكيد verify.

الدفعة المرتبطة:
- `BATCH 100E — WhatsApp OTP Live Closure`

## 6. Sentry
الحالة الحالية: مغلق إنتاجيًا في BATCH 27C، لكن يجب الحفاظ على مفاتيح الإنتاج وعدم حذفها.

المطلوب للحفاظ على الجاهزية:
- `SENTRY_DSN` للواجهة والخادم إن كانا منفصلين.
- release/environment مضبوطين.
- استمرار alerts.

الدفعة المرتبطة:
- لا تحتاج دفعة جديدة الآن إلا إذا فشل smoke لاحق.

## 7. Vercel
الحالة الحالية: متصل ويستقبل GitHub deploy.

المطلوب:
- الحفاظ على ربط GitHub.
- التأكد من متغيرات frontend العامة فقط مثل API base URL.
- عدم وضع secrets سرية في Vercel إلا إذا كانت مخصصة للواجهة وآمنة.

الدفعة المرتبطة:
- جزء من كل دفعة إنتاجية عند النشر والفحص.

## 8. Redis / Upstash / Redis Cloud
الحالة الحالية: Redis تم إغلاقه سابقًا، لكن يجب الحفاظ على الاتصال.

المطلوب:
- `REDIS_URL` صحيح وآمن.
- `RATE_LIMIT_REDIS_ENABLED=true` عند التشغيل الإنتاجي المستقر إذا كان مطلوبًا.
- queue worker proof إذا فُتح ملف إشعارات/queues جديد.

الدفعة المرتبطة:
- لا تحتاج دفعة الآن إلا إذا فشل smoke notifications/queues.

## 9. Backups / Restore
الحالة الحالية: تحتاج إثبات إنتاجي مستقل.

المطلوب:
- إثبات backup من MongoDB Atlas.
- restore أو dry-run في بيئة آمنة.
- عدم اختبار restore مباشرة على production live data بدون خطة rollback.

الدفعة المرتبطة:
- `BATCH 100F — Backup/Restore Production Drill`

## ترتيب تنفيذ البنود الخارجية المقترح
1. GitHub smoke secrets لأن أثرها مباشر على كل دفعة لاحقة.
2. Tap إذا الدفع الإلكتروني شرط قبل الإطلاق المدفوع.
3. Render + MongoDB قبل load retest.
4. WhatsApp إذا تسجيل الدخول بالواتساب شرط للمنتج.
5. Backup/restore قبل أي إطلاق عام.

## ما لا يُكتب في التقارير
- لا تكتب المفاتيح السرية نفسها.
- لا تحفظ tokens داخل repo.
- لا تضع كلمات مرور في handover.
- اذكر اسم المتغير فقط ومكان إضافته.
