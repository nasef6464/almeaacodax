# ALMEAA — Codex Execution State

- Current phase: Assessment runner hardening, learning-space consolidation, content bootstrap closure, and schools RBAC audit
- Current batch: extracted supervisor scope policy after school/class isolation
- Current branch: `refactor/modular-platform-safe`
- Last completed code commit: `d2612146` (extract quiz supervisor scope policy); isolated assessment CI gate is `a6ad996c`
- Latest control-plane commits: `4f206b0f`, `31aeecbd`, `e0617d4e`
- Current gates: legacy builder inventory 3/3, exam question source 21/21, assessment question selection 5/5, assessment detail resolution 4/4, assessment settings consumption 5/5, mock exams 10/10, quiz integrity 4/4, quiz access 18/18, quiz answer exposure 5/5, learning scoped bootstrap 2/2, learning tabs 3/3, performance contract, server check, and architecture gate PASS. Repository audit is presently blocked before analysis because the incomplete root install cannot resolve `typescript`; frontend typecheck/build remain blocked by the same incomplete root install (`lucide-react`).
- Open blockers: Scale certification not proven; production secrets must be rotated outside the repository; self-service parent/student linking remains disabled until a verified-consent product decision is approved
- Deferred test execution: `docs/architecture/ASSESSMENT_TEST_ROADMAP_AR.md` records the user-supplied assessment acceptance matrix. Do not begin its HTTP/E2E expansion until the current structural batch is closed.
- Phase 5 decision: `docs/architecture/ASSESSMENT_DATA_EVOLUTION_DECISION_AR.md` records the current result/session boundary and the required additive migration protocol. No schema/backfill work is authorized until its product decisions are answered.
- Next exact action: obtain authorization to push or manually run the isolated backend CI gate, then inspect its runtime output. Afterwards, add bounded cross-school and cross-class HTTP rejection cases to the same isolated gate. Do not extract timer/session until an additive Session/Attempt design is approved. Do not delete a builder or change routes/schema/RBAC/scoring.
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

تم تثبيت Control Plane في `4f206b0f` ثم تحديثه في `e0617d4e`. أُنجز P0-00 في `81aaee59`، وP0-01 في `3150eb67`، وP0-02 في `0172947a`. أُنجز P0-03A في `f14a9576`، وP0-03B في `057dee2a` بإضافة scope تشغيلي لـcontent bootstrap تستخدمه شاشة إدارة المدارس لتجنب تحميل topics/lessons/library غير المطلوبة، وP0-03C في `8620b20b` باستخدام `.lean()` في قراءات العمليات الإدارية، وP0-03D في `082ab527` بإضافة `phase=compact` لمسار الطالب. أُنجز P0-04 في `71875c15`، ثم أُصلح عقد البيئة في `7f6e2e60` بحيث يستخدم benchmark arguments صريحة ولا يضيف مفاتيح بيئة جديدة؛ architecture gate عاد PASS. في Phase 2A نُقلت آثار تسليم الاختبار إلى application boundary في `5bf30491`، ثم نُقل تحقق سلامة أسئلة الاختبار في `2f8a3170`، ونُقل تطبيع placement في `b10b9081`، واكتمل عزل اختيار الأسئلة وحل مهاراتها في `3651e0ec`، واكتمل عزل workflow defaults وتطهير تحديثات النشر في `7dd90ec5`، واكتمل عزل سياسة قرار النشر في `ca632e5a`، واكتمل عزل إنشاء الأسئلة المضمنة مع إبقاء محول قاعدة البيانات داخل route في `8c0b81cc`، واكتمل عزل تركيب مستند إنشاء الاختبار في `3432aa59`، واكتمل عزل تركيب مستند تحديث الاختبار في `3014a2c4`، واكتمل عزل تركيب حالة الاختبار للتحقق في `a2db9f33`، واكتمل عزل تركيب مستند QuestionAttempt في `81d3df1e`، واكتملت أدوات سياق المحاولة في `756b6f87`، واكتمل حل وترتيب أسئلة الإرسال في `2A-13`. في `2A-14` فُصلت مراجعة الإجابات، ملخص الدرجة، تحليل المهارات، نتائج أقسام المحاكاة، لقطة الاختبار، ووثيقة نتيجة الإرسال خلف وحدات تطبيقية نقية؛ وبقيت صلاحية الإرسال، الاستعلامات، الحفظ، ومعالجة التعارض والـside effects في route. بقي scoring وschema وRBAC وURLs/API contracts دون تغيير، ولا تزال أرقام التوسع الإنتاجية غير مثبتة.
