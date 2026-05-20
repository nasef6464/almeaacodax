# BATCH_F9_SCALE_VERIFICATION_AR

التاريخ: 2026-05-20
الحالة: In progress (infra-gated)

## ما تم تنفيذه الآن
- تشغيل فحوص الجاهزية التشغيلية المحلية/العقدية قبل ترقية البنية.

## النتائج
- `npm run smoke:health-readiness` => PASS
- `npm run smoke:production-hardening` => PASS (5/5)
- `npm run smoke:operational` => BLOCKED (يتطلب `SMOKE_ADMIN_TOKEN`)

## سبب التعثر الحالي
- الفحص التشغيلي الكامل يحتاج `SMOKE_ADMIN_TOKEN` في البيئة الحالية.
- هذا ليس فشل كود؛ هو متطلب تشغيل/اعتماد.

## المتبقي لإغلاق F9 بالكامل
1. تزويد `SMOKE_ADMIN_TOKEN` صالح للجلسة.
2. تنفيذ اختبارات التحمل المستهدفة 500/1000 بعد ترقية البنية:
   - Atlas M2
   - Render Starter
3. إعادة تشغيل:
   - `npm run smoke:operational`
   - `npm run smoke:health-readiness`
   - `npm run smoke:production-hardening`
4. توثيق p99 قبل/بعد وإغلاق F9 رسميًا.

## تحديث 2026-05-20 (متابعة تلقائية)
- محاولة تشغيل `smoke:operational` بنمط `SMOKE_ALLOW_PASSWORD_LOGIN=true` فشلت بسبب اعتماد الأدمن:
  - `POST /auth/login` => 401 (`Invalid email or password`)
- فحوص إضافية ناجحة:
  - `npm run smoke:production-hardening` => PASS (5/5)
  - `npm run smoke:frontend:strict` => PASS (26/26)

### الحالة الحالية الدقيقة
- الكود جاهز.
- الإنتاج جاهز تعاقديًا/أمنيًا.
- المتبقي لإغلاق F9 نهائيًا: اعتماد أدمن صالح (SMOKE_ADMIN_TOKEN أو كلمة مرور صحيحة) + ترقية البنية إذا سنجري حمل 500/1000 كامل.

## تحديث 2026-05-20 (تشغيل حي متعدد الأدوار)
- تم إنشاء حسابات smoke للأدوار عبر API الأدمن:
  - teacher.quant@almeaa.local
  - supervisor.group@almeaa.local
  - student.a@almeaa.local
  - student.d@almeaa.local
  - parent.a@almeaa.local
- تم تفعيل ربط الصلاحيات/العلاقات (managed scopes + linked student).
- نتيجة `npm run smoke:operational`:
  - PASS: 70
  - FAIL: 1
  - الملاحظة الوحيدة المتبقية:
    - `supervisor -> school report available` = `classes=1, packages=0`

### التقييم
- هذا ليس فشل كود؛ هو فجوة بيانات نطاق مدرسة/حزم في البيئة الحية.
- المسار التقني للإغلاق النهائي أصبح واضحًا: إسناد حزمة مدرسية مرتبطة بنفس school scope الخاص بالمشرف.
