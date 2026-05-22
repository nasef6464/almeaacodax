# تقرير دفعة: دعم مسار Google Callback متوافق (`/google/call`)

التاريخ: 2026-05-14  
الحالة: مقفول برمجياً

## السبب
ظهرت نقطة حساسة في ربط Google OAuth حيث بعض إعدادات Google Cloud قد تكتب URI التحويل كـ `.../api/auth/google/call` بدل `.../api/auth/google/callback`.  
وجود alias واحد يحل عدم اتساق الإعدادات بدون تغيير أي صفحة.

## ما تم تنفيذه
- إضافة معالج Callback موحّد:
  - استخراج منطق تسجيل الدخول عبر Google داخل `handleGoogleCallback`.
  - ربط `/google/callback` و`/google/call` بنفس المعالج.
- الحفاظ على نفس سلوك الأمان والرجوع (`state`, `returnTo`, fallback, التحقق من code/token/userinfo).
- عدم تغيير أي تصميم أو واجهة أمامية.

## الملفات المعدلة
- `server/src/routes/auth.routes.ts`

## التحقق المقترح
- اختبار رابط OAuth بعد تغيير Redirect URI في Google Console إلى أحد:
  - `https://almeaacodax-k2ux.onrender.com/api/auth/google/callback`
  - `https://almeaacodax-k2ux.onrender.com/api/auth/google/call`
- التأكد أن النتيجة تتحول لنفس النهاية `/.../#/login?...` مع نجاة المسار الصحيح.

