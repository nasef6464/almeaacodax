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

5. **Parent-student linking candidate source hardening**
   - File: `dashboards/admin/UsersManager.tsx`
   - Root cause addressed: parent linking options were tied to currently loaded users page, so children list could appear empty in runtime even when students exist.
   - Fix: load full student candidates (paginated API sweep) for linking workflow and use that source in parent candidate dropdown and linked-students export names.
   - Result: parent linkage list is no longer limited to current users table page.

6. **Parent linking consistency in new-user flow**
   - File: `dashboards/admin/UsersManager.tsx`
   - Confirmed issue: new parent creation used `students` list source (can be limited by current paginated users payload).
   - Fix:
     - switched create-parent linked-children options to `linkableStudents` (full linking source),
     - switched parent school-change linked-student filter to `linkableStudents` for consistency.
   - Result: parent-child linking is consistent across edit and create flows.

## Verified Commands
- `npm run typecheck` -> PASS
- `npm run smoke:batch100q-operational-admin-runtime` -> PASS
- `npm --prefix server run build` -> PASS
- `npm run smoke:school-management` -> PASS
- `npm run smoke:admin-school-command` -> PASS (after linkage fix)
- `npm run smoke:payment-providers` -> PASS
- `npm run smoke:payment-package` -> PASS
- `npm run smoke:school-management` -> PASS (re-run after parent-link candidate fix)
- `npm run smoke:batch100f-relationship-audit` -> PASS (10/10)
- `npm run smoke:rbac-school-scope` -> PASS (4/4)
- `npm run smoke:batch136-admin-users-schools-parent-payment` -> PASS
- `npm run typecheck` -> PASS (post latest parent-link consistency fix)
- `npm run smoke:batch136-admin-users-schools-parent-payment` -> PASS (post latest fix)
- `npm run smoke:batch100f-relationship-audit` -> PASS (post latest fix)

## Verification Cycle (latest)
- Date: 2026-05-24
- Re-run pass set:
  - `npm run smoke:batch136-admin-users-schools-parent-payment` -> PASS
  - `npm run smoke:batch100q-operational-admin-runtime` -> PASS
  - `npm run smoke:payment-providers` -> PASS
  - `npm run smoke:payment-package` -> PASS

## Verification Cycle (extended)
- Date: 2026-05-24
- Extended pass set:
  - `npm run smoke:batch100f-relationship-audit` -> PASS (10/10)
  - `npm run smoke:school-portal-command` -> PASS (8 checks)
  - `npm run smoke:rbac-school-scope` -> PASS (4/4)
  - `npm run smoke:payment-tampering` -> PASS (9/9)
  - `npm run smoke:package-path-navigation` -> PASS (7/7)
  - `npm run smoke:real-usage-readiness` -> PASS (6/6)
  - `npm run smoke:health-readiness` -> PASS
  - `npm run smoke:frontend:strict` -> PASS (production serving commit `eb3e5c3`)

## Verification Cycle (admin surfaces)
- Date: 2026-05-24
- Admin-surface pass set:
  - `npm run smoke:admin-tabs` -> PASS (2/2)
  - `npm run smoke:school-portal-command` -> PASS (8 checks)
  - `npm run smoke:real-usage-readiness` -> PASS (6/6)

## Verification Cycle (deploy alignment)
- Date: 2026-05-24
- Deploy alignment pass set:
  - `npm run smoke:health-readiness` -> PASS
  - `npm run smoke:frontend:strict` -> PASS (production serving commit `a23a6a6`)

## Verification Cycle (deploy alignment - latest)
- Date: 2026-05-24
- Latest deploy alignment pass set:
  - `npm run smoke:health-readiness` -> PASS
  - `npm run smoke:frontend:strict` -> PASS (production serving commit `82ab0de`)

## Operational Smoke Guardrail Improvement
- File: `scripts/smoke-operational-auto.mjs`
- Improvement: added explicit pre-check for admin auth context before launching operational API smoke.
- Behavior now:
  - if no `SMOKE_ADMIN_TOKEN` and no admin credentials envs are present, the script exits early with actionable instructions.
  - avoids opaque downstream login/async assertion failures on empty env.
- Verified:
  - `npm run smoke:operational` now fails fast with clear remediation message.
  - Runbook added: `docs/OPERATIONAL_SMOKE_RUNBOOK_AR.md`.

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
- Relationship integrity is currently PASS on source-contract coverage across:
  - school/class/group relationships,
  - parent-student linking flows,
  - supervisor scope guardrails,
  - school report/import/relations RBAC scope.

### Additional static-risk notes (latest pass)
- Potential source mismatch to verify: parent linking in *new user creation* path may rely on `students` source while edit flow uses broader linkable source; must be runtime-verified for full-list behavior.
- Schools actions are wired at card level, but full “add supervisors” discoverability/coverage must be validated in runtime matrix.
- Payment/package contracts are passing; still requires authenticated UI matrix to confirm admin approval unlocks expected package/user scope end-to-end.

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

## Plan Extension From Latest Owner Request (2026-05-24)
- Added canonical deep execution plan:
  - `BATCH_136_ADMIN_PANEL_DEEP_RUNTIME_PLAN_2026-05-24_AR.md`
- Scope extension explicitly includes:
  - deep user relationships runtime matrix,
  - deep schools/supervisors runtime matrix,
  - payment portals runtime matrix,
  - identification of any remaining non-functional admin controls before fix phase.
- This extension is planning-first and does not force immediate risky edits.
