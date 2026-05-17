# BATCH 17R — Auth Cookie Production Closure
**التاريخ:** 2026-05-17  
**الحالة:** Programmatically closed, production verification pending ⚠️

## ما تم
- إزالة تمرير `oauth_token` و `oauth_user` من رابط Google callback في السيرفر.
- تحويل الواجهة إلى cookie-first بشكل افتراضي (إلا إذا تم تعطيلها صراحة عبر `VITE_AUTH_COOKIE_FIRST=false`).
- إيقاف تخزين session token في `localStorage` نهائيًا.
- نقل بيانات الملف الشخصي غير الحساسة إلى `sessionStorage` فقط.
- الإبقاء على `credentials: include` لعمل الجلسة عبر HttpOnly cookie.

## الملفات المعدلة
- `server/src/routes/auth.routes.ts`
- `contexts/AuthContext.tsx`
- `services/api.ts`
- `services/clientTelemetry.ts`
- `scripts/smoke-auth-cookie-contract.mjs`

## الفحوص
- `npm --prefix server run build`: PASS
- `npm run typecheck`: PASS (أول محاولة timeout ثم إعادة ناجحة)
- `npm run build`: PASS
- `npm run smoke:auth-cookie`: PASS (5/5)
- `npm run smoke:health-readiness`: PASS

## فحص الإنتاج
- لم يتم بعد في هذه الجولة.
- مطلوب نشر آخر commit ثم التحقق الحي من:
  1. تسجيل دخول Google/Email يعمل.
  2. لا يوجد `oauth_token` في URL بعد الرجوع.
  3. لا يوجد token مخزن في localStorage.
  4. `/auth/me` يعمل بعد refresh اعتمادًا على cookie.

## القرار
- الحالة الآن: **Programmatically closed, production verification pending**.
- لا تُعد Fully closed إلا بعد التحقق الحي على الإنتاج.
