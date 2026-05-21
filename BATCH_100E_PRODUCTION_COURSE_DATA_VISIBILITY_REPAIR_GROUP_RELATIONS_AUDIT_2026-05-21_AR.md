# تقرير الدفعة 100E — إصلاح ظهور الدورة الإنتاجية + إدخال تدقيق العلاقات

**التاريخ:** 2026-05-21  
**اسم الدفعة:** BATCH 100E — Production Course Data Visibility Repair + Groups/Relationships Audit Entry  
**الحالة:** Fully closed بعد تحقق إنتاجي ومرئي

## السبب
بعد إغلاق BATCH 100D ظهر أن مشغل الدورة ليس مكسورًا، لكن الرابط الإنتاجي:
`course_current_p_1777779639431_sub_1777779748206_foundation`
كان يرجع `404 Course not found` من API، بينما يوجد درس مرتبط بنفس المسار/المادة داخل قاعدة الإنتاج. هذا يعني أن المشكلة كانت علاقة بيانات ناقصة: درس موجود بدون دورة/موضوع/اختبار current foundation ظاهر للطلاب.

## نطاق الدفعة
- إصلاح آمن ومحدد لظهور الدورة المفقودة في الإنتاج.
- عدم تغيير تصميم الواجهة أو الألوان أو الخطوط أو layout.
- عدم تعديل منطق مشغل الدورة نفسه.
- عدم تشغيل سكربت إصلاح عام قد يستبدل عناوين الدروس الموجودة.
- إضافة إدخال واضح للخطة التالية الخاصة بتدقيق المجموعات والعلاقات.

## ما تم
1. فحص API الإنتاجي قبل الإصلاح:
   - `GET /api/courses/course_current_p_1777779639431_sub_1777779748206_foundation` كان يرجع `404`.
   - `GET /api/courses?limit=200` لم يكن يحتوي الدورة المستهدفة.
2. فحص MongoDB مباشرة:
   - المادة موجودة.
   - الدرس `lesson_current_p_1777779639431_sub_1777779748206_intro` موجود وعنوانه `جمع`.
   - الدورة والموضوع والاختبار current foundation كانت غير موجودة.
3. أخذ نسخة احتياطية قبل أي إصلاح بيانات:
   - `C:\ALMEAA MAY - codax\backups\learning-content-2026-05-21T12-09-40-854Z.json`
   - المجلد `backups/` مستثنى من Git.
4. إضافة سكربت إصلاح آمن:
   - ينشئ/يربط فقط course/topic/quiz المفقودة عندما يوجد درس current قائم.
   - يحافظ على عنوان الدرس الموجود ولا يستبدله.
   - يستهدف مسار/مادة محددين عبر `--pathId` و `--subjectId`.
5. تشغيل الإصلاح الإنتاجي المحدد:
   - تم إنشاء الدورة والموضوع والاختبار وربط الدرس، مع الحفاظ على عنوان الدرس `جمع`.
6. التحقق من API بعد الإصلاح:
   - مسار الدورة أصبح يرجع `200`.
   - قائمة الدورات أصبحت تحتوي الدورة المستهدفة.
7. التحقق البصري من المتصفح الداخلي:
   - صفحة التعلم تعرض الآن `تأسيس الكمي: العمليات والمهارات الأساسية`.
   - صفحة الدورة لم تعد تعرض `الدورة غير متاحة حاليًا`.
   - الدرس `جمع` يظهر داخل محتوى الدورة.
8. تشغيل عقود المجموعات/العلاقات الحالية:
   - school-management/admin-school-command/school-portal-command نجحت كعقود ثابتة.
   - لا يعتبر هذا فحصًا وظيفيًا كاملًا لكل العلاقات، لذلك تم اقتراح دفعة مستقلة تالية.

## الملفات المعدلة في هذه الدفعة فقط
| الملف | نوع التغيير | السبب |
|---|---|---|
| `server/src/scripts/repairMissingCurrentCourseVisibility.ts` | جديد | سكربت إصلاح آمن للدورة الحالية المفقودة بدون الكتابة فوق الدرس الموجود |
| `scripts/smoke-batch100e-course-data-repair-contract.mjs` | جديد | عقد regression يثبت أن سكربت الإصلاح يحافظ على الدرس ويضبط الظهور |
| `package.json` | تعديل | إضافة `smoke:batch100e-course-data-repair` |
| `server/package.json` | تعديل | إضافة `repair:current-course-visibility` |
| `BATCH_100E_PRODUCTION_COURSE_DATA_VISIBILITY_REPAIR_GROUP_RELATIONS_AUDIT_2026-05-21_AR.md` | جديد | تقرير الدفعة |
| `PROJECT_STATUS.md` | تحديث | تحديث الحالة الحالية والدفعة التالية |
| `docs/SPARK_BATCH_LEDGER_AR.md` | تحديث | تسجيل إغلاق الدفعة |
| `docs/SPARK_EXECUTION_ROADMAP_AR.md` | تحديث | إضافة الدفعة التالية الخاصة بالعلاقات |
| `docs/NEXT_SESSION_HANDOVER_AR.md` | تحديث | تسليم شامل للحساب التالي |

## ملفات كانت معدلة مسبقًا ولم يتم لمسها في هذه الدفعة
- `App.tsx`
- `contexts/AuthContext.tsx`
- `dashboards/admin/FinancialManager.tsx`
- `dashboards/admin/SchoolPortalManager.tsx`
- `dashboards/admin/UsersManager.tsx`
- `pages/QuizPage.tsx`
- `server/src/routes/notification.routes.ts`
- `server/src/routes/taxonomy.routes.ts`
- `server/src/services/notificationService.ts`
- تقارير قديمة متعددة ظاهرة في `git status` قبل هذه الدفعة.

## الفحوص والنتائج
| الأمر | النتيجة | ملاحظات |
|---|---|---|
| `npm --prefix server run audit:learning` قبل الإصلاح | PASS مع WARN | كان يوجد orphan للدرس المستهدف قبل الإصلاح |
| `npm run backup:learning` | PASS | تم إنشاء نسخة احتياطية قبل التعديل |
| `npm run smoke:batch100e-course-data-repair` قبل السكربت | FAIL متوقع | script غير موجود وقت RED |
| `npm run smoke:batch100e-course-data-repair` بعد السكربت | PASS | عقد الإصلاح نجح |
| `npm --prefix server run build` | PASS | TypeScript server سليم |
| `npm --prefix server run repair:current-course-visibility -- --pathId p_1777779639431 --subjectId sub_1777779748206` | PASS | تم إصلاح البيانات المستهدفة |
| `npm --prefix server run audit:learning` بعد الإصلاح | PASS مع WARN بسيط | بقي orphan واحد غير مرتبط بهذه الدفعة: `l_1777839591839_copy` |
| `npm run smoke:course-visibility` | PASS | عقود visibility سليمة |
| `npm run smoke:school-management` | PASS | 8/8 |
| `npm run smoke:admin-school-command` | PASS | 6 checks |
| `npm run smoke:school-portal-command` | PASS | 8 checks |
| `npm run typecheck` | PASS | بدون أخطاء |
| `npm run smoke:health-readiness` | PASS | readiness contract سليم |
| `npm run build` | PASS | Vite build ناجح |

## فحص الإنتاج
- API قبل الإصلاح: `404 Course not found` للدورة المستهدفة.
- API بعد الإصلاح: `200` للدورة المستهدفة.
- `GET /api/courses?limit=200`: الدورة المستهدفة أصبحت موجودة.
- فحص المتصفح الداخلي:
  - صفحة التعلم تعرض الدورة المستهدفة.
  - صفحة الدورة تعرض العنوان والدرس `جمع`.
  - لم تظهر رسالة `الدورة غير متاحة حاليًا`.

## المخاطر المتبقية
- بقي درس orphan آخر: `l_1777839591839_copy`، يحتاج دفعة بيانات منفصلة إن كان يؤثر على تجربة التعلم.
- الاختبار current foundation الذي تم إنشاؤه يحتوي `questionIds: []`، لذلك لا يجب اعتباره اختبارًا جاهزًا للطلاب قبل إضافة أسئلة أو إخفائه/ربطه لاحقًا حسب سياسة المحتوى.
- عقود المجموعات والمدارس نجحت، لكن لم يتم إجراء فحص وظيفي شامل لكل علاقات: مدرسة ← مشرف ← معلم ← مجموعة ← طالب ← ولي أمر. هذا يجب أن يكون دفعة مستقلة.
- لم يتم تعديل أي تصميم أو UI في هذه الدفعة.

## التحقق اليدوي المقترح
1. افتح صفحة التعلم للمسار/المادة:
   `https://almeaacodax.vercel.app/category/p_1777779639431?subject=sub_1777779748206&tab=courses`
2. تأكد من ظهور دورة `تأسيس الكمي: العمليات والمهارات الأساسية`.
3. افتح الدورة:
   `https://almeaacodax.vercel.app/course/course_current_p_1777779639431_sub_1777779748206_foundation`
4. تأكد أن صفحة الدورة لا تعرض `الدورة غير متاحة حاليًا`.
5. تأكد أن الدرس `جمع` ظاهر ضمن محتوى الدورة.

## هل أغلقت المشكلة؟
نعم. المشكلة الإنتاجية المؤكدة الخاصة بعدم ظهور الدورة/404 أغلقت بعد إصلاح البيانات والتحقق من API والمتصفح الداخلي.

## الدفعة التالية المقترحة
`BATCH 100F — Groups/Schools/Parents/Supervisors Relationship Deep Functional Audit`

السبب: المالك طلب فحصًا عميقًا لإدارة المجموعات والعلاقات. هذه الدفعة يجب أن تكون Audit + functional verification واسعة، ولا تخلط مع إصلاح بيانات الدورة الحالي.

## Addendum - Final Production Closure After Push
- GitHub commit: `9047a47`.
- GitHub push: PASS (`main -> origin/main`).
- Render health after deploy: `ready=true`, commit `9047a47420e5`.
- Vercel frontend strict smoke after deploy: PASS, production serving commit `9047a47`, entry asset `index-DqUmP0f0.js`.
- Final in-app browser verification after deploy:
  - Learning page contains the restored course and a direct link to `course_current_p_1777779639431_sub_1777779748206_foundation`.
  - Course page contains `تأسيس الكمي: العمليات والمهارات الأساسية` and lesson `جمع`.
  - `الدورة غير متاحة حاليًا` count is 0.
- Final status: `Fully closed`.
