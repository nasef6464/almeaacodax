# ALMEAA — Course certificate progress source handoff

- Date: 2026-09-06
- Branch: `codex/course-system-next-gap-7`
- PR: `#50`
- Latest synchronized base main: `9c8294cb382e49dc4317ca975fcc6acde07ed8f9`
- Exact runtime/test verification head: `16eece756df60ba5753e6533dd24e4d2069901c0`
- Status: `VERIFIED — product/runtime, CI and exact-head deployability evidence green`

## الفجوة المثبتة

مسار إصدار الشهادة في الخادم يحسب نسبة الإكمال من `User.completedLessons` داخل دروس الدورة نفسها، ويرفض الإصدار إذا كانت النسبة أقل من 100%. في المقابل كانت `pages/CourseView.tsx` تعرض زر إصدار الشهادة اعتمادًا على `course.progress`، وهي قيمة موجودة على تعريف/كتالوج الدورة وليست مصدر تقدم المستخدم المؤكد. النتيجة التجارية المحتملة: طالب أكمل كل دروس الدورة قد لا يرى زر الشهادة، أو قد يظهر الزر مبكرًا بينما يرفضه الخادم.

## أصغر إصلاح متماسك

- `CourseView` يقرأ `completedLessons` المؤكدة من store.
- يجمع lesson IDs الخاصة بالدورة الحالية فقط ويحسب `courseCompletionProgress` منها.
- زر إصدار الشهادة يظهر فقط عندما تكون الدورة certificate-enabled ونسبة تقدم هذا المستخدم 100%.
- server certificate authorization/completion checks بقيت هي المصدر النهائي ولم تتغير.
- `scripts/smoke-certificate-integrity-contract.mjs` يحرس تطابق مصدر التقدم بين الواجهة والخادم ويمنع الرجوع إلى `course.progress` للـCTA.
- تم دمج أحدث `main` داخل فرع PR قبل الإغلاق، لذلك الـPR أصبح `behind_by=0` والفرق مقابل `main` بقي محصورًا في هذه الدفعة.

## التحقق على exact runtime/test head

على `16eece756df60ba5753e6533dd24e4d2069901c0`:

- Platform V3 Phase + Handover Gate `34039335715` — `SUCCESS`.
- Platform V3 Recovery Gate `34039335725` — `SUCCESS`.
- Course Free Enrollment UI Gate `34039335723` — `SUCCESS`.
- Refactor V2 Production Readiness Gate `34039335728` — `SUCCESS`.
- Refactor V2 Safety Gate `34039335700` — `SUCCESS`؛ typechecks/builds/architecture/module/security/contracts كلها اجتازت البوابة.
- Platform V3 Public UI Gate `34039335716` — `SUCCESS`.
- Backend Integration / Deep Pre-Merge / Live Role / Assessment / role preview — `SKIPPED` وفق شروط path/role الحالية لأن هذه الدفعة لا تغيّر backend runtime أو RBAC أو Assessment ownership.
- Vercel exact-head status — `SUCCESS` على `16eece756df60ba5753e6533dd24e4d2069901c0`.

## قرار الدمج

معيار الإغلاق تحقق: الفجوة محددة ومغلقة، الـdiff مركز، البوابات المطلوبة خضراء على exact runtime/test head، وVercel exact-head ناجح. PR `#50` يمكن جعله Ready ودمجه بدمج عادي يحفظ تاريخ التسليم.

## الحدود المحفوظة

لا تغيير في route/API URL أو method، backend RBAC، scoring، payment semantics/provider، persisted schema، data ownership/query responsibility، production data migration/cutover، global tenantId، SaaS multi-tenancy، microservices، buyer-specific fork، أو UI redesign.

`MODULE_CATALOG.md` و`CHANGE_MAP.md` و`DATA_ACCESS_MAP.md` لا تحتاج تحديثًا لأن ملكية module والبيانات ومكان مسؤولية القراءة/الكتابة لم تتغير.

## Completion report

GOAL: Course certificate CTA aligned with confirmed learner completion.
STATUS: CLOSED / VERIFIED.
DELIVERED: learner-specific course completion drives certificate CTA; server certificate enforcement remains authoritative.
VERIFIED: focused certificate contract, frontend/API/build/architecture/security gates, public UI, recovery/readiness, and exact-head Vercel deployability.
DEFERRED: analytics, certificate redesign, and unrelated Course System improvements.
KNOWN RISKS: no production-data migration/cutover was authorized or required.
TESTS / CI: `34039335715`, `34039335725`, `34039335723`, `34039335728`, `34039335700`, `34039335716` — SUCCESS.
COMMITS: exact runtime/test verification head `16eece756df60ba5753e6533dd24e4d2069901c0`; final documentation commit is docs-only.
NEXT GOAL: after merge and production health verification, start one fresh bounded Course System/release-readiness gap from the new `main`; do not reopen verified Gates 1–6 without proof.
