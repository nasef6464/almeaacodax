# تقرير الدفعة 100F — فحص علاقات المدارس والمجموعات والأدوار

**التاريخ:** 2026-05-21  
**اسم الدفعة:** BATCH_100F_GROUPS_SCHOOLS_RELATIONSHIPS_DEEP_FUNCTIONAL_AUDIT_2026-05-21_AR  
**الحالة:** Programmatically closed, production verification pending after deploy  
**نوع الدفعة:** فحص عميق + smoke regression، بدون تغيير UI أو سلوك إنتاجي.

## سبب الدفعة
طلب المالك فحصًا دقيقًا لعلاقات إدارة المجموعات والمدارس والمشرفين والمعلمين والطلاب وأولياء الأمور، وإضافة ذلك للخطة قبل الاستمرار في إصلاحات أكبر. هذه الدفعة لا تصلح كل شيء؛ هدفها إثبات ما يعمل من الكود وتسجيل المخاطر المؤكدة بدقة.

## نطاق الدفعة
- فحص نموذج `Group` وعلاقاته: مدرسة، فصل، مجموعة خاصة.
- فحص نموذج `User` وعلاقاته: `schoolId`, `groupIds`, `linkedStudentIds`.
- فحص backend لمسارات المدارس والمجموعات والتقارير والاستيراد.
- فحص frontend لمسارات الإدارة: إدارة المدارس، بوابة المدارس، إدارة المستخدمين، لوحة المشرف.
- إضافة smoke contract خاص بالدفعة حتى يكون الفحص قابلًا للإعادة.
- تحديث ملف التسليم للحساب التالي بخطة العمل والاستراتيجية.

## ما تم فحصه
| المجال | النتيجة | الدليل |
|---|---|---|
| نموذج المجموعات | يعمل | `server/src/models/Group.ts` يحتوي `type/parentId/supervisorIds/studentIds/courseIds` وفهارس للطلاب والمشرفين. |
| نموذج المستخدم | يعمل | `server/src/models/User.ts` يحتوي `schoolId/groupIds/linkedStudentIds` وفهارس مرتبطة بالأدوار. |
| مسار علاقات المدرسة | يعمل ومؤمّن | `server/src/routes/content.routes.ts:2857` يستخدم `requireAuth`, `requireRole(["admin", "supervisor"])`, و`assertSchoolManagementScope`. |
| تقرير المدرسة | يعمل ومؤمّن | `server/src/routes/content.routes.ts:1978` يستخدم نفس scope guard قبل إرجاع التقرير. |
| استيراد الطلاب | يعمل ومؤمّن | `server/src/routes/content.routes.ts:2112` يستخدم نفس scope guard قبل الاستيراد. |
| CRUD المجموعات | جزئي آمن | تعديل/حذف المجموعة يفحص `hasGroupManagementScope`، لكن إنشاء المجموعة يعتمد على role ولا يفحص scope عند الإنشاء لأنه يستقبل payload كامل. يحتاج دفعة hardening لاحقة. |
| واجهة علاقات المدرسة | تعمل | `dashboards/admin/SchoolsManager.tsx:1908` تستدعي `api.applySchoolRelations` وتحدث المستخدمين والمجموعات من رد السيرفر. |
| ربط الطلاب بالفصول | يعمل | `store/useStore.ts:1056` يحدث user + group ويستدعي API للحفظ. |
| ربط المشرفين | يعمل | `store/useStore.ts:1224` يضيف المشرف إلى `groupIds` و`supervisorIds`. |
| ربط ولي الأمر | يعمل | `dashboards/admin/UsersManager.tsx:434` يدعم تغيير `linkedStudentIds`. |
| بوابة المشرف | تعمل كعقد نطاق | `dashboards/admin/SchoolPortalManager.tsx` يعتمد على `user.groupIds` ويصفي الطلاب/النتائج/الاختبارات حسب النطاق. |

## المخاطر المؤكدة التي ظهرت
| الدرجة | المشكلة | الدليل | الأثر |
|---|---|---|---|
| HIGH | جدول طلاب المدرسة محدود لأول 80 طالبًا | `dashboards/admin/SchoolsManager.tsx:2725` يستخدم `visibleSchoolStudents.slice(0, 80)` | عند مدرسة كبيرة قد لا يرى الأدمن/المشرف كل الطلاب إلا بالبحث/الفلترة؛ يحتاج pagination أو virtual list. |
| MEDIUM | إنشاء المجموعات يقبل payload كامل من admin/teacher/supervisor | `server/src/routes/content.routes.ts:1695` ينشئ مباشرة من `groupSchema.parse(req.body)` | المشرف/المعلم قد يحتاجان قيدًا أقوى عند إنشاء مجموعة داخل نطاقهما فقط. التعديل/الحذف محميان، لكن الإنشاء يحتاج hardening. |
| LOW | توجد بقايا كود frontend قديم بعد اعتماد مسار السيرفر لعلاقات المدرسة | `dashboards/admin/SchoolsManager.tsx` يحتوي منطق fallback قديم بعد `return` في تدفق العلاقات | لا يكسر السلوك الحالي، لكنه يزيد صعوبة الصيانة ويحتاج تنظيفًا لاحقًا. |
| MEDIUM | الفحص البصري الكامل لكل جزء داخل إدارة المدارس لم يكتمل بعد كـ E2E شامل | هذه الدفعة أضافت contract/static + smoke وليس تشغيل كل زر أماميًا | يحتاج دفعة E2E عملية على المتصفح المدمج لكل تبويب/زر في الإدارة. |

## الملفات المعدلة في هذه الدفعة فقط
| الملف | نوع التغيير | السبب |
|---|---|---|
| `scripts/smoke-batch100f-relationship-audit-contract.mjs` | إضافة | Smoke contract لفحص علاقات المدارس/المجموعات/الأدوار من الكود. |
| `package.json` | تحديث | إضافة أمر `smoke:batch100f-relationship-audit`. |
| `BATCH_100F_GROUPS_SCHOOLS_RELATIONSHIPS_DEEP_FUNCTIONAL_AUDIT_2026-05-21_AR.md` | إضافة | تقرير إغلاق الدفعة. |
| `PROJECT_STATUS.md` | تحديث | تسجيل حالة الدفعة التالية/الحالية. |
| `docs/SPARK_BATCH_LEDGER_AR.md` | تحديث | إضافة سجل الدفعة. |
| `docs/SPARK_EXECUTION_ROADMAP_AR.md` | تحديث | تحديث الخطة بعد فحص العلاقات. |
| `docs/NEXT_SESSION_HANDOVER_AR.md` | تحديث | تسليم الحساب التالي وخطوات العمل. |

## ملفات كانت معدلة مسبقًا ولم يتم لمسها أو لم يتم إدخالها في نطاق الدفعة
- `App.tsx`
- `contexts/AuthContext.tsx`
- `dashboards/admin/FinancialManager.tsx`
- `dashboards/admin/SchoolPortalManager.tsx`
- `dashboards/admin/UsersManager.tsx`
- `pages/QuizPage.tsx`
- `server/src/routes/notification.routes.ts`
- `server/src/routes/taxonomy.routes.ts`
- `server/src/services/notificationService.ts`
- تقارير قديمة متعددة غير متتبعة تظهر في `git status` من دفعات سابقة.

## الفحوص والنتائج
| الأمر | النتيجة | ملاحظات |
|---|---|---|
| `npm run smoke:batch100f-relationship-audit` | PASS | 10/10 checks، مع warning واحد عن حد 80 طالبًا. |
| `npm run smoke:school-management` | PASS | 8/8 checks. |
| `npm run smoke:admin-school-command` | PASS | 6 checks. |
| `npm run smoke:school-portal-command` | PASS | 8 checks. |
| `npm run smoke:supervisor-dashboard` | PASS | 3/3 checks. |
| `npm run smoke:reports-role` | PASS | 11/11 checks. |
| `npm run smoke:security-rbac-phase6` | PASS | 5 checks. |
| `npm --prefix server run build` | PASS | TypeScript server build. |
| `npm run typecheck` | PASS | أول تشغيل timeout عند 124s، إعادة التشغيل منفردًا نجحت في 89.3s. |
| `npm run build` | PASS | Vite build نجح. |
| `npm run smoke:health-readiness` | PASS | readiness contract aligned. |

## فحص الإنتاج
- قبل النشر: لم يتم بعد، لأن الدفعة لا تزال تحتاج commit/push/deploy verification.
- المطلوب بعد الرفع: انتظار Vercel/Render ثم تشغيل `npm run smoke:frontend:strict` وفحص المتصفح المدمج على لوحة الإدارة.

## خطوات التحقق اليدوي المقترحة
1. افتح `https://almeaacodax.vercel.app/admin-dashboard` بحساب admin.
2. ادخل إلى `المجموعات والمدارس`.
3. افتح مدرسة بها فصل وطلاب.
4. تحقق من ربط مشرف على مستوى المدرسة.
5. تحقق من ربط مشرف على مستوى الفصل.
6. تحقق من نقل طالب بين الفصول.
7. تحقق من ربط ولي أمر بطالب.
8. افتح بوابة المدرسة كمشرف وتأكد أن الطلاب/النتائج محصورة في نطاقه.
9. إذا كان عدد الطلاب أكثر من 80، تحقق هل القائمة تخفي بقية الطلاب بدون pagination.

## قرار الإغلاق
- كفحص برمجي: مغلقة برمجيًا.
- كفحص إنتاجي نهائي: معلق حتى النشر والتحقق من المتصفح المدمج.

## الدفعة التالية المقترحة
`BATCH 100G — School Relationship UI Pagination + E2E Browser Verification`

النطاق المقترح:
- إزالة حد `slice(0, 80)` بطريقة آمنة لا تغير التصميم.
- إضافة pagination/بحث واضح لقوائم الطلاب داخل المدرسة.
- تشغيل تحقق حي من كل وظائف علاقات المدرسة في المتصفح المدمج.
