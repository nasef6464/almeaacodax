# BATCH 100H - Group Create Scope Hardening + E2E Verification

التاريخ: 2026-05-21
الحالة: Fully closed

## السبب
دفعة BATCH 100F كشفت أن مسار إنشاء المجموعات `POST /api/content/groups` كان محمياً بالمصادقة والدور، لكنه كان يقبل payload كامل من الواجهة ويكتبه مباشرة في MongoDB، بما يشمل `ownerId` و`supervisorIds` و`studentIds` و`courseIds`. هذا يترك خطراً أن ينشئ مستخدم غير أدمن مجموعة أو فصلًا خارج نطاق مدرسته أو بحقوق علاقات غير موثقة من السيرفر.

## نطاق الدفعة
- إصلاح مسار إنشاء المجموعات فقط.
- عدم تغيير الواجهة أو التصميم.
- عدم تعديل علاقة المدارس القائمة أو مسارات report/import/relations.
- عدم تنفيذ عمليات إنتاجية تغيّر بيانات مدارس حقيقية من المتصفح.

## ما تم تنفيذه
- إضافة helper باسم `buildScopedGroupCreatePayload` داخل `server/src/routes/content.routes.ts`.
- منع غير الأدمن من إنشاء مجموعة من نوع `SCHOOL`.
- إلزام غير الأدمن بوجود `parentId` والتحقق منه من قاعدة البيانات.
- اشتقاق المدرسة الأصلية من السيرفر وليس من body.
- التحقق من صلاحية المستخدم على المدرسة عبر `hasSchoolIdManagementScope`.
- تجاهل حقول التصعيد من الواجهة لغير الأدمن: `ownerId`, `studentIds`, `courseIds`, `supervisorIds`.
- تعيين `ownerId` إلى المستخدم الحالي، و`supervisorIds` إلى المستخدم الحالي فقط، وبدء `studentIds/courseIds` فارغة.
- إضافة smoke contract جديد يثبت عدم العودة إلى `GroupModel.create(payload)` المباشر.

## الملفات المعدلة في هذه الدفعة
| الملف | نوع التغيير | السبب |
|---|---|---|
| `server/src/routes/content.routes.ts` | Backend security hardening | تأمين إنشاء المجموعات بنطاق المدرسة من السيرفر |
| `scripts/smoke-batch100h-group-create-scope-contract.mjs` | Smoke contract جديد | منع رجوع ثغرة إنشاء مجموعات خارج النطاق |
| `package.json` | npm script | إضافة `smoke:batch100h-group-create-scope` |
| `BATCH_100H_GROUP_CREATE_SCOPE_HARDENING_E2E_2026-05-21_AR.md` | تقرير دفعة | توثيق التنفيذ والفحوص |
| `PROJECT_STATUS.md` | تتبع المشروع | تحديث الحالة النشطة |
| `docs/SPARK_BATCH_LEDGER_AR.md` | Ledger | إضافة سجل الدفعة |
| `docs/SPARK_EXECUTION_ROADMAP_AR.md` | Roadmap | إضافة إغلاق الدفعة والخطوة التالية |
| `docs/NEXT_SESSION_HANDOVER_AR.md` | Handover | تحديث تسليم الحساب التالي |

## الملفات التي كانت معدلة مسبقًا ولم يتم لمسها ضمن هذه الدفعة
| الملف | السبب |
|---|---|
| `App.tsx` | تعديل سابق خارج نطاق الدفعة |
| `contexts/AuthContext.tsx` | تعديل سابق خارج نطاق الدفعة |
| `dashboards/admin/FinancialManager.tsx` | تعديل سابق خارج نطاق الدفعة |
| `dashboards/admin/SchoolPortalManager.tsx` | تعديل سابق خارج نطاق الدفعة |
| `dashboards/admin/UsersManager.tsx` | تعديل سابق خارج نطاق الدفعة |
| `pages/QuizPage.tsx` | تعديل سابق خارج نطاق الدفعة |
| `server/src/routes/notification.routes.ts` | تعديل سابق خارج نطاق الدفعة |
| `server/src/routes/taxonomy.routes.ts` | تعديل سابق خارج نطاق الدفعة |
| `server/src/services/notificationService.ts` | تعديل سابق خارج نطاق الدفعة |
| تقارير/سكريبتات untracked قديمة | موجودة قبل الدفعة ولم يتم إدراجها |

## الفحوص
| الأمر | النتيجة | ملاحظات |
|---|---|---|
| `npm run smoke:batch100h-group-create-scope` قبل الإصلاح | FAIL متوقع | أثبت وجود الخطر: `GroupModel.create(payload)` مباشر |
| `npm run smoke:batch100h-group-create-scope` بعد الإصلاح | PASS | 8/8 |
| `npm run smoke:batch100f-relationship-audit` | PASS | 10/10 وwarnings=0 |
| `npm run smoke:school-management` | PASS | 8/8 |
| `npm run smoke:admin-school-command` | PASS | 6 checks |
| `npm run smoke:school-portal-command` | PASS | 8 checks |
| `npm run smoke:supervisor-dashboard` | PASS | 3/3 |
| `npm run smoke:reports-role` | PASS | 11/11 |
| `npm run smoke:security-rbac-phase6` | PASS | 5 checks |
| `npm --prefix server run build` | PASS | TypeScript server build |
| `npm run typecheck` بالتوازي أولًا | TIMEOUT | لم يتم احتسابه نجاحًا |
| `npm run typecheck` منفردًا | PASS | `tsc --noEmit` |
| `npm run build` | PASS | Vite production build |
| `npm run smoke:health-readiness` | PASS | health/readiness contract |
| `npm run smoke:frontend:strict` قبل الرفع | PASS | production كان يخدم commit سابقًا قبل هذه الدفعة |
| `npm run smoke:frontend:strict` بعد النشر | PASS | Vercel يخدم commit `5338714` وasset `index-BPTquocB.js` |
| `GET /api/health` بعد النشر | PASS | Render جاهز `ready=true` وcommit `5338714f2cc7` |
| `npm run smoke:health-readiness` بعد النشر | PASS | Render/Vercel readiness aligned |
| `npm run smoke:batch100h-group-create-scope` بعد النشر | PASS | 8/8 |

## فحص الإنتاج
- GitHub push: PASS، commit `5338714`.
- Vercel: PASS، `npm run smoke:frontend:strict` أكد أن الإنتاج يخدم commit `5338714`.
- Render: PASS، `/api/health` أكد `ready=true` وcommit `5338714f2cc7`.
- smoke بعد النشر: PASS.

## التحقق الحي من المتصفح الداخلي
- PASS: تم فتح `https://almeaacodax.vercel.app/admin-dashboard?verify=100h-5338714` داخل المتصفح الداخلي.
- PASS: تم فتح تبويب `المجموعات والمدارس` من لوحة الإدارة.
- PASS: ظهرت بطاقات جاهزية المدارس وقائمة المدارس بدون أخطاء ظاهرة.
- لم يتم تنفيذ mutation من المتصفح على بيانات إنتاجية حقيقية لتجنب تعديل بيانات المدارس دون تأكيد مباشر.

## المخاطر المتبقية
- لم يتم تنفيذ mutation E2E حقيقي من UI على بيانات المدارس الإنتاجية حتى لا نغيّر بيانات حقيقية بدون تأكيد مالك مباشر.
- تدقيق كل أزرار إدارة المجموعات لا يزال يحتاج دفعات UI/QA لاحقة.
- مشاكل الدورات/مشغل الدورة/الصورة الرئيسية التي ذكرها المالك ما زالت ضمن خطة لاحقة وليست ضمن نطاق BATCH 100H.

## هل تم إغلاق خطر إنشاء المجموعات خارج النطاق؟
برمجيًا: نعم.
إنتاجيًا: نعم، بعد تحقق Vercel/Render والمتصفح الداخلي.

## الدفعة التالية المقترحة
BATCH 100I - Admin Dashboard Functional QA: Homepage Settings + Course Player + Group Buttons
