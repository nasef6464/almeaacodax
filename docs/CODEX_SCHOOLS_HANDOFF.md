# Codex Schools Handoff

## Current Goal

Close the schools item completely.

## Base Commit

- `7fad0757` Confirm school roster removal actions.

## Last Completed

Secured removal actions inside schools management:

- Remove school supervisor.
- Remove class supervisor.
- Remove student from class.
- Each action now requires a clear confirmation before removal.

## Cleanup Completed

- Reduced untracked files from 840 to 2.
- Updated `.gitignore` with local audit and verification artifact rules.

## Remaining To Close Schools

1. Test school supervisor and class supervisor permissions from the supervisor dashboard.
2. Verify student reports and skill reports for supervisors by school and class.
3. Visually test adding and editing classes and students after real data exists.
4. Cover the case where a student is visible inside a class.
5. Review that there is no duplication between school operations and the school follow-up portal.

## Skills Available Locally

- `almeaa-schools-full-closure`
- `almeaa-schools-button-api-db-audit`
- `almeaa-schools-rbac-real-users`
- `almeaa-schools-simple-ux`
- `almeaa-schools-smoke-gate`

If continuing from a new account and local skills are missing, continue using this handoff file and the goal instructions; do not restart from scratch.

## Checkpoint Progress

### Checkpoint 0 - Baseline Gates

- Branch verified: `codex/schools-full-closure`.
- Last 5 commits reviewed:
  - `e2e08890` docs: record local schools skills for handoff
  - `d09312b4` chore: prepare schools handoff and cleanup ignore rules
  - `7fad0757` Confirm school roster removal actions
  - `640bcfab` Route class supervisor creation to relations
  - `6c0d98d0` Simplify school supervisor entry flow
- `git status`: clean before documentation update.
- `npm run typecheck`: BLOCKED. `tsc --noEmit` did not finish after two attempts, including a 5 minute timeout. Stale `npm run typecheck` / `tsc --noEmit` processes from those attempts were stopped.
- `npm run build`: PASS.
- `npm run server:check`: PASS.

### Checkpoint 1 - School Closure Matrix

| Page | Button or operation | API | Database | RBAC | Test | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Admin School Dashboard | Create school | `createGroup -> /content/groups` | `GroupModel.create` | Backend group scope path exists, needs action-level proof | `smoke:school-management` contract references create/group flow | FIX: current store path is optimistic and does not await API success in the visible action flow. |
| Admin School Dashboard | Edit school | `updateGroup -> /content/groups/:id` | `GroupModel.findOneAndUpdate` | Backend document scope required | Contract/static coverage only | FIX: current store path calls API with `.catch(console.error)` and needs explicit loading/error/success around the button. |
| Admin School Dashboard | Delete/disable school | `deleteGroup -> /content/groups/:id` | Deletes school, classes, school packages, access codes, and removes group references | Backend document scope required | `smoke:school-management` checks delete wiring | FIX: confirmation exists, but visible action still uses optimistic store path; needs awaited success/error proof. |
| Admin School Dashboard | Add class | `createGroup -> /content/groups` | `GroupModel.create` with parent school | Parent school/class relationship exists | `smoke:school-management` | FIX: needs awaited API flow and visible loading/error/success proof. |
| Admin School Dashboard | Edit class | `updateGroup -> /content/groups/:id` | `GroupModel.findOneAndUpdate` | Backend document scope required | Contract/static coverage only | FIX: needs awaited API flow proof. |
| Admin School Dashboard | Delete class | `deleteGroup -> /content/groups/:id` | Deletes class and removes student/supervisor group links | Backend document scope required | Contract/static coverage only | FIX: destructive action exists but needs awaited success/error proof. |
| Admin School Dashboard | Import/add student | `importSchoolStudents -> /content/schools/:id/import-students` | `UserModel`, `GroupModel`, school/class totals | `assertSchoolManagementScope` | `smoke:school-from-scratch-live`, `smoke:batch100g-school-student-pagination` | PASS-PARTIAL: awaited API and backend DB route exist; live smoke still required for current checkpoint. |
| Admin School Dashboard | Move/assign/remove student from class or school | Store group assignment APIs through `updateGroup` | `GroupModel.studentIds`, `User.groupIds` | Backend document scope required | `smoke:school-management` checks roster action presence | FIX: removal confirmations were added, but assignment/removal paths still need awaited API flow proof. |
| Admin School Dashboard | Link parent | `applySchoolRelations -> /content/schools/:id/relations` | `UserModel.linkedStudentIds`, `schoolId` | `assertSchoolManagementScope` | `smoke:school-management`, `smoke:batch136-admin-users-schools-parent-payment` | PASS-PARTIAL: awaited relation endpoint exists; live role data proof still required. |
| Admin School Dashboard | Link school/class supervisor | `applySchoolRelations` and `createAdminUser`; store assignment APIs | `UserModel.groupIds`, `GroupModel.supervisorIds`, `schoolId` | `assertSchoolManagementScope` and supervisor scope resolution | `smoke:supervisor-school-live`, `smoke:supervisor-executive-snapshot-live`, `smoke:rbac-school-scope` | FIX: relation endpoint is scoped; quick assignment store actions still need awaited API proof. |
| Admin School Dashboard | Link package/path/course | `createB2BPackage/updateB2BPackage/deleteB2BPackage` | `B2BPackageModel`, `AccessCodeModel` cleanup | `hasSchoolIdManagementScope` | `smoke:admin-school-command`, `smoke:school-portal-command` | FIX: backend scope exists; many visible package edits are direct optimistic calls and need loading/error/success proof. |
| Admin School Dashboard | School report | `getSchoolReport -> /content/schools/:id/report` | `GroupModel`, `UserModel`, `B2BPackageModel`, `AccessCodeModel` | `assertSchoolManagementScope` | `smoke:reports-role`, `smoke:report-actions-live` | PASS-PARTIAL: awaited report load and backend scope exist; role report smoke still required. |
| School Portal | Supervisor school/class scope | Frontend scoped from user groups and school/class supervisor IDs | Uses scoped groups, packages, access codes, results | Frontend scope exists; backend must remain source of truth for sensitive routes | `smoke:supervisor-school-live`, `smoke:supervisor-executive-snapshot-live`, `smoke:rbac-school-scope` | PASS-PARTIAL: scoped display logic exists; direct API access still must be proven by smoke. |
| School Portal | Student reports and weak skills | Uses scoped students/results and class/school filters | Exam results and skills analysis scoped by visible students | Role scope must prevent cross-school/class leakage | `smoke:reports-role`, `smoke:saher-skills` | PASS-PARTIAL: scoped frontend logic exists; smoke proof still required. |
| School Portal vs Admin School Dashboard | Duplication review | N/A | N/A | Role-specific visibility expected | Manual review plus command-center smokes | BLOCKER: needs UX pass to reduce duplication without redesign after functional gaps are closed. |

### Checkpoint 2 - Supervisor RBAC

- `npm run smoke:supervisor-school-live`: PASS 8/8.
  - Evidence: `audit-artifacts/ui-audit-exhaustive/supervisor-school-2026-06-13T19-23-30-001Z`.
- `npm run smoke:supervisor-executive-snapshot-live`: PASS 2/2.
  - Evidence: `audit-artifacts/ui-audit-exhaustive/supervisor-executive-snapshot-2026-06-13T19-25-57-356Z`.
- `npm run smoke:rbac-school-scope`: PASS 4/4.
  - Verified shared school scope guard.
  - Verified school report endpoint scope guard.
  - Verified import-students endpoint scope guard.
  - Verified relations endpoint uses the same scope guard.
- Status: PASS for the current supervisor RBAC checkpoint. School Supervisor and Class Supervisor scope has live/contract evidence, and direct sensitive school APIs checked in this checkpoint are guarded by backend scope.

### Checkpoint 3 - Reports And Skills Scope

- `npm run smoke:reports-role`: PASS 20/20.
  - Verified scoped analytics and quiz results for non-student roles.
  - Verified student, parent, admin, supervisor, and teacher report surfaces keep role-specific behavior.
  - Verified server analytics scopes reports by role before returning weak skills and students.
- `npm run smoke:saher-skills`: PASS 5/5.
  - Verified Saher can select multiple skills and fill a student quiz from selected skill scope.
  - Verified weak skill ids flow into extra quiz links.
  - Verified directed quizzes include Saher and audience OR logic.
- `npm run smoke:report-actions-live`: BLOCKED 5/5.
  - Evidence: `audit-artifacts/ui-audit-exhaustive/report-actions-2026-06-13T19-31-11-057Z`.
  - Reason: missing role credentials for student, parent, teacher, supervisor, and admin. `audit-artifacts/ROLE_CREDENTIALS.env` was not present.
- Status: PASS for contract-level reports and Saher skill scope. Live report action buttons still require role credentials before this checkpoint can be fully closed.

### Checkpoint 4 - Real Student In Class UI

- `npm run smoke:school-from-scratch-live`: BLOCKED.
  - Reason: missing admin credentials. The script requires `ROLE_ADMIN_EMAIL`/`ROLE_ADMIN_PASSWORD`, `SMOKE_ADMIN_EMAIL`/`SMOKE_ADMIN_PASSWORD`, or `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
  - The script stopped at login before creating the temporary school, class, student, parent, supervisor, package, or access code.
  - A run directory was created at `audit-artifacts/ui-audit-exhaustive/school-from-scratch-2026-06-13T19-35-51-194Z`, but no summary files were written because execution stopped before the audit body.
- `npm run smoke:batch100g-school-student-pagination`: PASS 4/4.
  - Verified the school student table no longer hard-caps results at the first 80 records.
  - Verified explicit pagination state and derived page rows.
  - Verified student search and class filters reset the page safely.
  - Verified pagination UI communicates visible range and provides previous/next controls.
- Status: pagination and visible roster paging contract PASS. The live proof for creating a school from scratch, showing a student inside a class, moving/removing that student, and linking parent/supervisor remains BLOCKED until admin credentials are available.

### Checkpoint 5 - Simple UX And Duplication

- Updated `dashboards/admin/SchoolsManager.tsx` so the commercial summary cards act as direct navigation:
  - `النطاق الحالي` opens `relations` and scrolls directly to `school-wide-supervisors-panel`.
  - `الوصول التجاري` opens `packages` and scrolls to `school-packages-panel`.
  - `إجراء اليوم` scrolls to the relevant operational panel.
  - Package/report labels were normalized to `إدارة الباقات والمسارات` and `فتح التقارير`.
- `npm run smoke:school-management`: PASS 22/22.
  - Verified the selected school has a clear commercial operating flow.
  - Verified school workspace avoids duplicate operating blocks.
  - Verified supervisor scope remains explicit and separate from platform admin.
- `npm run smoke:admin-school-command`: PASS 6/6.
- `npm run smoke:school-portal-command`: PASS 14/14.
- `npm run build`: PASS.
- Status: PASS for the current simple UX and duplication checkpoint. Admin School Dashboard and School Portal command surfaces are contract-clean, and the school summary cards now guide users to the exact operational panels instead of leaving them to search manually.

## Work Rule

- No new account starts from scratch.
- Read this file first.
- Read only the last 5 commits.
- Continue from the first incomplete checkpoint.
- Do not use `git add .`.
- Do not open goals outside schools.
