# تقرير الدفعة 25C-FINAL-A — Operational Role Credentials Alignment
**التاريخ:** 2026-05-18  
**الحالة:** Programmatically closed, production verification pending

## الهدف
منع فشل `smoke:operational` بسبب الاعتماد على كلمات مرور ثابتة غير مضمونة في الإنتاج، وتجنب حظر تسجيل الدخول المتكرر (429).

## ما تم
- تحديث سكربت:
  - `server/src/scripts/smokeOperationalJourneysApi.ts`
- أصبح السكربت يدعم متغيرات بيئية صريحة لكل دور:
  - `SMOKE_ADMIN_TOKEN`
  - `SMOKE_TEACHER_TOKEN`
  - `SMOKE_SUPERVISOR_TOKEN`
  - `SMOKE_STUDENT_TOKEN`
  - `SMOKE_STUDENT_REDEEMED_TOKEN`
  - `SMOKE_PARENT_TOKEN`
- في بيئة الإنتاج remote (`onrender`) تم تفعيل guard:
  - يمنع محاولات login بكلمة مرور افتراضيًا.
  - يطلب token صريح لكل دور (أو تفعيل `SMOKE_ALLOW_PASSWORD_LOGIN=true` بشكل مقصود).
- الهدف من الـguard: منع تكرار lock/rate-limit على حسابات التشغيل أثناء smoke.

## الفحوص
- `npm --prefix server run build`: PASS
- `npm run smoke:operational`: FAIL متوقع ومنضبط برسالة واضحة:
  - `[admin] missing token for production smoke. Set SMOKE_ADMIN_TOKEN or enable SMOKE_ALLOW_PASSWORD_LOGIN=true explicitly.`

## فحص الإنتاج
- لم يتم إكمال matrix runtime متعدد الأدوار لأن توكنات الأدوار لم تُحقن بعد في بيئة التنفيذ.

## المخاطر المتبقية
- بدون توفير tokens صالحة لكل دور، لن يمكن إعلان إغلاق نهائي لـ BATCH 25C-FINAL.
- تفعيل `SMOKE_ALLOW_PASSWORD_LOGIN=true` على الإنتاج غير مفضل أمنيًا إلا كحل طارئ مؤقت.

## المطلوب للإغلاق النهائي
1. حقن tokens التشغيل في البيئة (أو GitHub Secrets) لكل الأدوار.
2. إعادة تشغيل `npm run smoke:operational`.
3. توثيق PASS وتحويل الحالة إلى Fully closed.

## الدفعة التالية المقترحة
- BATCH 25C-FINAL-B — Multi-role Live Runtime PASS & Final Closure
