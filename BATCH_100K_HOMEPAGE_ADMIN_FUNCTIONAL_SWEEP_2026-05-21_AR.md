# BATCH 100K — Admin Dashboard Full Functional Sweep

**التاريخ:** 2026-05-21  
**اسم الدفعة:** BATCH_100K_HOMEPAGE_ADMIN_FUNCTIONAL_SWEEP_2026-05-21_AR  
**الحالة:** Programmatically closed, production verification pending

## السبب
طلب المالك فحص لوحة الإدارة بدقة لأن بعض أزرار/إعدادات الصفحة الرئيسية لا يظهر أثرها فعليًا، وخاصة تغيير الصورة/الشعار من إعدادات الصفحة الرئيسية، مع وجود قوائم محدودة عند اختيار الدورات/المقالات المميزة.

## نطاق الدفعة
- إعدادات الصفحة الرئيسية داخل لوحة الإدارة فقط.
- شعار الهيدر العام للمنصة.
- رابط معاينة الصفحة الرئيسية من لوحة الإدارة.
- قوائم اختيار الدورات والمقالات المميزة داخل مدير الصفحة الرئيسية.
- لم يتم تغيير تصميم عام أو ألوان افتراضية خارج القيم التي يتحكم بها المدير.

## ما تم تنفيذه
- إضافة `brand` إلى إعدادات الصفحة الرئيسية لحفظ شعار المنصة ونص الشعار ووصفه.
- دعم `brand` في TypeScript types، Mongo model، وbackend validation.
- إضافة قسم "شعار المنصة" في `HomepageManager` مع رفع صورة شعار حتى 300KB وحقول نص الشعار.
- ربط `Header` بإعدادات الصفحة الرئيسية ليعرض الشعار/نص الشعار المحفوظ من الإدارة.
- إصلاح زر "معاينة الصفحة" ليذهب إلى `/` بدل `#/` داخل لوحة الإدارة.
- إزالة حد أول 30 عنصرًا من قوائم الدورات والمقالات المميزة.
- إضافة بحث داخل قوائم الدورات والمقالات المميزة بدل الحد الثابت.
- إضافة smoke contract جديد يغطي وظائف BATCH 100K.

## الملفات المعدلة في هذه الدفعة
| الملف | نوع التغيير | السبب |
|---|---|---|
| `types.ts` | تعديل | إضافة `HomepageBrandSettings` و`brand` داخل إعدادات الصفحة الرئيسية |
| `server/src/models/HomepageSettings.ts` | تعديل | تخزين إعدادات الشعار في MongoDB |
| `server/src/routes/content.routes.ts` | تعديل | قبول/تحقق `brand` في API وإعداد default آمن |
| `dashboards/admin/HomepageManager.tsx` | تعديل | واجهة إدارة الشعار والبحث وإصلاح رابط المعاينة |
| `components/Header.tsx` | تعديل | عرض شعار/نص الشعار من إعدادات الإدارة |
| `package.json` | تعديل | إضافة أمر smoke للدفعة |
| `scripts/smoke-batch100k-homepage-admin-functional-sweep-contract.mjs` | إنشاء | فحص تعاقدي للوظائف الجديدة |

## ملفات كانت معدلة مسبقًا ولم يتم لمسها
- `App.tsx`
- `BATCH_02R_PAYMENT_AMOUNT_TAMPERING_PRODUCTION_CLOSURE_2026-05-16_AR.md`
- `BATCH_06_CURRENT_STATE_VERIFICATION_2026-05-14_AR.md`
- `BATCH_06_REPORT_AR.md`
- `BATCH_17R_AUTH_COOKIE_PRODUCTION_CLOSURE_2026-05-17_AR.md`
- `BATCH_24_PLATFORM_INTEGRATION_SECRETS_ENCRYPTION_AT_REST_2026-05-18_AR.md`
- `contexts/AuthContext.tsx`
- `dashboards/admin/FinancialManager.tsx`
- `dashboards/admin/SchoolPortalManager.tsx`
- `dashboards/admin/UsersManager.tsx`
- `docs/BATCH_1_2_FINAL_GO_LIVE_2026-05-14_AR.md`
- `pages/QuizPage.tsx`
- `scripts/smoke-batch12-go-live.mjs`
- `scripts/smoke-performance-contract.mjs`
- `server/src/routes/notification.routes.ts`
- `server/src/routes/taxonomy.routes.ts`
- `server/src/services/notificationService.ts`
- ملفات وتقارير untracked قديمة كثيرة ظاهرة في `git status` ولم يتم إضافتها لهذه الدفعة.

## الفحوص
| الأمر | النتيجة | ملاحظات |
|---|---|---|
| `npm run smoke:batch100k-homepage-admin-sweep` قبل الإصلاح | FAIL متوقع | أثبت غياب دعم الشعار/البحث/رابط المعاينة الصحيح |
| `npm run smoke:batch100k-homepage-admin-sweep` بعد الإصلاح | PASS | العقد الجديد مر بالكامل |
| `npm --prefix server run build` | PASS | TypeScript backend OK |
| `npm run typecheck` | PASS | أول تشغيل 120s timeout ولم يُحسب؛ إعادة التشغيل بمهلة أطول نجحت |
| `npm run build` | PASS | Vite build OK |
| `npm run smoke:homepage-hero` | PASS | إعدادات الهيرو لا تزال سليمة |
| `npm run smoke:frontend:strict` | PASS | الإنتاج الحالي قبل push ما زال على commit السابق ويعمل |
| `npm run smoke:health-readiness` | PASS | health/readiness OK |
| `git diff --check` | FAIL خارج النطاق | بسبب مسافات زائدة في تقرير قديم معدل مسبقًا `BATCH_02R...` |
| `git diff --check -- <ملفات الدفعة>` | PASS | لا توجد مشاكل whitespace في ملفات BATCH 100K |

## فحص الإنتاج
- لم يتم بعد في لحظة الإغلاق البرمجي.
- المطلوب قبل `Fully closed`: push إلى GitHub، انتظار Vercel/Render، تشغيل `smoke:frontend:strict` و`smoke:health-readiness`، ثم فحص بصري من المتصفح الداخلي.

## خطوات التحقق اليدوي
1. افتح `https://almeaacodax.vercel.app/admin-dashboard?tab=homepage` بحساب مدير.
2. تأكد من ظهور قسم `شعار المنصة`.
3. ارفع شعارًا صغيرًا أو ضع رابط صورة، ثم اضغط `حفظ التعديلات`.
4. افتح الصفحة الرئيسية وتأكد أن الهيدر يعرض الشعار/النص الجديد.
5. اضغط `معاينة الصفحة` وتأكد أنه يفتح الصفحة الرئيسية وليس hash داخل لوحة الإدارة.
6. جرّب البحث داخل `الدورات المميزة` و`المقالات المميزة` وتأكد أن القائمة غير محصورة في أول 30 عنصرًا.

## المخاطر المتبقية
- الشعار المرفوع يحفظ كـ data URL داخل إعدادات MongoDB؛ مناسب لشعار صغير جدًا، لكن تخزين ملفات أكبر يحتاج مزود ملفات مستقل لاحقًا.
- هذه الدفعة لا تفحص كل أزرار لوحة الإدارة؛ عالجت الجزء المؤكد المتعلق بإعدادات الصفحة الرئيسية.
- `git diff --check` العام يبقى متأثرًا بملف قديم خارج نطاق الدفعة.

## هل تم إغلاق الخطر؟
نعم برمجيًا: تم ربط إعدادات الشعار فعليًا بالهيدر، وتم إصلاح المعاينة وإزالة حد أول 30 عنصرًا. الإغلاق النهائي ينتظر التحقق الإنتاجي بعد النشر.

## الدفعة التالية المقترحة
BATCH 100L — Admin Dashboard Remaining Buttons Deep E2E Sweep
