# ALMEAA — Codex Execution State

- Current phase: Phase 0 — Control Plane & Fresh Baseline
- Current batch: P0-03B operations bootstrap bounded reads completed
- Current branch: `refactor/modular-platform-safe`
- Last completed/pushed commit: `057dee2a` (code); control-plane checkpoint follows
- Latest control-plane commits: `4f206b0f`, `31aeecbd`, `e0617d4e`
- Current gates: typecheck PASS; server check/build PASS; frontend build PASS; repository audit PASS; architecture gate PASS; route/runtime/security/quiz/student/report/school smoke PASS; notification realtime, weekly scheduler, parent bounded-read, and operations bootstrap contracts PASS; unresolved runtime imports 0; runtime cycles 0
- Open blockers: Scale certification not proven; production secrets must be rotated outside the repository; no destructive DB/RBAC decision authorized
- Next exact action: inspect taxonomy bootstrap and operations status payloads, then select one contract-preserving bounded-read batch for P0-03C
- Plan handoff: read `docs/architecture/FINAL_MASTER_PLAN_V3_AR.md` before any new work
- Files in next scope: `server/src/routes/taxonomy.routes.ts`, `server/src/routes/operations.routes.ts`, their frontend callers, and focused payload-boundary smoke contracts
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

تم تثبيت Control Plane في `4f206b0f` ثم تحديثه في `e0617d4e`. أُنجز P0-00 في `81aaee59`، وP0-01 في `3150eb67`، وP0-02 في `0172947a`. أُنجز P0-03A في `f14a9576`، ثم P0-03B في `057dee2a` بإضافة scope تشغيلي لـcontent bootstrap تستخدمه شاشة إدارة المدارس لتجنب تحميل topics/lessons/library غير المطلوبة. لا تزال taxonomy bootstrap وoperations status مفتوحة، ولم تتغير Database أو RBAC أو scoring أو payments أو URLs/API contracts.
