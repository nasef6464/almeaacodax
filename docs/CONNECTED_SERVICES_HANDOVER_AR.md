# ملف ربط الخدمات والاستمرارية (بدون أسرار)

آخر تحديث: 2026-05-20
الهدف: أي حساب جديد يقدر يكمل فورًا بنفس الوضع بدون إعادة الربط من الصفر.

## 1) الروابط المباشرة المعتمدة
- GitHub Repository: [nasef6464/almeaacodax](https://github.com/nasef6464/almeaacodax)
- Frontend Production (Vercel): [almeaacodax.vercel.app](https://almeaacodax.vercel.app/)
- Backend Production (Render): [almeaacodax-k2ux.onrender.com/api](https://almeaacodax-k2ux.onrender.com/api)
- Backend Health Check: [/api/health](https://almeaacodax-k2ux.onrender.com/api/health)
- Sentry Issues (Project node): [Sentry Issues](https://almeaa.sentry.io/issues/?project=4511412998570064)
- Render Service Dashboard: [Render Service](https://dashboard.render.com/web/srv-d7qtcr9o3t8c73cs32sg)
- Vercel Project Dashboard: [Vercel Dashboard](https://vercel.com/dashboard)
- MongoDB Atlas Dashboard: [MongoDB Atlas](https://cloud.mongodb.com/)

## 2) ما الذي يعتبر "مربوط" الآن
- GitHub: الربط يعمل (push إلى `main` تم أكثر من مرة).
- Render: الخدمة شغالة وصحية عبر `/api/health`.
- Vercel: الواجهة الإنتاجية متاحة.
- MongoDB: الاتصال مستخدم في الإنتاج (لا تضع URI داخل المستودع).
- Sentry: المشروع يعمل وتظهر فيه Issues وأحداث.

## 3) أين تحفظ المفاتيح (المكان الصحيح)
- محليًا فقط: `.env.codex.local` (غير مرفوع).
- على المنصات نفسها:
  - GitHub Secrets
  - Render Environment Variables
  - Vercel Environment Variables
  - MongoDB Atlas
  - Sentry Project Settings

ممنوع وضع أي `token` أو `password` داخل ملفات التقارير أو الكود.

## 3.1) الدليل الرسمي للمفاتيح والتكاملات

مرجع التنفيذ الكامل هنا:

- [INTEGRATIONS_KEYS_SETUP_GUIDE_AR.md](C:\ALMEAA MAY - codax\docs\INTEGRATIONS_KEYS_SETUP_GUIDE_AR.md)

يشمل بالتفصيل:
1. GitHub / Vercel / Render / MongoDB / Redis / Sentry.
2. تكاملات الذكاء الاصطناعي (Gemini / OpenRouter / Qwen / وغيرها).
3. إعداد `AI_PROVIDER_ORDER` المقترح المجاني.
4. التحقق التشغيلي بعد الربط.
5. تدوير المفاتيح عند انتهاء الرصيد.

## 4) الخطوة الناقصة الشائعة
الخطوة التي قد تمنع إغلاق Smoke النهائي عادة هي `SMOKE_ADMIN_TOKEN`.

طرق الحصول عليه:
1. أوتوماتيك عبر سكربت الدخول بالأدمن:
   - وفر `SMOKE_ADMIN_EMAIL` و`SMOKE_ADMIN_PASSWORD` محليًا.
   - شغّل: `npm run smoke:resolve-admin-token`
2. يدويًا من جلسة أدمن على الموقع الإنتاجي:
   - سجّل دخول أدمن إلى `almeaacodax.vercel.app`.
   - من DevTools > Application > Cookies انسخ قيمة `almeaa_access_token`.
   - ضعها محليًا كـ `SMOKE_ADMIN_TOKEN`.

## 5) أوامر التحقق القياسية
- فحص صحة الواجهة/الباك:
  - `curl https://almeaacodax.vercel.app/`
  - `curl https://almeaacodax-k2ux.onrender.com/api/health`
- فحص عقود الدورات/التعلم:
  - `npm run smoke:course-visibility`
  - `npm run smoke:curriculum-import-scope`
- فحص Sentry live proof:
  - `npm run smoke:sentry-live-proof`

## 6) تسلسل الإغلاق الكامل لأي دفعة
1. تنفيذ التعديل.
2. تشغيل الفحوص وتسجيل PASS/FAIL بصدق.
3. `git add` (ملفات الدفعة فقط) ثم `git commit` ثم `git push`.
4. متابعة نشر Render/Vercel حتى Ready.
5. تحقق حي بصري من الواجهة كمستخدم.
6. تحديث:
   - `PROJECT_STATUS.md`
   - `docs/SPARK_BATCH_LEDGER_AR.md`
   - `docs/NEXT_SESSION_HANDOVER_AR.md`

## 7) ملاحظات أمان مهمة
- أي مفاتيح ظهرت داخل المحادثات السابقة يفضّل تدويرها بعد نهاية العمل.
- لا تشارك المفاتيح في الرسائل النصية لاحقًا؛ استخدم منصات الإدارة فقط.
