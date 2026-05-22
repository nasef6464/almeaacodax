# تقرير الدفعة 17 — Auth Cookie Migration Phase 1
**التاريخ:** 2026-05-16
**الموديل:** GPT-5.3-Codex / High
**الحالة:** مكتملة ✅

## ما تم
- تنفيذ Phase 1 من ترحيل المصادقة إلى Cookie-first بشكل آمن وتدريجي.
- إضافة feature flag عميل: `VITE_AUTH_COOKIE_FIRST=true`.
- عند تفعيل العلم: العميل لا يقرأ token من `localStorage` تلقائيًا لإرسال `Authorization` header.
- الإبقاء على التوافق الخلفي: إذا تم تمرير `token` صراحة في أي استدعاء API يستمر دعمه كما هو.

## الملفات المعدّلة في هذه الدفعة
| الملف | نوع التغيير | السبب |
|-------|------------|-------|
| services/api.ts | تعديل | تفعيل cookie-first خلف feature flag مع الحفاظ على fallback الصريح |
| services/clientTelemetry.ts | تعديل | مواءمة إرسال telemetry مع cookie-first وعدم قراءة token تلقائيًا |
| AUTH_COOKIE_MIGRATION_PHASE1_2026-05-14_AR.md | إنشاء | توثيق تنفيذ الدفعة 17 |
| docs/SPARK_BATCH_LEDGER_AR.md | تعديل | تحديث حالة الدفعة 17 إلى Fully closed |
| docs/SPARK_EXECUTION_ROADMAP_AR.md | تعديل | إضافة تحديث إغلاق الدفعة 17 |
| PROJECT_STATUS.md | تعديل | تحديث الحالة إلى الدفعة 17 مغلقة بالكامل |

## الملفات التي كانت معدّلة مسبقاً ولم يتم لمسها
| الملف | السبب |
|-------|-------|
| لا ينطبق | تم الالتزام بنطاق الدفعة 17 فقط |

## نتائج الفحوصات
| الأمر | النتيجة | ملاحظات |
|------|---------|---------|
| npm --prefix server run build | ✅ | نجح |
| npm run typecheck | ✅ | نجح |
| npm run build | ✅ | نجح |
| npm run smoke:auth-account | ✅ | نجح |
| npm run smoke:auth-cookie | ✅ | نجح |
| npm run smoke:health-readiness | ✅ | نجح |

## التحقق اليدوي
| السيناريو | النتيجة |
|-----------|---------|
| تفعيل `VITE_AUTH_COOKIE_FIRST=true` لا يكسر build | ✅ |
| استمرار `credentials: include` في عميل API | ✅ |
| وجود fallback عند تمرير token صريح | ✅ |

## فحص الإنتاج
- الـ build ينجح بدون أخطاء: ✅
- TypeScript بدون أخطاء: ✅
- لا توجد secrets في الكود: ✅
- التنفيذ مرحلي ومحمي بعلم تشغيل، ما يسمح rollout آمن.

## المخاطر المتبقية
- يلزم تفعيل العلم في بيئة staging/production تدريجيًا ومتابعة جلسات OAuth قبل إزالة fallback نهائيًا.

## مشاكل اكتُشفت خارج نطاق الدفعة (لا تُصلح الآن)
- لا ينطبق.

## الدفعة التالية المقترحة
BATCH-18 — SEO BrowserRouter Migration Plan
