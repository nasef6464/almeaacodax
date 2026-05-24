# BATCH 136 - Admin Users/Schools/Parent/Payment Deep Audit (2026-05-24)

## Scope
- Deep runtime/code audit for:
  - Admin Users management
  - Schools management
  - Parent-student linkage
  - Payment gateways/requests
- Keep current design unchanged.
- Apply only safe, backward-compatible fixes.

## Owner-Reported Issues Covered
1. No user delete path in users table.
2. Three-dots action button non-functional.
3. Parent-student linkage appears incomplete in runtime.
4. Schools management contains partially wired actions (including supervisor coverage gaps).
5. Payment portals require deep readiness check.

## What Was Read First
- `PROJECT_STATUS.md`
- `docs/NEXT_SESSION_HANDOVER_AR.md`
- `CODEX_HANDOFF.md`
- `docs/SPARK_BATCH_LEDGER_AR.md`

## Code Areas Inspected
- `dashboards/admin/UsersManager.tsx`
- `dashboards/admin/SchoolsManager.tsx`
- `dashboards/admin/SchoolPortalManager.tsx`
- `dashboards/admin/FinancialManager.tsx`
- `server/src/routes/parent.routes.ts`
- `server/src/routes/payment.routes.ts`
- `store/useStore.ts`

## Implemented Fixes (This Batch So Far)
1. **UsersManager: activate three-dots actions**
   - File: `dashboards/admin/UsersManager.tsx`
   - Added functional actions menu per row:
     - Edit user
     - Activate/Deactivate user
   - Added safe outside-click close overlay.
   - No route/data-shape/schema changes.
   - No design refactor.

2. **SchoolsManager: activate school card three-dots actions**
   - File: `dashboards/admin/SchoolsManager.tsx`
   - Added functional actions menu per school card:
     - فتح الإدارة
     - ربط المشرفين
   - Added safe outside-click close overlay.
   - No design refactor and no schema/API shape change.

3. **Admin users deletion path (safe)**
   - Backend: added `DELETE /auth/admin/users/:id` in `server/src/routes/auth.routes.ts`.
   - Frontend API: added `deleteAdminUser(...)` in `services/api.ts`.
   - Users UI: added "Delete user" action inside users three-dots menu in `dashboards/admin/UsersManager.tsx`.
   - Safety guards:
     - prevent deleting current logged-in admin account.
     - prevent deleting the last remaining admin account.
     - cleanup references from `linkedStudentIds` and group `studentIds/supervisorIds` before deletion.

4. **Admin school command center linkage compatibility**
   - File: `dashboards/admin/AdminDashboard.tsx`
   - Aligned school command-center action buttons to shared tab-switch function (`setActiveTab`) for:
     - `groups`
     - `quizzes`
     - `announcement-ads`
   - Result: `smoke:admin-school-command` now passes.

## Verified Commands
- `npm run typecheck` -> PASS
- `npm run smoke:batch100q-operational-admin-runtime` -> PASS
- `npm --prefix server run build` -> PASS
- `npm run smoke:school-management` -> PASS
- `npm run smoke:admin-school-command` -> PASS (after linkage fix)
- `npm run smoke:payment-providers` -> PASS
- `npm run smoke:payment-package` -> PASS

## Findings (Deep Audit - Current Snapshot)
- Users table had a real UX/runtime gap: action menu button existed but had no behavior.
- Schools list cards had a similar UX/runtime gap: three-dots existed without actionable flow.
- Parent linkage flow exists in code (`linkedStudentIds` in users + `parent.routes.ts`) but needs browser-authenticated runtime verification with admin + parent test accounts.
- Schools and portal managers are feature-heavy and need a focused execution pass to classify each action into:
  - working
  - partial
  - non-functional
- Payment routes are extensive and include provider/webhook safety logic; functional runtime matrix still pending against real configured env keys.
- User deletion path is now implemented with safe guards and relation cleanup.

## Blockers / Pending for Final Closure
1. Authenticated production browser verification for admin users/schools/payment screens (requires valid admin credentials).
2. End-to-end parent account verification for linked children data.
3. Full operational API smoke (`npm run smoke:operational`) requires owner-provided admin credentials via env:
   - `SMOKE_ADMIN_EMAIL` + `SMOKE_ADMIN_PASSWORD`
   - or `GOLIVE_ADMIN_EMAIL` + `GOLIVE_ADMIN_PASSWORD`

## Next Exact Tasks
1. Complete deep runtime verification in browser for:
   - add/edit/filter user
   - parent linkage edit/save/reload
   - schools actions including supervisor-related flows
   - payment requests approve/reject and gateway readiness panels
2. Produce actionable FAIL/PARTIAL matrix with file-level references.
3. Add safe follow-up fixes only for confirmed broken flows.
4. Update ledger + handoff + status with final closure evidence.

## Safety Notes
- No `git add .`
- Keep existing dirty historical files untouched.
- No breaking API/model/env changes.
