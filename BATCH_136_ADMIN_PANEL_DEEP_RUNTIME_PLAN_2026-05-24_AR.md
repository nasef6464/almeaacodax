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

6. Student End-to-End Journey (Mandatory)
- verify student journey from paid item selection to payment request submission.
- verify payment request appears in admin financial manager queue.
- verify admin approve/reject updates request lifecycle correctly.
- verify access unlock reaches the correct learner scope after approval.

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

## New Owner-Reported Runtime Issues (added 2026-05-24)

1. Course player tabs issue:
- `المصادر` and `المناقشات` inside the learning player are not functioning as expected in runtime.

2. Course player quick actions issue:
- `المفضلة` and `المشاركة` actions are not functioning as expected.

3. Payment proof UX gap:
- student needs an easier proof-of-payment flow:
  - attach receipt image,
  - or provide receipt link,
  - with clear review-ready payload for admin approval.

4. Payment admin action blocker:
- `زر الاعتماد` في جدول طلبات الدفع لا يعمل في runtime (owner-reported with screenshot evidence).
- Treat as P0 blocker for batch closure.

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
  - approve button click must execute review API path and mutate status.
- package purchases:
  - item type remains package for package flows,
  - unlock grant applies to correct user/package.
- anti-tampering:
  - server-calculated totals and approval guards remain enforced.
- receipt proof capture:
  - verify student can submit receipt link cleanly,
  - verify ability to attach receipt image/file (if supported),
  - if image upload is missing, classify as gap and implement safe minimal upload path plan.
- lifecycle closure:
  - verify `pending -> approved/rejected` transitions,
  - verify approved request produces learner-visible unlock.

### D) Critical Runtime Outcomes
- no dead icon buttons in admin tables/cards.
- no relation edit that appears saved but is lost after refresh.
- no payment approval that unlocks wrong scope.
- no dead `اعتماد` action in admin payment requests table.
- learning player tabs/actions (`sources/discussions/favorite/share`) must be actionable and non-dead.

### E) Learning Player Runtime (new mandatory track)
- verify `الوصف` / `المصادر` / `المناقشات` tabs behavior in real runtime.
- verify favorite toggle persists and reflects current state.
- verify share action has a working output path (copy/share intent) without silent fail.
- verify these actions across:
  - direct course route `/course/:id`,
  - category route launch with lesson query params.

### F) Payment Approval Button (P0)
- runtime inspect admin payment table approve button path:
  - disabled-state conditions,
  - click handler execution,
  - payload validity (approval evidence),
  - API response handling and UI refresh.
- expected behavior:
  - pending request + valid evidence => approved status update + access grant feedback.
- if failing:
  - capture exact fail mode:
    - button disabled unexpectedly,
    - handler not firing,
    - API request failing,
    - response handling bug.

### G) Users Management and Relationships (Deep Mandatory)
- verify users CRUD runtime integrity for supported roles:
  - create/edit/delete/activate/deactivate.
- verify relationship wiring:
  - parent-child links,
  - supervisor school/class assignment,
  - student school/class assignment.
- verify persistence after save/reload for relationship updates.
- verify relationship changes affect downstream scopes correctly.

### H) Student Journey Checklist (purchase -> admin approval -> access)
1. student opens paid item and submits payment request.
2. student submits proof (receipt link and/or image if supported).
3. request appears to admin with correct metadata.
4. admin approves request from payment table.
5. request status and audit trail update correctly.
6. learner account gets correct access unlock.
7. learner reopens content and confirms unlocked state.

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
