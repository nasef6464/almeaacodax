# BATCH 100J — Homepage Branding Controls + Course Lesson Icons Settings

**التاريخ:** 2026-05-21
**الحالة:** Programmatically closed, production verification pending

## السبب
طلب المالك إضافة تحكم أدق في ألوان وخيارات الصفحة الرئيسية، وإمكانية زر ثالث بجوار زري البداية الحاليين، وإضافة أيقونات قبل/بعد اسم الدرس داخل الدورة مع لون لكل أيقونة، مع الالتزام بعدم تغيير التصميم العام أو فتح دفعة أخرى.

## نطاق الدفعة
- توسيع إعدادات Hero في الصفحة الرئيسية فقط.
- إضافة زر ثالث اختياري لا يظهر إلا إذا تمت كتابة نصه.
- إضافة ألوان اختيارية للنصوص والأزرار في Hero بصيغة HEX آمنة.
- إضافة إعدادات أيقونة بداية/نهاية الدرس على مستوى الدورة.
- عرض الأيقونات في مشغل الدورة وقائمة المنهج دون تغيير layout عام.

## ما تم تنفيذه
- أضيفت حقول `tertiaryCtaLabel` و`tertiaryCtaLink` وحقول ألوان Hero في الأنواع، نموذج MongoDB، وZod validation.
- أضيفت حقول إدارة الألوان والزر الثالث داخل `HomepageManager`.
- أصبحت صفحة Landing تطبق الألوان الاختيارية وتعرض الزر الثالث فقط عند ضبطه.
- أضيفت حقول `lessonStartIcon`, `lessonStartIconColor`, `lessonEndIcon`, `lessonEndIconColor` إلى نموذج الدورة والواجهة.
- تمت إضافة إعدادات الأيقونات في `AdvancedCourseBuilder` و`CourseBuilder`.
- أصبح `CoursePlayer` و`CourseOverview` يعرضان أيقونة قبل/بعد اسم الدرس إذا كانت مضبوطة.
- أضيف smoke جديد: `npm run smoke:batch100j-homepage-branding-course-icons`.

## الملفات المعدلة في هذه الدفعة
| الملف | نوع التغيير | السبب |
|---|---|---|
| `types.ts` | توسيع أنواع | دعم حقول Hero الجديدة وأيقونات الدروس |
| `server/src/models/HomepageSettings.ts` | توسيع schema | حفظ إعدادات الزر الثالث والألوان |
| `server/src/routes/content.routes.ts` | validation/defaults | قبول إعدادات Hero الجديدة بأمان |
| `server/src/models/Course.ts` | توسيع schema | حفظ إعدادات أيقونات الدروس |
| `server/src/routes/course.routes.ts` | validation | قبول إعدادات أيقونات الدروس |
| `dashboards/admin/HomepageManager.tsx` | UI settings | إضافة حقول الألوان والزر الثالث |
| `pages/Landing.tsx` | عرض اختياري | تطبيق الألوان والزر الثالث |
| `dashboards/admin/AdvancedCourseBuilder.tsx` | UI settings | إعدادات أيقونات الدروس في الباني المتقدم |
| `dashboards/admin/CourseBuilder.tsx` | UI settings | إعدادات أيقونات الدروس في الباني البسيط |
| `components/CoursePlayer.tsx` | عرض اختياري | إظهار أيقونات بداية/نهاية الدرس |
| `components/CourseOverview.tsx` | عرض اختياري | إظهار الأيقونات في تبويب المنهج |
| `scripts/smoke-batch100j-homepage-branding-course-icons-contract.mjs` | اختبار جديد | تثبيت عقد الدفعة |
| `package.json` | npm script | إضافة أمر smoke جديد |

## الملفات التي كانت معدلة مسبقًا ولم يتم لمسها
- `App.tsx`
- `contexts/AuthContext.tsx`
- `dashboards/admin/FinancialManager.tsx`
- `dashboards/admin/SchoolPortalManager.tsx`
- `dashboards/admin/UsersManager.tsx`
- `pages/QuizPage.tsx`
- `scripts/smoke-batch12-go-live.mjs`
- `scripts/smoke-performance-contract.mjs`
- `server/src/routes/notification.routes.ts`
- `server/src/routes/taxonomy.routes.ts`
- `server/src/services/notificationService.ts`
- ملفات تقارير/مستندات قديمة غير متعلقة بهذه الدفعة ظلت كما هي.

## الفحوص
| الأمر | النتيجة | ملاحظات |
|---|---|---|
| `npm run smoke:batch100j-homepage-branding-course-icons` قبل التنفيذ | FAIL متوقع | أثبت غياب الحقول قبل التعديل |
| `npm run smoke:batch100j-homepage-branding-course-icons` بعد التنفيذ | PASS | عقد الدفعة تحقق |
| `npm --prefix server run build` | PASS | TypeScript server build ناجح |
| `npm run smoke:homepage-hero` | PASS | إعدادات الصفحة الرئيسية الأساسية سليمة |
| `npm run smoke:batch100d-admin-course-flow` | PASS | عقد باني/مشغل الدورة ما زال سليمًا |
| `npm run build` | PASS | Vite build ناجح |
| `npm run smoke:health-readiness` | PASS | عقد الصحة والجاهزية ناجح |
| `npm run typecheck` | TIMEOUT ثم PASS | أول تشغيل بمهلة 120s انتهى timeout؛ إعادة التشغيل منفردًا بمهلة 300s نجحت |

## فحص الإنتاج
- لم يتم بعد وقت كتابة هذا التقرير الأولي.
- الحالة الحالية: بانتظار GitHub push ثم نشر Vercel/Render ثم smoke production + in-app browser.

## التحقق اليدوي المطلوب بعد النشر
1. فتح `https://almeaacodax.vercel.app/?verify=100j-COMMIT` والتأكد أن الصفحة الرئيسية تعمل بدون أخطاء.
2. فتح `https://almeaacodax.vercel.app/admin-dashboard?tab=homepage&verify=100j-COMMIT` والتأكد من ظهور إعدادات الألوان والزر الثالث.
3. فتح صفحة الدورة الإنتاجية والتأكد أن مشغل الدورة لا ينكسر، وأن الأيقونات تظهر إذا تم ضبطها للدورة.
4. عدم تعديل بيانات الإنتاج إلا إذا احتاج المالك تجربة حفظ فعلية.

## المخاطر المتبقية
- لا يتم تفعيل الزر الثالث أو الأيقونات بصريًا في الإنتاج إلا بعد أن يحفظ المدير القيم الجديدة من لوحة الإدارة.
- لم يتم تغيير نظام رفع اللوجو كملف منفصل في هذه الدفعة؛ تم التركيز على Hero branding والألوان والزر الثالث وأيقونات الدروس.
- توجد تعديلات قديمة غير مرتبطة في الشجرة يجب عدم خلطها مع هذه الدفعة.

## هل أغلقت الدفعة؟
- برمجيًا: نعم.
- إنتاجيًا: بانتظار الرفع والنشر والتحقق الحي.

## الدفعة التالية المقترحة
`BATCH 100K - Admin Dashboard Full Functional Sweep: Homepage Logo Upload + Remaining Broken Buttons`
