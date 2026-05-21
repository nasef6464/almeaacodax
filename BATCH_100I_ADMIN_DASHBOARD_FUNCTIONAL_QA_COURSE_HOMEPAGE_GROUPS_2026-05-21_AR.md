# تقرير الدفعة 100I — فحص وظائف لوحة الإدارة: الصفحة الرئيسية، مشغل الدورة، مركز الأسئلة، والمجموعات

**التاريخ:** 2026-05-21  
**اسم الدفعة:** `BATCH_100I_ADMIN_DASHBOARD_FUNCTIONAL_QA_COURSE_HOMEPAGE_GROUPS_2026-05-21_AR`  
**الحالة قبل النشر:** Programmatically closed, production verification pending  
**النطاق:** إصلاح/تثبيت وظائف موجودة فقط بدون تغيير تصميم عام.

## سبب الدفعة
- المالك طلب فحص لوحة الإدارة بدقة، خصوصًا إعدادات الصفحة الرئيسية، مشغل الدورة، علاقات المجموعات، ومركز الأسئلة.
- أثناء الفحص ظهر أن مركز الأسئلة يعرض `لا توجد أسئلة` رغم وجود أسئلة، وأن إضافة السؤال لا تظهر فورًا في الجدول.
- طلبات ألوان الصفحة الرئيسية/اللوجو/زر ثالث/أيقونات الدروس تم تسجيلها كدفعة UI لاحقة لأنها تغيير خصائص عرض وليست ضمن إصلاح 100I.

## ما تم
- تثبيت عقد `GET /api/quizzes/questions?paginate=true` ليعيد `{ data, pagination }` للواجهة بدل مصفوفة فقط.
- إبقاء التوافق القديم لمسار الأسئلة عند عدم إرسال `paginate=true`، حتى لا تنكسر الشاشات التي تتوقع مصفوفة.
- جعل مركز الأسئلة يعيد تحميل الصفحة المرقمة بعد الإضافة، التعديل، الحذف، النسخ، الاستيراد، الاعتماد، والرفض.
- تقوية حماية التسميات المعطوبة التي تظهر كسلاسل `????` في منشئ الدورات المتقدم والبسيط.
- تعقيم عرض أسماء المسارات والمهارات في `CourseBuilder` حتى لا تظهر علامات استفهام بدل نص مفهوم.
- إضافة smoke جديد يغطي عقود الصفحة الرئيسية، مشغل الدورة، مركز الأسئلة المرقم، وحماية التسميات.

## الملفات المعدلة في هذه الدفعة فقط
| الملف | نوع التغيير | السبب |
|---|---|---|
| `server/src/routes/quiz.routes.ts` | تعديل API | دعم `paginate=true` برد مرقم آمن لمركز الأسئلة |
| `dashboards/admin/QuestionBankManager.tsx` | تعديل واجهة وظيفي | إعادة تحميل الأسئلة بعد الإضافة/التعديل/الحذف وعدم الاعتماد على قائمة قديمة |
| `dashboards/admin/AdvancedCourseBuilder.tsx` | حماية عرض | منع ظهور تسميات `????` في منشئ الدورات المتقدم |
| `dashboards/admin/CourseBuilder.tsx` | حماية عرض | منع ظهور تسميات `????` وتعقيم أسماء المسارات والمهارات |
| `scripts/smoke-batch100i-admin-dashboard-functional-qa-contract.mjs` | ملف جديد | فحص عقد 100I ومنع رجوع المشكلة |
| `package.json` | npm script | إضافة `smoke:batch100i-admin-dashboard-functional-qa` |
| `BATCH_100I_ADMIN_DASHBOARD_FUNCTIONAL_QA_COURSE_HOMEPAGE_GROUPS_2026-05-21_AR.md` | تقرير جديد | توثيق الدفعة |
| `PROJECT_STATUS.md` | توثيق | تحديث حالة المشروع |
| `docs/SPARK_BATCH_LEDGER_AR.md` | توثيق | تحديث السجل |
| `docs/SPARK_EXECUTION_ROADMAP_AR.md` | توثيق | إضافة الدفعة التالية المقترحة 100J |
| `docs/NEXT_SESSION_HANDOVER_AR.md` | تسليم | تحديث تعليمات الحساب التالي |

## ملفات كانت معدلة مسبقًا ولم يتم لمسها
- `App.tsx`
- `contexts/AuthContext.tsx`
- `dashboards/admin/FinancialManager.tsx`
- `dashboards/admin/SchoolPortalManager.tsx`
- `dashboards/admin/UsersManager.tsx`
- `pages/QuizPage.tsx`
- `server/src/routes/notification.routes.ts`
- `server/src/routes/taxonomy.routes.ts`
- `server/src/services/notificationService.ts`
- `scripts/smoke-batch12-go-live.mjs`
- `scripts/smoke-performance-contract.mjs`
- تقارير وملفات قديمة غير متعقبة خارج نطاق 100I ظلت كما هي ولم يتم staging لها.

## الفحوص المحلية
| الأمر | النتيجة | ملاحظات |
|---|---|---|
| `npm run smoke:batch100i-admin-dashboard-functional-qa` | PASS | يغطي مركز الأسئلة، الصفحة الرئيسية، منشئ الدورات، ومشغل الدورة |
| `npm --prefix server run build` | PASS | TypeScript backend |
| `npm run typecheck` | PASS | TypeScript frontend |
| `npm run build` | PASS | Vite build |
| `npm run smoke:batch100d-admin-course-flow` | PASS | عقود مشغل/منشئ الدورة |
| `npm run smoke:homepage-hero` | PASS | إعدادات صورة الصفحة الرئيسية |
| `npm run smoke:course-visibility` | PASS | ظهور الدورات |
| `npm run smoke:batch100h-group-create-scope` | PASS | نطاق إنشاء المجموعات |
| `npm run smoke:school-management` | PASS | علاقات المدارس |
| `npm run smoke:health-readiness` | PASS | عقد الصحة والجاهزية |

## فحص الإنتاج
- لم يتم بعد في لحظة إنشاء التقرير الأولية.
- المطلوب بعد push:
  1. انتظار Vercel/Render.
  2. تشغيل `npm run smoke:frontend:strict`.
  3. تشغيل `npm run smoke:health-readiness`.
  4. فحص بصري من المتصفح الداخلي على `https://almeaacodax.vercel.app/admin-dashboard?verify=100i-<commit>`.
  5. التأكد من أن مركز الأسئلة لا يظهر فارغًا بسبب عقد pagination.

## المخاطر المتبقية
- لم يتم إنشاء/حذف سؤال إنتاجي أثناء الفحص لتجنب تغيير بيانات حقيقية دون إذن صريح.
- قد توجد بيانات قديمة بأسماء معطوبة داخل MongoDB؛ الدفعة الحالية تمنع ظهورها كـ `????` في الواجهة لكنها لا تنظف قاعدة البيانات.
- طلبات ألوان الصفحة الرئيسية واللوجو والزر الثالث وأيقونات الدروس تحتاج دفعة UI إعدادات مستقلة.

## التحقق اليدوي المقترح
1. افتح لوحة الإدارة بحساب المدير.
2. افتح `مركز الأسئلة`.
3. تأكد أن جدول الأسئلة يعرض نتائج عند وجود أسئلة في قاعدة البيانات.
4. أضف سؤالًا تجريبيًا في بيئة آمنة أو محلية، ثم تأكد أنه يظهر بعد الحفظ بدون refresh يدوي.
5. افتح إعدادات الدورة وتأكد أن أسماء المسار/المادة/المهارات لا تظهر كعلامات استفهام.
6. افتح مشغل الدورة وتأكد أن الدورة الحالية تعمل ولا تظهر رسالة عدم الإتاحة.

## هل أُغلقت الدفعة؟
- محليًا: نعم، الفحوص نجحت.
- إنتاجيًا: بانتظار push/deploy/visual verification.

## الدفعة التالية المقترحة
`BATCH 100J - Homepage Branding Controls + Course Lesson Icons Settings`

### نطاق BATCH 100J المقترح
- إضافة تحكم ألوان للخطوط والبنود في الصفحة الرئيسية من لوحة الإدارة.
- إضافة/إدارة اللوجو من إعدادات الصفحة الرئيسية.
- إتاحة زر ثالث بجانب الزرين الحاليين في hero.
- إعداد أيقونة/لون قبل الدرس وبعد الدرس داخل الدورة/مشغل الدورة.
- عدم تغيير التصميم العام، فقط إضافة إعدادات قابلة للتحكم من الإدارة.
