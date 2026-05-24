# BATCH 136 - Admin Panel Deep Runtime Plan (Users/Schools/Payments)

Date: 2026-05-24  
Status: Planned (execution in next sub-cycle)  
Scope: Plan only (no immediate fixes in this step)

## Goal
Execute a deep runtime audit from Admin Panel with focus on:
- user relationships,
- schools management linkage,
- payment portals and operational correctness,
- uncovering non-working controls and broken actions.

## Priority Areas

1. Users Management (Deep)
- verify 3-dots menu actions are fully wired per role.
- verify delete user flow for all allowed cases and block-protection cases.
- verify parent-student linking source list, selection persistence, save, reload integrity.
- verify school/class linkage chips and filter consistency.
- verify bulk/row actions do not silently fail.

2. Relationship Integrity
- parent -> children mapping save/reopen/reload consistency.
- student -> school/class consistency after reassignment.
- supervisor/teacher visibility boundaries.
- cross-entity references after user deactivate/delete.

3. Schools Management (Deep)
- verify create/edit school flows.
- verify add/remove supervisors in school context.
- verify school command center actions and tab routing.
- verify schools-filtered users visibility and counters.
- verify no dead buttons in school cards/actions.

4. Payment Portals and Package Access
- package purchase intent type remains `purchaseType: package`.
- portal/provider selection fallback behavior.
- payment tampering guard behavior remains active.
- post-payment unlock mapping (user-package access) integrity.
- admin payment/audit visibility and error states.

5. Admin UX Runtime Controls
- verify icon-only controls (3-dots/edit/status toggles) produce actionable state changes.
- verify no disabled-looking control without handler.
- verify confirmation/rollback behavior on destructive actions.

## Execution Matrix (Next Run)

1. Authenticated Browser Runtime (admin)
- Users page: add/edit/link/delete/deactivate/reactivate.
- Schools page: create/edit/link supervisors/open command actions.
- Payments page/flows: provider switch + package purchase intent consistency.

2. Source Contracts + Smokes
- run:
  - `npm run smoke:batch136-admin-users-schools-parent-payment`
  - `npm run smoke:batch100f-relationship-audit`
  - `npm run smoke:school-management`
  - `npm run smoke:admin-school-command`
  - `npm run smoke:payment-package`
  - `npm run smoke:payment-tampering`
  - `npm run smoke:health-readiness`
- if authenticated env available, run:
  - `npm run smoke:operational`

3. Evidence
- capture PASS/FAIL per scenario.
- log exact blockers with file-level suspects.
- promote only safe non-breaking fixes.

## Output Requirements
- update:
  - `BATCH_136_ADMIN_USERS_SCHOOLS_PARENT_PAYMENT_DEEP_AUDIT_2026-05-24_AR.md`
  - `PROJECT_STATUS.md`
  - `docs/SPARK_BATCH_LEDGER_AR.md`
  - `docs/NEXT_SESSION_HANDOVER_AR.md`
  - `CODEX_HANDOFF.md`
- include:
  - working items,
  - broken items,
  - fixed items,
  - deferred risky items,
  - exact owner blockers (if credentials/secrets needed).

## Owner-Reported Targets (must be checked explicitly)
- missing/weak user delete operation behavior.
- non-functional three-dots actions in admin lists.
- missing or incomplete parent-student linking behavior.
- schools panel features existing but non-working.
- ability to add/manage school supervisors.
- payment portal readiness and runtime behavior.

## Expanded Admin Deep Checklist (requested by owner)

### A) Users Relationships
- user row actions menu opens/closes for every row and executes:
  - edit,
  - activate/deactivate,
  - delete (with protections).
- parent linking:
  - children dropdown loads options,
  - selected children persist after save + refresh,
  - linked children appear in parent analytics scope.
- school/class assignment:
  - student school change reflects in school manager views,
  - class assignment reflects in class-based counters and reports.
- supervisor linkage:
  - assigning school/class groups updates supervisor visibility scope.

### B) Schools Management
- school card actions menu opens/closes and routes to:
  - management overview,
  - supervisor relations.
- supervisors section:
  - add/remove supervisor from school,
  - persistence after reload.
- relations tab:
  - student-parent relationship edits are persisted,
  - no silent failure on save/import actions.
- packages/codes tab:
  - package visibility and code generation/update reflect immediately.

### C) Payments Portals
- payment settings:
  - provider/mode/country presets save and reload correctly.
- payment requests:
  - approve/reject flow updates status and audit trail.
- package purchases:
  - item type remains package for package flows,
  - unlock grant applies to correct user/package.
- anti-tampering:
  - server-calculated totals and approval guards remain enforced.

### D) Critical Runtime Outcomes
- no dead icon buttons in admin tables/cards.
- no relation edit that appears saved but is lost after refresh.
- no payment approval that unlocks wrong scope.

## Static Findings To Verify First In Runtime

1. **Parent linking source split (high priority)**
- In users manager, parent editing path uses broad linkable source, but new-user parent linking may still read from `students` list source.
- Runtime check required:
  - create new parent,
  - confirm full student list availability (not only current paginated users subset),
  - save/reload integrity.

2. **Schools card action surface coverage (medium priority)**
- Card three-dots is now wired, but runtime matrix must confirm every expected school action is reachable from either card menu or school detail.

3. **Payment approval + unlock mapping (high priority)**
- Contract smokes pass, but runtime check must ensure approved request maps to the correct package/user scope from admin UI actions.

4. **Supervisor management discoverability (medium priority)**
- Verify admin can complete supervisor assignment flow without hidden prerequisite tab/state confusion.

## Non-Goals in This Plan Step
- no redesign.
- no broad refactor.
- no route/model breaking changes.
- no schema-breaking migration.
