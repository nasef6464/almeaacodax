# ALMEAA — Codex Execution State

- Current phase: Phase 0 — Control Plane & Fresh Baseline
- Current batch: Planning baseline completed; next is P0-01 inspection
- Current branch: `main`
- Last completed/pushed commit: `91b4e3ba`
- Current gates: Fresh repository audit PASS; architecture gate PASS; unresolved runtime imports 0; runtime cycles 0
- Open blockers: Scale certification not proven; production secrets must be rotated outside the repository; no destructive DB/RBAC decision authorized
- Next exact action: inspect notification SSE client contract, delivery indexes, Redis configuration, queue lifecycle, and focused smoke coverage before implementing P0-01
- Files in next scope: `server/src/modules/notifications/http/openNotificationSseStream.ts`, notification routes/service/queue, notification model/indexes, frontend notification consumers, relevant smoke contracts
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

تم تثبيت Control Plane في commit `4f206b0f`. لا يوجد تغيير كود وظيفي في هذه النقطة. الدفعة التالية تبدأ بفحص تعاقد الإشعارات قبل أي تعديل، وتبقى Database وRBAC وscoring وpayments خارج النطاق.
