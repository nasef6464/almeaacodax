# تقرير الدفعة 100B — تضييق RBAC لنطاق النقاشات

**التاريخ:** 2026-05-21
**الحالة:** Fully closed

## سبب الدفعة
كشف الفحص العميق أن `server/src/routes/discussions.routes.ts` كان يسمح لأي `teacher` أو `supervisor` بالوصول إلى أي نقاش أو حله بمجرد معرفة المعرف، بدون ربط واضح بنطاق الدورة/المدرسة/المادة.

## نطاق الدفعة
- إصلاح backend فقط لمسارات النقاشات.
- عدم تغيير UI أو التصميم.
- عدم تغيير منطق الكويز أو الدفع.
- عدم فتح دفعة أخرى.

## ما تم تنفيذه
- إزالة السماح العام غير المشروط للمعلم/المشرف داخل `assertCanAccessEntity`.
- إضافة resolver يربط `course/lesson/quiz` بالدورات التي تحتويها.
- السماح للمعلم/المشرف فقط إذا كانت الدورة ضمن:
  - `ownerId` أو `createdBy` أو `assignedTeacherId` الخاص بالمستخدم.
  - مدرسة المستخدم عبر `schoolId`.
  - `managedPathIds` أو `managedSubjectIds`.
- إبقاء admin كامل الصلاحية.
- إبقاء الطالب محصورًا في الدورات المسجل بها فقط.
- منع parent/أدوار أخرى من الوصول ما لم تكن طالبًا مسجلًا.
- إعادة فحص نطاق thread قبل تنفيذ `resolve`.
- إضافة smoke contract جديد: `smoke:discussions-rbac-scope`.

## الملفات المعدلة في هذه الدفعة
| الملف | نوع التغيير | السبب |
|---|---|---|
| `server/src/routes/discussions.routes.ts` | إصلاح أمني | تضييق نطاق teacher/supervisor وربط النقاش بالدورة قبل السماح |
| `scripts/smoke-discussions-rbac-scope-contract.mjs` | اختبار جديد | إثبات عدم وجود bypass عام وفحص ترتيب resolve |
| `package.json` | npm script | إضافة `smoke:discussions-rbac-scope` |
| `PROJECT_STATUS.md` | توثيق | تحديث حالة الدفعة والتالي |
| `docs/SPARK_BATCH_LEDGER_AR.md` | توثيق | تسجيل الدفعة في السجل |
| `docs/NEXT_SESSION_HANDOVER_AR.md` | توثيق | تسليم واضح للحساب القادم |
| `BATCH_100B_DISCUSSIONS_RBAC_SCOPE_HARDENING_2026-05-21_AR.md` | تقرير | تقرير إغلاق الدفعة |

## الملفات التي كانت معدلة مسبقًا ولم يتم لمسها
- توجد تعديلات قديمة كثيرة خارج نطاق هذه الدفعة مثل `App.tsx`, `pages/QuizPage.tsx`, بعض ملفات admin، وبعض تقارير/سكربتات قديمة غير متتبعة.
- لم يتم عمل `git add .` ولم يتم تضمين أي من هذه الملفات في الدفعة.

## الفحوص
| الأمر | النتيجة | ملاحظات |
|---|---|---|
| `node scripts/smoke-discussions-rbac-scope-contract.mjs` قبل الإصلاح | FAIL | 4/4 فشل كما هو متوقع وأثبت وجود الخطر |
| `npm --prefix server run build` | PASS | TypeScript backend نجح |
| `npm run smoke:discussions-rbac-scope` | PASS | 4/4 checks |
| `npm run smoke:security-rbac-phase6` | PASS | RBAC phase 6 لم ينكسر |
| `npm run typecheck` | PASS | TypeScript frontend/root نجح |
| `npm run build` | PASS | Vite build نجح |
| `npm run smoke:health-readiness` | PASS | health/readiness contract نجح |
| `npm run smoke:production-hardening` | PASS | 5/5 checks |
| `npm run smoke:data-visibility-regression` | PASS | 28/28 checks |

## فحص الإنتاج
- GitHub push: PASS، commit الإصلاح `e1c07ba`.
- Vercel: PASS، `npm run smoke:frontend:strict` أكد أن الإنتاج يخدم commit `e1c07ba`.
- Render: PASS، `/api/health` رجع `ready=true` وcommit `e1c07bac7771`.
- المتصفح المدمج: PASS، تم فتح الإنتاج والتحقق من أن الواجهة تعمل بدون أخطاء console ظاهرة.

## خطوات التحقق اليدوي
1. تسجيل الدخول كـ admin: يجب أن يستطيع قراءة/حل أي نقاش.
2. تسجيل الدخول كطالب مسجل في دورة: يجب أن يرى نقاشات دورته فقط.
3. طالب غير مسجل يحاول course/lesson/quiz discussion: يجب أن يحصل على 403.
4. Teacher ضمن `assignedTeacherId` أو `managedSubjectIds`: يسمح له.
5. Teacher خارج النطاق: 403.
6. Supervisor ضمن `schoolId` أو `managedPathIds/managedSubjectIds`: يسمح له.
7. Supervisor خارج النطاق: 403.
8. محاولة `resolve` لـ thread خارج النطاق: 403 قبل التحديث.

## المخاطر المتبقية
- smoke الحالي contract/static وليس runtime API متعدد المستخدمين، لأن تجهيز حسابات أدوار إنتاجية لكل السيناريوهات يحتاج أسرار وبيانات اختبار مستقرة.
- parent discussion behavior بقي محافظًا ومغلقًا ما لم يكن المستخدم طالبًا مسجلًا؛ أي تمكين لولي الأمر يحتاج دفعة مستقلة بقاعدة linkedStudentIds واضحة.
- لا تزال هناك تعديلات قديمة في worktree خارج نطاق هذه الدفعة.

## هل تم إغلاق الخطر؟
نعم. تم إلغاء bypass العام وإضافة scope check قبل القراءة/الرد/الحل، ثم تم إثبات النشر على Vercel وRender.

## الدفعة التالية المقترحة
BATCH 100C — Arabic Mojibake Cleanup + Regression Guard
