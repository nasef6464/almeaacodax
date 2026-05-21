# BATCH 100L — Homepage Color Picker Controls

**التاريخ:** 2026-05-21
**اسم الدفعة:** BATCH_100L_HOMEPAGE_COLOR_PICKER_CONTROLS_2026-05-21_AR
**الحالة:** Programmatically closed, production verification pending

## السبب
طلب المالك أن تكون ألوان الصفحة الرئيسية قابلة للاختيار بصريًا من لوحة الإدارة بدل كتابة كود اللون يدويًا، مع خيارات كثيرة واضحة وفحص فعاليتها.

## نطاق الدفعة
- إعدادات ألوان Hero في `إدارة الصفحة الرئيسية` فقط.
- لا تغيير في التصميم العام أو layout.
- لا تغيير في API أو قاعدة البيانات لأن حقول الألوان موجودة بالفعل من BATCH 100J.

## ما تم تنفيذه
- استبدال خانات ألوان Hero النصية بمكوّن `ColorField` يحتوي على:
  - منتقي لون native `type="color"`.
  - خانة HEX ظاهرة للحفظ/التعديل اليدوي.
  - 24 لونًا جاهزًا يمكن الضغط عليها مباشرة.
  - زر `افتراضي` لمسح اللون والعودة للون الافتراضي.
  - تمييز بصري للون المختار.
- تطبيق المكوّن على:
  - لون الشارة.
  - لون مقدمة العنوان.
  - لون الكلمة المميزة.
  - لون نهاية العنوان.
  - لون الوصف الرئيسي.
  - لون زر البداية.
  - لون الزر الثانوي.
  - لون الزر الثالث.
- إضافة smoke contract جديد للتأكد من وجود منتقي الألوان وخيارات كثيرة.

## الملفات المعدلة في هذه الدفعة
| الملف | نوع التغيير | السبب |
|---|---|---|
| `dashboards/admin/HomepageManager.tsx` | تعديل | إضافة Color Picker ولوحة ألوان جاهزة لحقول Hero |
| `package.json` | تعديل | إضافة أمر smoke للدفعة |
| `scripts/smoke-batch100l-homepage-color-picker-contract.mjs` | إنشاء | فحص تعاقدي لمنتقي الألوان |

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

## الفحوص
| الأمر | النتيجة | ملاحظات |
|---|---|---|
| `npm run smoke:batch100l-homepage-color-picker` | PASS | يؤكد وجود ColorField و24 لونًا على الأقل |
| `npm --prefix server run build` | PASS | لا توجد أخطاء backend |
| `npm run typecheck` | PASS | TypeScript OK |
| `npm run smoke:homepage-hero` | PASS | إعدادات Hero ما زالت سليمة |
| `npm run smoke:batch100k-homepage-admin-sweep` | PASS | لم ينكسر شعار الصفحة/البحث/المعاينة |
| `npm run build` | PASS | Vite build OK |
| `git diff --check -- <BATCH 100L files>` | PASS | لا توجد whitespace errors في ملفات الدفعة |

## فحص الإنتاج
- لم يتم بعد في لحظة الإغلاق البرمجي.
- المطلوب قبل `Fully closed`: push إلى GitHub، انتظار Vercel/Render، تشغيل smoke production، ثم فحص بصري من المتصفح الداخلي.

## خطوات التحقق اليدوي
1. افتح `https://almeaacodax.vercel.app/admin-dashboard?tab=homepage` بحساب مدير.
2. اذهب إلى `إدارة الصفحة الرئيسية` ثم قسم Hero.
3. في أي خانة لون، اضغط على أحد الألوان الجاهزة أو افتح مربع اللون.
4. تأكد أن كود اللون يظهر في الخانة.
5. اضغط `حفظ التعديلات`.
6. افتح الصفحة الرئيسية وتأكد أن اللون ظهر على العنصر المقصود.
7. اضغط `افتراضي` ثم احفظ للعودة للون الافتراضي.

## المخاطر المتبقية
- هذه الدفعة لا تضيف معاينة فورية داخل نفس الصفحة قبل الحفظ؛ التحقق يتم بعد الحفظ وفتح الصفحة الرئيسية.
- لو تم إدخال قيمة ليست HEX صحيحة يدويًا، صفحة Landing تتجاهلها وتستخدم fallback آمن.

## هل تم إغلاق الطلب؟
نعم برمجيًا: أصبح اختيار الألوان بصريًا ومتاحًا بخيارات كثيرة. الإغلاق النهائي ينتظر التحقق الإنتاجي.

## الدفعة التالية المقترحة
BATCH 100M — Homepage Live Preview Before Save
