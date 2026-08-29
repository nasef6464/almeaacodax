# ALMEAA — Codex Execution State

- Current phase: Phase 2A — Assessment Backend Boundaries
- Current batch: 2A-10 quiz validation-state boundary completed
- Current branch: `refactor/modular-platform-safe`
- Last completed/pushed commit: `a2db9f33` (code); control-plane checkpoint follows
- Latest control-plane commits: `4f206b0f`, `31aeecbd`, `e0617d4e`
- Current gates: typecheck PASS; server check/build PASS; frontend build PASS; repository audit PASS; architecture gate PASS; route/runtime/security/quiz/auth/API/student/report/school smoke PASS; assessment side-effects, notification realtime, weekly scheduler, parent bounded-read, operations bootstrap, operations read-memory, compact taxonomy, and read-baseline contracts PASS; unresolved runtime imports 0; runtime cycles 0
- Open blockers: Scale certification not proven; production secrets must be rotated outside the repository; no destructive DB/RBAC decision authorized
- Next exact action: map quiz session/attempt preparation into the next compatible application boundary without changing submission, scoring, or persistence semantics
- Plan handoff: read `docs/architecture/FINAL_MASTER_PLAN_V3_AR.md` before any new work
- Files in next scope: `server/src/routes/quiz.routes.ts` create/update publish slices, `server/src/modules/quizzes/http/quizDefinitionSchema.ts`, and focused definition contracts
- Explicitly out of scope: database schema migration, RBAC changes, scoring/payment changes, route/API URL changes, broad frontend move, deleting legacy files
- Delivery rule: after each green Batch, update this file, create a focused commit, push, and refresh the latest ZIP without including secrets, `.env`, `.git`, dependencies, or build artifacts.

## بروتوكول بداية أي جلسة أو حساب جديد

اقرأ بهذا الترتيب فقط:

1. `AGENTS.md`
2. هذا الملف
3. `docs/architecture/PROJECT_MAP.md`
4. القسم المرتبط من `MODULE_CATALOG.md` و`CHANGE_MAP.md`
5. `git status --short --branch` و`git log -8 --oneline`
6. ملفات الـBatch الحالي فقط

لا تعتمد على ZIP أو رسالة محادثة قديمة كمصدر للكود. إذا اختلفت وثيقة عن HEAD، حدّث الحالة بعد التحقق ولا تعكس كودًا سليمًا.

## قالب تحديث إلزامي بعد كل Batch

`Batch / Scope / Changed files / Preserved contracts / Tests / Gates / Commit / Push / Risks / Next exact action`

## نقطة التسليم الحالية

تم تثبيت Control Plane في `4f206b0f` ثم تحديثه في `e0617d4e`. أُنجز P0-00 في `81aaee59`، وP0-01 في `3150eb67`، وP0-02 في `0172947a`. أُنجز P0-03A في `f14a9576`، وP0-03B في `057dee2a` بإضافة scope تشغيلي لـcontent bootstrap تستخدمه شاشة إدارة المدارس لتجنب تحميل topics/lessons/library غير المطلوبة، وP0-03C في `8620b20b` باستخدام `.lean()` في قراءات العمليات الإدارية، وP0-03D في `082ab527` بإضافة `phase=compact` لمسار الطالب. أُنجز P0-04 في `71875c15`، ثم أُصلح عقد البيئة في `7f6e2e60` بحيث يستخدم benchmark arguments صريحة ولا يضيف مفاتيح بيئة جديدة؛ architecture gate عاد PASS. في Phase 2A نُقلت آثار تسليم الاختبار إلى application boundary في `5bf30491`، ثم نُقل تحقق سلامة أسئلة الاختبار في `2f8a3170`، ونُقل تطبيع placement في `b10b9081`، واكتمل عزل اختيار الأسئلة وحل مهاراتها في `3651e0ec`، واكتمل عزل workflow defaults وتطهير تحديثات النشر في `7dd90ec5`، واكتمل عزل سياسة قرار النشر في `ca632e5a`، واكتمل عزل إنشاء الأسئلة المضمنة مع إبقاء محول قاعدة البيانات داخل route في `8c0b81cc`، واكتمل عزل تركيب مستند إنشاء الاختبار في `3432aa59`، واكتمل عزل تركيب مستند تحديث الاختبار في `3014a2c4`، واكتمل عزل تركيب حالة الاختبار للتحقق في دفعة `2A-10` الحالية. بقي scoring وschema وRBAC وURLs/API contracts دون تغيير، ولا تزال أرقام التوسع الإنتاجية غير مثبتة.
