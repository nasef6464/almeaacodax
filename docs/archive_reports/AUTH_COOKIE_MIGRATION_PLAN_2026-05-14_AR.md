# تقرير الدفعة 16 — خطة ترحيل Auth Cookie
**التاريخ:** 2026-05-16
**الموديل:** GPT-5.3-Codex / High
**الحالة:** مكتملة ✅

## ما تم
- تحليل تدفق المصادقة الحالي في الواجهة والخادم وتحديد نقاط الاعتماد على `localStorage token` مقابل `HttpOnly cookie`.
- توثيق خطة ترحيل مرحلية من نموذج Hybrid الحالي إلى Cookie-first بدون كسر الجلسات القائمة.
- تحديد نقاط الخطر، آليات rollback، ومعايير القبول لكل مرحلة.

## ملخص الوضع الحالي (Current State)
- الخادم يضبط cookie عبر `setAuthCookie` في login/register/google callback.
- middleware المصادقة يقبل Bearer أو cookie (أولوية Bearer حاليًا إن وُجد).
- الواجهة ترسل `credentials: include` دائمًا، لكن ما زالت تضيف `Authorization: Bearer` من `localStorage` إن كان التوكن موجودًا.
- جلسة المستخدم تُخزّن في `localStorage` (`the-hundred-auth-session`) وتشمل token.

## هدف الترحيل
- الوصول إلى Cookie-first auth في العميل، مع تقليل/إزالة الاعتماد على تخزين access token في `localStorage`.
- الحفاظ على التوافق الخلفي أثناء الانتقال حتى اكتمال جميع المراحل.

## خطة التنفيذ المرحلية المقترحة
1. مرحلة التحضير (Batch 17/Phase 1):
- الإبقاء على التوافق الحالي، مع إضافة feature flag عميل لتعطيل إرسال Bearer تدريجيًا.
- الإبقاء على `credentials: include` كمسار أساسي.
- تسجيل telemetry لقياس نجاح جلسات cookie-only.

2. مرحلة التحول (Phase 2):
- إيقاف حقن `Authorization` افتراضيًا عند تفعيل العلم.
- إبقاء fallback محدد ومؤقت لبعض المسارات الحساسة فقط عند الحاجة.

3. مرحلة الإزالة (Phase 3):
- إزالة token من `localStorage` كليًا من منطق الجلسة الإنتاجية.
- إبقاء أي استثناءات dev-only خلف شروط DEV صريحة.

4. مرحلة التشديد الأمني (Phase 4):
- تدقيق إعدادات cookie (`httpOnly`, `secure`, `sameSite`, `path`) ومواءمتها مع بيئة الإنتاج.
- مراجعة سلوك OAuth redirect لضمان عدم تمرير token في URL على المدى النهائي.

## معايير القبول
- تسجيل الدخول/الخروج/استرجاع الجلسة يعمل عبر cookie في المتصفح الحقيقي.
- جميع مسارات `requireAuth/requireRole` تعمل بدون Bearer من الواجهة.
- لا كسر في Google OAuth flow.
- نجاح smoke: `auth-cookie`, `health-readiness`, وفحوص أساسية build/typecheck.

## المخاطر وخطة التراجع
- المخاطر:
  - اختلاف سياسات cookie عبر المتصفحات/الأجهزة.
  - حالات edge في OAuth callbacks.
- خطة التراجع:
  - إعادة تفعيل feature flag الخاص بإرسال Bearer مؤقتًا.
  - عدم حذف مسار fallback إلا بعد تحقق إنتاجي كامل.

## الملفات المعدّلة في هذه الدفعة
| الملف | نوع التغيير | السبب |
|-------|------------|-------|
| AUTH_COOKIE_MIGRATION_PLAN_2026-05-14_AR.md | إنشاء | توثيق خطة الترحيل المرحلي للدفعة 16 |
| docs/SPARK_BATCH_LEDGER_AR.md | تعديل | تحديث حالة الدفعة 16 إلى Fully closed |
| docs/SPARK_EXECUTION_ROADMAP_AR.md | تعديل | إضافة تحديث إغلاق الدفعة 16 |
| PROJECT_STATUS.md | تعديل | تحديث الحالة الحالية إلى الدفعة 16 مغلقة بالكامل |

## الملفات التي كانت معدّلة مسبقاً ولم يتم لمسها
| الملف | السبب |
|-------|-------|
| لا ينطبق | الدفعة 16 تخطيطية وتم الالتزام بنطاقها |

## نتائج الفحوصات
| الأمر | النتيجة | ملاحظات |
|------|---------|---------|
| npm --prefix server run build | ✅ | نجح |
| npm run typecheck | ✅ | نجح |
| npm run build | ✅ | نجح |
| npm run smoke:auth-cookie | ✅ | نجح |
| npm run smoke:health-readiness | ✅ | نجح |

## التحقق اليدوي
| السيناريو | النتيجة |
|-----------|---------|
| مراجعة وجود cookie path في الخادم | ✅ |
| مراجعة وجود Bearer fallback في العميل | ✅ |
| التأكد أن الدفعة خطة فقط بدون تعديل Runtime | ✅ |

## فحص الإنتاج
- لا ينطبق كتنفيذ API جديد (دفعة خطة).
- تم الاكتفاء بفحوص الكود/العقود لضمان الاستعداد للمرحلة التنفيذية.

## الدفعة التالية المقترحة
BATCH-17 — Auth Cookie Migration Phase 1
