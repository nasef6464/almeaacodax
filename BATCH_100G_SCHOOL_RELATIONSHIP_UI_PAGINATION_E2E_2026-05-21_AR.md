# BATCH 100G — School Relationship UI Pagination + E2E Browser Verification

التاريخ: 2026-05-21
الحالة: Programmatically closed, production verification pending

## السبب
دفعة BATCH 100F أثبتت أن علاقات المدارس/الفصول/المشرفين/الطلاب/أولياء الأمور تعمل برمجياً، لكنها كشفت خطرًا عمليًا في واجهة إدارة المدرسة: جدول طلاب المدرسة كان يستخدم `visibleSchoolStudents.slice(0, 80)` مما يخفي أي طالب بعد أول 80 نتيجة إذا لم يصل له المستخدم بالبحث أو الفلترة.

## نطاق الدفعة
- إصلاح حد عرض أول 80 طالبًا في جدول طلاب المدرسة داخل لوحة الإدارة.
- الحفاظ على نفس التصميم العام وعدم تغيير الألوان أو الخطوط أو layout.
- إضافة smoke contract يثبت إزالة الحد الصامت وإضافة ترقيم آمن.
- عدم إصلاح إنشاء المجموعات أو أي RBAC آخر في هذه الدفعة.

## ما تم تنفيذه
- تمت إضافة حالة ترقيم داخل `SchoolsManager` لقائمة طلاب المدرسة.
- أصبحت القائمة تعرض `pagedVisibleSchoolStudents` بدل قطع أول 80 طالبًا فقط.
- تمت إضافة أزرار `السابق` و`التالي` ونص نطاق العرض عند وجود أكثر من صفحة.
- يتم تصفير الصفحة تلقائيًا عند تغيير المدرسة أو البحث أو فلتر الفصل.
- أضيف smoke جديد: `npm run smoke:batch100g-school-student-pagination`.

## الملفات المعدلة في هذه الدفعة فقط
| الملف | نوع التغيير | السبب |
|---|---|---|
| `dashboards/admin/SchoolsManager.tsx` | إصلاح واجهة موضعي | إزالة حد `slice(0, 80)` وإضافة ترقيم آمن لقائمة الطلاب |
| `scripts/smoke-batch100g-school-student-pagination-contract.mjs` | Smoke جديد | إثبات عدم وجود hard cap وإثبات وجود الترقيم |
| `package.json` | npm script | إضافة أمر smoke الخاص بالدفعة |
| `BATCH_100G_SCHOOL_RELATIONSHIP_UI_PAGINATION_E2E_2026-05-21_AR.md` | تقرير | توثيق الدفعة |
| `PROJECT_STATUS.md` | تتبع | تحديث الحالة الحالية |
| `docs/SPARK_BATCH_LEDGER_AR.md` | Ledger | تسجيل الدفعة |
| `docs/SPARK_EXECUTION_ROADMAP_AR.md` | خارطة طريق | تحديث التالي المقترح |
| `docs/NEXT_SESSION_HANDOVER_AR.md` | تسليم | تحديث قواعد الاستمرار للحساب التالي |

## ملفات كانت معدلة مسبقًا ولم يتم لمسها
تم رصد ملفات معدلة مسبقًا خارج نطاق الدفعة ولم يتم إصلاحها أو عكسها أو stage لها، منها:
- `App.tsx`
- `contexts/AuthContext.tsx`
- `dashboards/admin/FinancialManager.tsx`
- `dashboards/admin/SchoolPortalManager.tsx`
- `dashboards/admin/UsersManager.tsx`
- `pages/QuizPage.tsx`
- `server/src/routes/notification.routes.ts`
- `server/src/routes/taxonomy.routes.ts`
- `server/src/services/notificationService.ts`
- تقارير وملفات قديمة غير متتبعة خارج نطاق BATCH 100G.

## الفحوص
| الأمر | النتيجة | ملاحظات |
|---|---|---|
| `npm run smoke:batch100g-school-student-pagination` | PASS | 4/4 |
| `npm run smoke:batch100f-relationship-audit` | PASS | 10/10، warnings=0 |
| `npm run smoke:school-management` | PASS | 8/8 |
| `npm run smoke:admin-school-command` | PASS | 6 checks |
| `npm run smoke:school-portal-command` | PASS | 8 checks |
| `npm run smoke:supervisor-dashboard` | PASS | 3/3 |
| `npm run smoke:reports-role` | PASS | 11/11 |
| `npm run smoke:security-rbac-phase6` | PASS | 5 checks |
| `npm --prefix server run build` | PASS | TypeScript backend build نجح |
| `npm run typecheck` | PASS | TypeScript frontend/noEmit نجح |
| `npm run build` | PASS | Vite build نجح |
| `npm run smoke:health-readiness` | PASS | readiness contract نجح |
| `npm run smoke:frontend:strict` | PASS | الإنتاج الحالي قبل push ما زال يخدم commit السابق `c6ab7f0` |

## فحص الإنتاج
- قبل الرفع: `smoke:frontend:strict` نجح على الإنتاج الحالي لكنه كان يخدم commit سابق، لذلك لا يكفي لإغلاق BATCH 100G نهائيًا.
- المطلوب قبل Fully closed: commit/push، انتظار Vercel/Render، ثم إعادة `smoke:frontend:strict` و`smoke:health-readiness`، وفحص بصري من المتصفح الداخلي.

## التحقق اليدوي المطلوب بعد النشر
1. افتح `https://almeaacodax.vercel.app/admin-dashboard`.
2. ادخل لوحة الإدارة بحساب admin.
3. افتح `المجموعات والمدارس`.
4. افتح مدرسة تحتوي طلابًا.
5. تحقق أن جدول الطلاب لا يختفي بعد أول 80 طالبًا، وأن الترقيم يظهر عند وجود أكثر من 80 نتيجة.
6. جرّب البحث وفلتر الفصل وتأكد أن الصفحة تعود للبداية.

## المخاطر المتبقية
- إذا كانت بيانات الإنتاج لا تحتوي مدرسة بأكثر من 80 طالبًا، فالتحقق البصري للترقيم سيبقى contract/static + build فقط، بينما التحقق العملي الكامل يحتاج بيانات مدرسة كبيرة أو seed مخصص.
- ما زال إنشاء group جديد يحتاج دفعة مستقلة لتضييق نطاق `admin/teacher/supervisor` عند create.
- ما زال مطلوبًا فحص زر-بزر لعلاقات المدرسة في المتصفح الداخلي كدفعة E2E أوسع.

## هل تم إغلاق خطر حد 80 طالبًا؟
نعم برمجيًا: تمت إزالة القطع الصامت لأول 80 طالبًا واستبداله بترقيم واضح ومثبت بـ smoke. الإغلاق النهائي ينتظر النشر والتحقق الحي.

## الدفعة التالية المقترحة
BATCH 100H — Group Create Scope Hardening + School Relationship Button E2E
