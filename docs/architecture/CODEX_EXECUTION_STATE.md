# ALMEAA — Codex Execution State

- Current phase: Phase 0 — Control Plane & Fresh Baseline
- Current batch: P0-01 notification realtime fan-out completed
- Current branch: `refactor/modular-platform-safe`
- Last completed/pushed commit: `3150eb67` (code); control-plane checkpoint follows
- Latest control-plane commits: `4f206b0f`, `31aeecbd`, `e0617d4e`
- Current gates: typecheck PASS; server check/build PASS; frontend build PASS; architecture gate PASS; route/runtime smoke PASS; notification realtime contract PASS; unresolved runtime imports 0; runtime cycles 0
- Open blockers: Scale certification not proven; production secrets must be rotated outside the repository; no destructive DB/RBAC decision authorized
- Next exact action: inspect weekly parent report scheduling, existing queue/Redis lifecycle, lock/idempotency contracts, and focused smoke coverage before implementing P0-02
- Plan handoff: read `docs/architecture/FINAL_MASTER_PLAN_V3_AR.md` before any new work
- Files in next scope: `server/src/modules/reports/application/startWeeklyParentReportSchedule.ts`, existing report/notification queue and Redis lifecycle, scheduler tests and relevant smoke contracts
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

تم تثبيت Control Plane في `4f206b0f` ثم تحديثه في `e0617d4e`. أُنجز P0-00 ورُفع في `81aaee59` بإزالة Workbox API cache العام مع الحفاظ على cache التطبيق العام الصريح. ثم أُنجز P0-01 في `3150eb67` باستبدال polling الخاص بـSSE بجسر Redis/local fan-out مع إبقاء endpoint وأسماء الأحداث والعقود الحالية. لم تتغير Database أو RBAC أو scoring أو payments أو URLs/API contracts.
