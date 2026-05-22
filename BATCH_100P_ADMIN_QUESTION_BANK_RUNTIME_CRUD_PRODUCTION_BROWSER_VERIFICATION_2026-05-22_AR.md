# BATCH 100P — Admin Question Bank Runtime CRUD + Production Browser Verification

**التاريخ:** 2026-05-22
**الحالة:** Fully closed

## السبب
هذه الدفعة جاءت بعد إغلاق 100O، والهدف كان فحص مركز الأسئلة عمليًا من لوحة الإدارة والإنتاج: الإضافة، الظهور بعد الإضافة، الفلاتر، التعديل، والحذف/الرفض/الاعتماد حسب المتاح، بدون تغيير التصميم.

## نطاق الدفعة
- مركز الأسئلة فقط داخل لوحة الإدارة.
- تثبيت runtime CRUD بحيث تنتظر الواجهة عمليات create/update/delete/review قبل تحديث القائمة.
- حراسة pagination والفلاتر والبحث.
- إصلاح عطل بحث مؤكد في API الأسئلة عند إدخال رموز regex مثل `(` أو `???`.
- لا يوجد تغيير تصميمي.

## السبب الجذري المؤكد
- الواجهة كانت تحتاج ضمانًا صريحًا أن عمليات الحفظ/التعديل/الحذف/الاعتماد/الرفض تنتظر نتيجة API ثم تعيد تحميل القائمة المرقمة، حتى يظهر السؤال الجديد أو الحالة الجديدة مباشرة.
- مسار `GET /api/quizzes/questions` كان يمرر `query.search` مباشرة إلى Mongo `$regex`. لذلك البحث برموز مثل `(` أو `???` يعيد `500 Internal server error` بدل نتيجة فارغة آمنة.

## ما تم تنفيذه
- تثبيت انتظار عمليات `deleteQuestion`, `updateQuestion`, `addQuestion`, `approve`, و`reject` في `QuestionBankManager` مع إظهار خطأ عند الفشل.
- إضافة smoke contract جديد: `npm run smoke:batch100p-question-bank-crud`.
- إضافة guard يؤكد أن مركز الأسئلة يستخدم pagination مع فلاتر `pathId/subject/sectionId/skillId/search`.
- إضافة guard يؤكد أن store ينتظر API في create/update/delete.
- إصلاح بحث الأسئلة في `server/src/routes/quiz.routes.ts` باستخدام `escapeRegex(query.search)` قبل `$regex`.

## الملفات المعدلة في هذه الدفعة فقط
| الملف | نوع التغيير | السبب |
|---|---|---|
| `dashboards/admin/QuestionBankManager.tsx` | تعديل runtime محدود | انتظار mutations وتحديث القائمة بعد CRUD/review |
| `server/src/routes/quiz.routes.ts` | إصلاح backend محدود | منع 500 عند البحث برموز regex في مركز الأسئلة |
| `scripts/smoke-batch100p-question-bank-runtime-crud-contract.mjs` | ملف جديد | حراسة سلوك CRUD والفلاتر |
| `package.json` | إضافة script | إضافة `smoke:batch100p-question-bank-crud` |
| `BATCH_100P_ADMIN_QUESTION_BANK_RUNTIME_CRUD_PRODUCTION_BROWSER_VERIFICATION_2026-05-22_AR.md` | تقرير جديد | توثيق الدفعة |
| `PROJECT_STATUS.md` | تحديث حالة | تسجيل حالة الدفعة |
| `docs/SPARK_BATCH_LEDGER_AR.md` | تحديث Ledger | تسجيل الدفعة |
| `docs/SPARK_EXECUTION_ROADMAP_AR.md` | تحديث خطة | تسجيل التالي |
| `docs/NEXT_SESSION_HANDOVER_AR.md` | تحديث تسليم | تمكين الحساب التالي من الاستمرار |

## الملفات التي كانت معدلة مسبقًا ولم يتم لمسها
الشجرة كانت تحتوي تعديلات قديمة كثيرة قبل 100P، ولم يتم استخدام `git add .`. الملفات القديمة خارج نطاق الدفعة ستبقى خارج الـ stage ما لم تكن ضمن 100P.

## الفحوص
| الأمر | النتيجة | ملاحظات |
|---|---|---|
| `npm run smoke:batch100p-question-bank-crud` | PASS | Contract جديد لمركز الأسئلة |
| `npm --prefix server run build` | PASS | Backend TypeScript build |
| `npm run typecheck` | PASS | TypeScript frontend |
| `npm run build` | PASS | Frontend production build |
| `npm run smoke:batch100i-admin-dashboard-functional-qa` | PASS | Regression مركز الأسئلة السابق |
| `npm run smoke:batch100o-admin-crud-course-linkage` | PASS | Regression الربط السابق |
| `npm run smoke:health-readiness` | PASS | Health/readiness contract |
| `npm run smoke:frontend:strict` | PASS قبل push | الإنتاج كان يخدم commit السابق `cd285f5` قبل دفعة 100P |

## فحص الإنتاج قبل النشر
- API عام للأسئلة:
  - `/api/quizzes/questions?paginate=true&page=1&limit=5&summary=true` أعاد `200`, `total=14`, و`count=5`.
  - `/api/quizzes/questions?paginate=true&page=1&limit=5&summary=true&pathId=p_1777779639431&subject=sub_1777779748206` أعاد `200`, `total=12`, و`count=5`.
- تم إثبات عطل الإنتاج قبل الإصلاح:
  - search=`(` أعاد `500`.
  - search=`???` أعاد `500`.
- بعد الإصلاح المحلي أصبح العقد محروسًا، والتحقق الإنتاجي النهائي ينتظر push/deploy.

## فحص المتصفح الداخلي
- فتح `https://almeaacodax.vercel.app/admin-dashboard?tab=questions&verify=100p-auth-check`.
- مركز الأسئلة ظهر وفيه:
  - زر `إضافة سؤال جديد`.
  - فلاتر المسار/المادة/المهارة.
  - بحث `ابحث في نص السؤال...`.
  - أزرار `اعتماد` و`رفض` و`تعديل` و`حذف`.
- تم إغلاق إعلان عائم كان يعترض أول نقرة على زر الإضافة.
- تمت إضافة سؤال اختبار بعنوان `BATCH 100P runtime CRUD test ...`.
- ظهر السؤال مباشرة بعد الحفظ، وارتفع العداد من `63` إلى `64`.
- تم فتح نموذج التعديل، وتغير نص السؤال إلى صيغة تحتوي `EDITED` وظهر النص المعدل في الصف.
- ظهرت أزرار الرفض والحذف على صف السؤال.
- أثناء خطوة الحذف تعطل اتصال Browser/CDP عند تفاعل confirm، لذلك لم يتم الاعتماد على هذه الخطوة كدليل إغلاق نهائي. فحص API العام لنص الاختبار لم يجد نتيجة عامة، لكن التحقق الإداري الكامل للحذف سيعاد بعد نشر 100P إن كان Browser مستقرًا.

## المخاطر المتبقية
- يجب إعادة فحص search الرمزي `(` و`???` على الإنتاج بعد نشر backend الجديد.
- يجب إعادة فتح Browser بعد النشر وتأكيد أن مركز الأسئلة لا يزال يفتح وأن السؤال الاختباري غير ظاهر في البحث الإداري أو يتم حذفه إن ظهر.
- توجد تحذيرات non-critical في Console من bootstrap/session hydration سابقة خارج نطاق 100P.

## الإغلاق النهائي
- GitHub push: PASS، commit `4e294eb` تم رفعه إلى `origin/main`.
- Vercel: PASS، `npm run smoke:frontend:strict` نجح في المحاولة الثانية وأكد أن الإنتاج يخدم `4e294eb`.
- Render/API: PASS، `npm run smoke:health-readiness` نجح، و`/api/health` أعاد `ready=true` وcommit `4e294ebda105`.
- Production API بعد deploy:
  - search=`(` أعاد `200`, `total=0`.
  - search=`???` أعاد `200`, `total=0`.
  - search=`جمع` أعاد `200`, `total=0`.
  - search=`BATCH 100P runtime CRUD test` أعاد `200`, `total=0`.
- Browser بعد deploy: فتح مركز الأسئلة وأظهر `مركز الأسئلة` و`إضافة سؤال جديد` و`ابحث في نص السؤال...` بلا أخطاء console.
- Cleanup: فحص Mongo المباشر المحدود على `text=/BATCH 100P runtime CRUD test/` أعاد `matched=0`، لذلك لا يوجد سجل اختبار متبق في قاعدة الإنتاج.

## حالة الإغلاق الحالية
برمجيًا: مغلق بفحوص PASS.
إنتاجيًا: Fully closed بعد GitHub/Vercel/Render/API/Browser cleanup verification.

## الدفعة التالية المقترحة
الانتقال إلى أولوية المالك التالية. لا توجد دفعة cleanup مطلوبة حاليًا لأن فحص قاعدة الإنتاج أعاد `matched=0` لسؤال الاختبار.
