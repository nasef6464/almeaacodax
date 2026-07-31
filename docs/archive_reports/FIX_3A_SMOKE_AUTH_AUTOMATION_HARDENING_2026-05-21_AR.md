# FIX-3A — Smoke Admin Auth Automation Hardening — 2026-05-21

## الحالة
- النتيجة: `Programmatically closed (secret dependent)`

## ما تم تنفيذه
1. أتمتة مسار `smoke:operational` ليحاول استخراج `SMOKE_ADMIN_TOKEN` تلقائيًا إذا توفر:
   - `SMOKE_ADMIN_EMAIL`
   - `SMOKE_ADMIN_PASSWORD`
2. أتمتة مسار `smoke:sentry-live-proof` بنفس المنهج.
3. تحديث GitHub Actions workflow ليقبل أحد خيارين:
   - `SMOKE_ADMIN_TOKEN` مباشرة
   - أو `SMOKE_ADMIN_EMAIL` + `SMOKE_ADMIN_PASSWORD` ويُستخرج التوكن تلقائيًا.
4. تفعيل `SMOKE_ALLOW_PASSWORD_LOGIN=true` داخل workflow لضمان fallback الرسمي في CI.

## الملفات المتأثرة
- `scripts/smoke-operational-auto.mjs`
- `scripts/smoke-sentry-live-proof-auto.mjs`
- `package.json`
- `.github/workflows/post-deploy-smoke.yml`

## نتائج الفحص
- `npm run typecheck` ✅ PASS
- `npm run smoke:operational` ❌ FAIL (لا يوجد token ولا credentials في البيئة المحلية)
- `npm run smoke:sentry-live-proof` ❌ FAIL (لا يوجد token)

## التفسير
- الفشل الحالي ليس كوديًا، بل نقص أسرار تشغيل فقط.
- بعد إضافة أسرار GitHub/Render المطلوبة، نفس المسار سيعمل تلقائيًا بدون خطوة يدوية لاستخراج التوكن.

## المطلوب للإغلاق النهائي الحي
- إضافة أحد الخيارين في الأسرار:
  1. `SMOKE_ADMIN_TOKEN`
  2. أو `SMOKE_ADMIN_EMAIL` + `SMOKE_ADMIN_PASSWORD`
- ثم إعادة تشغيل:
  - `smoke:operational`
  - `smoke:sentry-live-proof`

## القرار
- FIX-3 من جهة الأتمتة والإعداد البرمجي: مكتمل.
- الإغلاق الحي النهائي: ينتظر الأسرار فقط.
