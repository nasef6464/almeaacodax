# خارطة تنفيذ SPARK (النسخة العربية)

## مقدمة

**المشروع:** ALMEAA CODAX / منصة المئة

**التقنية المستخدمة:**
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: MongoDB + Mongoose
- Hosting: Vercel (Frontend) + Render (Backend)
- Repo: GitHub

**طريقة العمل:**
- تنفيذ العمل على دفعات مكتملة (Batch-first).
- كل دفعة لها هدف واضح، نطاق واضح، فحوصات واضحة، تقرير مستقل.
- يمنع الدمج العشوائي أو تغيير التصميم/القواعد بدون خطة.

**تعريف العمل على دفعات:**
- Spark يعمل بنمط "دفعة واحدة = تنفيذ + فحص + توثيق + إغلاق واضح".
- لا نبدأ دفعة جديدة قبل إغلاق الدفعة الجارية حسب الحالة الرسمية.
- أي سحب لمستند handover واضح يصبح مرجعًا للتسلسل التالي.

## قواعد العمل الصارمة

- لا تغيير تصميم.
- لا تغيير ألوان.
- لا تغيير خطوط.
- لا تعديل غير متعلق بالدفعة الحالية.
- لا فتح أكثر من دفعة في نفس وقت.
- لا إخفاء بيانات لتحسين الأداء.
- لا حذف ميزات.
- لا تسريب أسرار.
- لا commit لملفات `.env` أو القيم السرية.
- لا اعتبار الدفعة مغلقة نهائيًا حتى تتأكد من الفحص.
- لا دمج غير مبرمج.
- الفحص الإنتاجي إلزامي على الدفعات ذات تأثير الواجهة العامة/الأمن/الرووت/الربط.
- التحقق المرئي مطلوب لكل تعديل في الواجهة.
- كل دفعة لديها **تقرير منفصل** محدث.

## تعريف حالات الدفعات

- **Fully closed**: تم التنفيذ + الفحوص + التقرير + التحقق الإنتاجي (عند الحاجة) + تحديث handover.
- **Programmatically closed, production verification pending**: تنفيذ وفحوص محلية نجحت، لكن المنتج غير مؤكّد على الإنتاج.
- **Programmatically closed, typecheck pending**: التنفيذ تم لكن فحص TypeScript/Build غير مكتمل.
- **Partially closed**: تم تنفيذ بعض النقاط فقط أو مازال هناك خلل معتمد.
- **Open**: لم يبدأ بعد.
- **Failed / needs rollback**: الدفعة فشلت وتحتاج rollback أو إعادة تنفيذ.

## خريطة الطريق الكاملة (BATCH 00 إلى BATCH 21)

لكل دفعة نحدد: الهدف، السبب، النطاق، الممنوعات، الفحوص، ملف التقرير، شرط الإغلاق.

### BATCH 00 — Current State Verification
- الهدف: تثبيت ملفات التشغيل وإقفال حالة البداية.
- السبب: نحتاج مصدر مرجعي واحد لتحديد نقطة الانطلاق ومواضع العمل المفتوحة.
- النطاق: توثيق فقط؛ لا تعديل ميزة.
- الممنوعات: لا تعديل أي Route/Backend.
- الفحوص: `git status`, `git diff --stat`, قراءة handover + ملفات README الحالية.
- التقرير المطلوب: `BATCH_00_CURRENT_STATE_VERIFICATION_2026-05-14_AR.md`.
- شرط الإغلاق: إنشاء ملفات roadmap/ledger والتقرير.

### BATCH 01 — Data Visibility Regression Tests
- الهدف: منع اختفاء المحتوى بعد تغييرات التحميل/المسارات.
- السبب: مشكلة تاريخية كانت ظهرت في topics/lessons/skills.
- النطاق: اختبارات الرؤية فقط (visibility checks).
- الممنوعات: لا تغييرات أداء/رووت/UI.
- الفحوص: smoke visibility tests + typecheck/build.
- التقرير المطلوب: `DATA_VISIBILITY_REGRESSION_TESTS_2026-05-14_AR.md`.
- شرط الإغلاق: جميع اختبارات الرؤية تعمل.

### BATCH 02 — Payment Amount Tampering Protection
- الهدف: منع تزوير المبلغ/البند/الـ includedCourseIds من الواجهة.
- السبب: أمان المدفوعات من أعلى المخاطر.
- النطاق: منطق إنشاء/مراجعة الطلبات.
- الممنوعات: لا تعديل تصميم الصفحة.
- الفحوص: `smoke:payment-providers`, `smoke:api-phase4`, اختبار عدم قبول مبالغ مزورة.
- التقرير المطلوب: `PAYMENT_AMOUNT_TAMPERING_FIX_2026-05-14_AR.md`.

### BATCH 03 — Platform Integration Secrets Security
- الهدف: حماية أسرار التكاملات (Google/Email/WhatsApp/Sentry/Redis/webhooks).
- السبب: تقليل مخاطرة تسرب مفاتيح.
- النطاق: إدارة الأسرار في الواجهات والحفظ والإرجاع.
- الممنوعات: لا إظهار السرية كاملة في أي API/واجهة.
- الفحوص: `smoke:integrations-runtime`, build backend.
- التقرير المطلوب: `PLATFORM_INTEGRATION_SECRETS_FIX_2026-05-14_AR.md`.

### BATCH 04 — Admin Users Pagination
- الهدف: تقنين إرجاع المستخدمين في لوحة الإدارة.
- السبب: منع تحميل كامل غير آمن.
- النطاق: فقط نهاية `admin/users` pagination.
- الممنوعات: لا تغيير أدوار ولا قواعد صلاحيات.
- الفحوص: backend build + frontend build/typecheck إذا تم تعديل الواجهة.
- التقرير المطلوب: `ADMIN_USERS_PAGINATION_FIX_2026-05-14_AR.md`.

### BATCH 05 — Payment Requests Pagination
- الهدف: تقنين إرجاع طلبات الدفع.
- السبب: استقرار الواجهة الإدارية + تقليل حمل الشبكة/DB.
- النطاق: list endpoints لطلبات الدفع فقط.
- الممنوعات: لا تغيير دورة الموافقة.
- الفحوص: `smoke:payment-providers`, `smoke:api-phase4` + build.
- التقرير المطلوب: `PAYMENT_REQUESTS_PAGINATION_FIX_2026-05-14_AR.md`.

### BATCH 06 — Quiz Results Pagination
- الهدف: تقنين عرض نتائج الاختبارات الثقيلة.
- السبب: نتائج الاختبارات قد تكبر بسرعة.
- النطاق: endpoints نتائج/فلترة.
- الممنوعات: لا تعديل scoring engine.
- الفحوص: backend build + اختبارات security/quiz إن وُجدت.
- التقرير المطلوب: `QUIZ_RESULTS_PAGINATION_FIX_2026-05-14_AR.md`.

### BATCH 07 — Access Codes Pagination
- الهدف: تقنين قوائم أكواد الوصول وسجلات الاسترداد.
- السبب: زيادة حجم البيانات وتزامن العمليات.
- النطاق: endpoints أكواد الوصول + history.
- الممنوعات: عدم تغيير منطق redemption.
- الفحوص: build + smoke access/payment إن وجد.
- التقرير المطلوب: `ACCESS_CODES_PAGINATION_FIX_2026-05-14_AR.md`.

### BATCH 08 — Questions Pagination
- الهدف: تقنين استرجاع الأسئلة في البنوك واللوحات.
- السبب: تحسين الأداء ومنع تحميل كبير.
- النطاق: list endpoints الأسئلة + serializers.
- الممنوعات: لا كشف الإجابات الصحيحة لواجهة الطالب.
- الفحوص: build + typecheck + أي quiz security smoke.
- التقرير المطلوب: `QUESTIONS_PAGINATION_AND_SAFE_SERIALIZER_FIX_2026-05-14_AR.md`.

### BATCH 09 — RBAC Security Audit Plan
- الهدف: مراجعة RBAC الحالية قبل تعديل الكود.
- السبب: أخطاء صلاحيات تميل لتكون جذرية.
- النطاق: تحليل routes + أدوار + نقاط خطورة.
- الممنوعات: لا تعديل كود إلا عند ضرورة واضحة.
- الفحوص: لا build إلزامي إذا توثيق فقط.
- التقرير المطلوب: `RBAC_SECURITY_AUDIT_PLAN_2026-05-14_AR.md`.

### BATCH 10 — RBAC/API Hardening Batch 1
- الهدف: تنفيذ أعلى أولوية واحدة فقط من خطة RBAC.
- السبب: تجنّب تعديل واسع دفعة واحدة.
- النطاق: fix لهدف أمني واحد.
- الممنوعات: لا تعديل endpoints أخرى.
- الفحوص: backend build + security smoke.
- التقرير المطلوب: `RBAC_API_HARDENING_BATCH_1_2026-05-14_AR.md`.

### BATCH 11 — Sentry Monitoring Readiness
- الهدف: تفعيل إعدادات مراقبة Sentry readyness.
- السبب: الرصد الأخطاء ضروري قبل التوسع.
- النطاق: إعداد env + تهيئة error handling.
- الممنوعات: لا تسجيل SENTRY_DSN أو كشفه.
- الفحوص: build frontend/backend + typecheck.
- التقرير المطلوب: `SENTRY_MONITORING_READY_2026-05-14_AR.md`.

### BATCH 12 — Redis/BullMQ Production Queue Readiness
- الهدف: جاهزية الطوابير والإشعارات غير المتزامنة.
- السبب: أداء واستقرار الإرسال الجماعي.
- النطاق: queue config + degraded mode.
- الممنوعات: لا معالجة Bulk داخل Request مباشرة.
- الفحوص: backend build + integrations smoke.
- التقرير المطلوب: `REDIS_QUEUE_READY_2026-05-14_AR.md`.

### BATCH 13 — Firebase Legacy Cleanup / Isolation
- الهدف: ضمان MongoDB مصدر الحقيقة الأساسي.
- السبب: منع fallback مخفي على Firebase.
- النطاق: audit + عزل fallback.
- الممنوعات: لا كسر المسارات العاملة.
- الفحوص: build + typecheck.
- التقرير المطلوب: `FIREBASE_LEGACY_CLEANUP_2026-05-14_AR.md`.

### BATCH 14 — Content Bootstrap Split Plan
- الهدف: تحليل آمن لتقسيم bootstrap المحتوى.
- السبب: تقليل زمن فتح الصفحة.
- النطاق: دراسة الاستهلاك، ليس تنفيذ.
- الممنوعات: لا حذف أو تعديل runtime.
- الفحوص: تحليل static + توثيق.
- التقرير المطلوب: `CONTENT_BOOTSTRAP_SPLIT_PLAN_2026-05-14_AR.md`.

### BATCH 15 — Content Bootstrap Safe Implementation
- الهدف: تنفيذ أول خطوة تخفيف bootstrap مع الحفاظ على سلامة البيانات.
- السبب: سرعة الواجهة بدون فقدان وظائف.
- النطاق: تنفيذ تخفيف واحد آمن فقط.
- الممنوعات: لا تقسيم شامل دفعة واحدة.
- الفحوص: backend build + frontend build/typecheck + Data visibility tests.
- التقرير المطلوب: `CONTENT_BOOTSTRAP_SAFE_IMPLEMENTATION_1_2026-05-14_AR.md`.

### BATCH 16 — Auth Cookie Migration Plan
- الهدف: وضع خطة migration تدريجية لـ cookie auth.
- السبب: إزالة الاعتماد التام على client-side tokens.
- النطاق: mapping + risks + roadmap.
- الممنوعات: لا تغيير login flow الآن.
- الفحوص: فحص التكوين الحالي.
- التقرير المطلوب: `AUTH_COOKIE_MIGRATION_PLAN_2026-05-14_AR.md`.

### BATCH 17 — Auth Cookie Migration Phase 1
- الهدف: تنفيذ أول مرحلة آمنة للـ cookie بدون قطع الوظيفة.
- السبب: حماية gradual token handling.
- النطاق: endpoints + الطلبات + تسجيل الخروج.
- الممنوعات: لا إعادة بناء كاملة لتسجيل الدخول.
- الفحوص: `smoke:auth-account`, `smoke:auth-cookie`, backend build.
- التقرير المطلوب: `AUTH_COOKIE_MIGRATION_PHASE1_2026-05-14_AR.md`.

### BATCH 18 — SEO BrowserRouter Migration Plan
- الهدف: تحضير خطة الانتقال من HashRouter.
- السبب: SEO وارتكاز مسارات نظيفة.
- النطاق: خرائط routes، redirects، risks.
- الممنوعات: لا تنفيذ فعلي قبل مرور المسارات.
- الفحوص: analysis فقط.
- التقرير المطلوب: `SEO_BROWSERROUTER_MIGRATION_PLAN_2026-05-14_AR.md`.

### BATCH 19 — SEO BrowserRouter Safe Implementation
- الهدف: تنفيذ مسارات نظيفة + noindex للخصوصي + rewrites.
- السبب: تحسين ظهور عام ومتانة route refresh.
- النطاق: تنفيذ محدد بعد اعتماد فحوص data visibility.
- الممنوعات: لا تغيير UI.
- الفحوص: build/typecheck + route smoke.
- التقرير المطلوب: `SEO_BROWSERROUTER_SAFE_IMPLEMENTATION_2026-05-14_AR.md`.

### BATCH 20 — Load Testing Scripts
- الهدف: إضافة سكربتات k6/Artillery لقياس الحمل.
- السبب: لا claims عن 1000/10000 بدون قياس.
- النطاق: scripts فقط + وثائق التشغيل.
- الممنوعات: لا claim نهائي قبل نتائج.
- الفحوص: تنفيذ/تشغيل السكربت على staging/production آمن.
- التقرير المطلوب: `LOAD_TESTING_SCRIPTS_2026-05-14_AR.md`.

### BATCH 21 — Final Production Readiness Report
- الهدف: تقرير نهائي نهائي للجاهزية + جدول القدرات.
- السبب: تسليم واضح للمالك مع مخاطره وخطة التوسع.
- النطاق: مراجعة كل الدفعات + gaps + external keys + checklist.
- الممنوعات: لا مبالغة في claims.
- الفحوص: مراجعة مخرجات جميع الدفعات + اختبارات إنتاجية سابقة.
- التقرير المطلوب: `FINAL_PRODUCTION_READINESS_REPORT_2026-05-14_AR.md`.

## Update 2026-05-16 — Batch 06 Closure Note
- Batch 06 (Quiz Results Pagination) closed programmatically with production verification pending.
- Backend now supports safe paginated quiz-results queries with max limit 100 and filter/sort controls.
- No scoring logic changes and no exposure of correct answers/explanations were introduced.
- Suggested next batch remains: Batch 07 (Access Codes Pagination), and must not start until explicit owner approval.

## Update 2026-05-16 — Batch 06 Implementation Refresh
- Added dedicated secure endpoints for quiz results pagination (`/api/quiz-results/my`, `/api/admin/quiz-results`).
- Enforced hard max limit of 100 and validated/sanitized query params.
- Frontend student session hydration now consumes paginated endpoint output.
- Batch 06 remains programmatically closed pending live production verification.
- Live verification note: production currently returns 404 for new Batch 06 quiz-results endpoints until deployment sync.

## Update 2026-05-16 — Batch 06 Final Verification Refresh
- Batch 06 scope remained isolated to quiz-results pagination.
- Manual security verification completed locally with all target scenarios passing:
  - student no-auth: 401
  - student own results only: PASS
  - student cross-student access: 403
  - student on admin endpoint: 403
  - limit cap enforcement (`limit=999 -> 100`): PASS
  - no correct-answer leakage fields: PASS
  - pagination envelope present: PASS
- Required checks completed (`server build`, `typecheck`, `frontend build`, `smoke:auth-cookie`, `smoke:health-readiness`) plus quiz-related smokes (`smoke:results`, `smoke:quiz-client-security`).
- `smoke:quiz` script is not present in this repository and was documented as such.
- Suggested next batch remains Batch 07 and must not start before explicit owner approval.
- Production live recheck (2026-05-16): new Batch 06 endpoints still return `404` on production while legacy `/api/quizzes/results` returns `401`.

## قاعدة تشغيلية مضافة بطلب المالك (2026-05-16)
- عند الانتقال إلى دفعة جديدة بأمر "اكمل": تستمر المعالجة حتى الإغلاق النهائي لنفس الدفعة.
- لا انتقال لدفعة لاحقة إلا بعد:
  - تنفيذ كامل النطاق.
  - فحوص مكتملة ومُوثقة.
  - تحديث التقارير والـ Ledger.
  - تحقق حي على الإنتاج للجزء المتأثر.
- إذا تعذر التحقق الحي: تُسجّل الحالة جزئية بوضوح ولا تعتبر الدفعة مغلقة نهائيًا.

## Update 2026-05-16 — Batch 06 Final Closure
- Batch 06 (Quiz Results Pagination) reached full closure after successful live production verification.
- Verified in production: auth/role responses (401/403/200), hard cap limit=100, pagination envelope, and no correct-answer leakage fields.

## Update 2026-05-16 — Batch 07 Implementation Refresh
- Added secure paginated endpoints for access codes and access-code redemptions:
  - `GET /api/content/access-codes`
  - `GET /api/content/access-code-redemptions`
- Enforced hard cap `limit=100` with safe clamp behavior.
- Added filtering/sorting/date-range query support and pagination envelope response.
- Enforced protected access for `admin/supervisor` and supervisor school-scope isolation.
- Updated existing school management screen to request paginated access-code data only.
- Batch 07 is programmatically closed pending live production verification after deployment sync.

## Update 2026-05-16 — Batch 07 Final Closure
- Batch 07 (Access Codes Pagination) reached full closure.
- Production live verification confirmed endpoint availability and auth protection:
  - `/api/content/access-codes` => `401`
  - `/api/content/access-code-redemptions` => `401`
  - `/api/health` => `200`
- Scope stayed isolated to pagination/security in access-code listing and redemption history.
