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

## Work Rule

- No new account starts from scratch.
- Read this file first.
- Read only the last 5 commits.
- Continue from the first incomplete checkpoint.
- Do not use `git add .`.
- Do not open goals outside schools.
