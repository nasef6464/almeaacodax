# تقرير FIX-3 — Operational Smoke Auth
التاريخ: 2026-05-21
الحالة: Partially Closed (Owner Secrets Required)

## الهدف
إكمال تشغيل:
1. `smoke:operational`
2. `smoke:sentry-live-proof`
على CI والإنتاج بشكل ثابت.

## ما تم تنفيذه
1. فحص سكربتات التشغيل:
   - `scripts/resolve-smoke-admin-token.mjs`
   - `server/src/scripts/smokeOperationalJourneysApi.ts`
2. التحقق من GitHub Actions workflow:
   - الملف: `.github/workflows/post-deploy-smoke.yml`
   - يوجد تحقق إلزامي من `SMOKE_ADMIN_TOKEN`.
3. تحسين CI:
   - إضافة خطوة جديدة بعد التشغيل التشغيلي:
     - `npm run smoke:sentry-live-proof`

## نتائج التشغيل الفعلي الآن
1. `SMOKE_ALLOW_PASSWORD_LOGIN=true npm run smoke:operational` ❌ FAIL
   - السبب: `Invalid email or password` لحساب الأدمن الافتراضي داخل سكربت smoke.
2. `SMOKE_ALLOW_PASSWORD_LOGIN=true npm run smoke:sentry-live-proof` ❌ FAIL
   - السبب: `Missing SMOKE_ADMIN_TOKEN`

## الاستنتاج
- العائق ليس بالكود التشغيلي نفسه؛ العائق في أسرار الإنتاج (token/credentials).
- يلزم توفير توكن أدمن صالح للإنتاج في GitHub + Render لإكمال الإغلاق النهائي.

## المطلوب من المالك (خطوة واحدة حاسمة)
1. الحصول على `SMOKE_ADMIN_TOKEN` صالح من جلسة أدمن إنتاجية.
2. إضافته في:
   - GitHub Actions Secrets:
     - `SMOKE_ADMIN_TOKEN`
   - Render Environment Variables:
     - `SMOKE_ADMIN_TOKEN`
3. (اختياري للبديل عبر الباسورد) إضافة:
   - `SMOKE_ALLOW_PASSWORD_LOGIN=true`
   - مع بيانات اعتماد أدمن صحيحة إن أردتم login-based smoke.

## طريقة استخراج SMOKE_ADMIN_TOKEN بسرعة
1. افتح الموقع كمدير: `https://almeaacodax.vercel.app/`
2. DevTools -> Application -> Cookies
3. انسخ قيمة `almeaa_access_token`
4. ضعها كسكرت في GitHub وRender باسم `SMOKE_ADMIN_TOKEN`.

## تحقق الإغلاق بعد إضافة السر
1. `npm run smoke:operational` يجب أن يمر.
2. `npm run smoke:sentry-live-proof` يجب أن يمر.
3. GitHub Action `Post Deploy Smoke` يجب أن يمر كاملًا مع خطوة Sentry الجديدة.

## ملفات التعديل في هذه الدفعة
- `.github/workflows/post-deploy-smoke.yml`
- `FIX_3_SMOKE_AUTH_AR.md`
