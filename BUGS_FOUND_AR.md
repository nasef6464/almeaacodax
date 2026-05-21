# الأخطاء المؤكدة — تحتاج إصلاح فوري
التاريخ: 2026-05-21

> هذا الملف يحتوي أخطاء مؤكدة فقط من الكود أو الفحوص. لا يحتوي اقتراحات عامة.

## Bug 1 — تسريب الإجابات الصحيحة في نتائج الاختبار
- الحالة: 🔴 حرج
- الملفات والأسطر:
  - `server/src/routes/quiz.routes.ts:2140` يخزن `correctOptionIndex` داخل `questionReview`.
  - `server/src/routes/quiz.routes.ts:2142` يخزن `explanation` داخل `questionReview`.
  - `server/src/routes/quiz.routes.ts:2217` يرجع `result` الخام للعميل بعد التسليم.
  - `pages/Results.tsx:1645` يستخدم `q.correctOptionIndex` لتمييز الإجابة الصحيحة.
  - `pages/Results.tsx:1806` يعرض نص الإجابة الصحيحة.
  - `pages/Results.tsx:1810-1816` يعرض الشرح.
- طريقة التكاثر:
  1. طالب يحل اختبارًا.
  2. يفتح رد submit أو صفحة النتيجة/Network.
  3. يجد `correctOptionIndex` و/أو `explanation` ضمن بيانات المراجعة.
- التأثير: كشف الإجابات الصحيحة والشروحات للطالب عبر API، وهذا يخالف قاعدة الأمان المعلنة بعدم كشف correct answers/explanations.

## Bug 2 — تفاصيل نتيجة الاختبار ترجع بيانات خام غير معقمة
- الحالة: 🔴 حرج
- الملفات والأسطر:
  - `server/src/routes/quizResults.routes.ts:90-113` يرجع `{ result, analysis }` بعد owner/admin check بدون serializer يزيل الإجابات الصحيحة.
- طريقة التكاثر:
  1. استخدم نتيجة يملكها الطالب.
  2. اطلب endpoint تفاصيل النتيجة.
  3. راقب `result.questionReview`.
- التأثير: حتى لو list endpoint يحذف `questionReview`، detail endpoint لا يحذف محتوى الإجابات.

## Bug 3 — نطاق منتدى النقاشات واسع للمعلم/المشرف
- الحالة: 🔴 عالي/حرج حسب البيانات
- الملفات والأسطر:
  - `server/src/routes/discussions.routes.ts:26-28` يسمح لأي `admin/teacher/supervisor` بالوصول لأي entity.
  - `server/src/routes/discussions.routes.ts:181-196` يسمح للمعلم/المشرف بحل thread بدون إعادة فحص نطاق الكورس/المدرسة.
- طريقة التكاثر:
  1. احصل على threadId خارج نطاق teacher/supervisor.
  2. جرّب resolve أو قراءة النقاش بدور staff غير مالك.
- التأثير: احتمال إدارة أو قراءة نقاشات خارج نطاق المدرسة/المادة/الدورة.

## Bug 4 — نصوص عربية تالفة تظهر كـ Mojibake أو علامات استفهام
- الحالة: 🟡 مؤكد بصريًا ومن الكود
- الملفات والأسطر:
  - `App.tsx:264-285` meta titles/descriptions تالفة.
  - `App.tsx:334-335` fallback brand تالفة.
  - `pages/CourseView.tsx:74`, `106`, `112`, `128`, `133`, `179`, `181` نصوص واجهة تالفة.
  - `server/src/routes/payment.routes.ts:139-163`, `470-488`, `1364-1634` رسائل/labels تالفة.
- طريقة التكاثر:
  1. افتح صفحات الدورة أو fallback/loading أو أخطاء الدفع.
  2. تظهر `????` أو حروف مثل `Ø/Ù` بدل العربية.
- التأثير: تجربة مستخدم غير احترافية ورسائل إدارية/مالية غير مفهومة.

## Bug 5 — الإنتاج لا يثبت أنه على آخر commit من GitHub
- الحالة: 🟡 مؤكد
- الملفات/الدليل:
  - `server/src/routes/health.routes.ts:27-38` يعرض commit من بيئة النشر.
  - live `/api/health` رجع commit `5d9b337a96f9`.
  - `origin/main` أثناء الفحص كان `8c1c9311322a274bcdf9820acc76fcc9e7ee021d`.
- طريقة التكاثر:
  1. شغّل `git ls-remote origin main`.
  2. افتح `https://almeaacodax-k2ux.onrender.com/api/health`.
  3. قارن commit.
- التأثير: لا يمكن اعتبار أحدث تغييرات GitHub منشورة على Render إلا بعد مزامنة/نشر.

## Bug 6 — فحوص CI التشغيلية وسنتري الحية تفشل بدون SMOKE_ADMIN_TOKEN
- الحالة: 🟡 مؤكد
- الملفات/الدليل:
  - `.github/workflows/post-deploy-smoke.yml:14-17` يطلب secrets.
  - `.github/workflows/post-deploy-smoke.yml:40-52` يشغل operational وسنتري live proof.
  - `npm run smoke:operational` فشل برسالة missing token.
  - `npm run smoke:sentry-live-proof` فشل برسالة `Missing SMOKE_ADMIN_TOKEN`.
- التأثير: لا توجد قناة إثبات تلقائي كاملة بعد النشر بدون secret صالح.

## Bug 7 — لا توجد صفحة 404 حقيقية ولا صفحات قانونية عامة
- الحالة: 🔵 مفقود مؤكد
- الملفات/الدليل:
  - `App.tsx:819-857` يحتوي wrapper `path="*"` لكن لا يحتوي route داخلية `*` لصفحة NotFound.
  - لا توجد ملفات `Terms`, `Privacy`, `About`, `NotFound` داخل `pages/` أثناء الفحص.
- التأثير: مسارات خاطئة وتجهيزات الإطلاق التجاري غير مكتملة.

## Bug 8 — علاقة QuestionAttempt مع QuizResult غير مباشرة
- الحالة: 🟡 مؤكد
- الملفات والأسطر:
  - `server/src/models/QuestionAttempt.ts:3-15` لا يحتوي `quizResultId`.
- التأثير: التحليلات أو إعادة بناء محاولة محددة من Result إلى attempts أصعب، وقد يؤدي لتقارير ناقصة عند التوسع.
