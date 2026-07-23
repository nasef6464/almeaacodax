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

1. No open schools release blocker is known after the latest production deploy and visual pass.
2. If the local ignored credential file is missing in a future account, re-provide live admin credentials before re-running `npm run smoke:school-from-scratch-live`.

## Local Credential Note

- Local admin smoke credentials were saved in ignored file `audit-artifacts/ROLE_CREDENTIALS.env`.
- Do not commit this file.
- Do not copy credential values into this handoff.

## Skills Available Locally

- `almeaa-schools-full-closure`
- `almeaa-schools-button-api-db-audit`
- `almeaa-schools-rbac-real-users`
- `almeaa-schools-simple-ux`
- `almeaa-schools-smoke-gate`

If continuing from a new account and local skills are missing, continue using this handoff file and the goal instructions; do not restart from scratch.

## Checkpoint Progress

### 2026-06-15 - Schools Save Persistence Fix

- Issue found from production-style QA: school changes could appear in the admin UI, then disappear after refresh because the frontend reused cached `content/bootstrap` data.
- Fix shipped locally: school saves now clear the frontend bootstrap cache, refetch schools/classes/students/supervisors from the backend, and only show success after the fresh server data returns.
- Added visible selected-school button: `حفظ وتأكيد البيانات`.
- Button states verified locally: `جاري الحفظ`, `جاري التحقق`, `تم الحفظ والتأكد`, `فشل الحفظ`.
- Fixed admin user refresh limit from 200 to 100 so the verification request matches backend validation.
- Browser verification: opened a real school workspace locally against the connected API, confirmed the button is visible, clicked it, and got `تم الحفظ والتأكد من البيانات من الخادم`.
- Follow-up QA found one remaining refresh gap: after adding a single student, the API saved the student, but opening the school after refresh could show `0 طالب` until pressing `حفظ وتأكيد البيانات`.
- Follow-up fix: opening any selected school as admin now performs a silent server refresh for the school workspace, so users/classes/students/supervisors hydrate before the manager relies on counters.
- Local verification after the follow-up fix: opened the same QA school after refresh and the student counter showed `1 طالب` without pressing the save/verify button.
- Production verification after deploy `9eff0cf6`: created a QA school, created a class, added one student manually, imported one student from an Excel file, linked a school-level supervisor, refreshed/reopened the school, and confirmed counters persisted as `1 فصل`, `2 طالب`, and `1 مشرف`.
- Production supervisor check: logged in as the linked supervisor, opened `بوابة مدرستي`, confirmed the linked QA school was visible, and confirmed known unrelated schools were not visible.
- Gates:
  - `npm run typecheck`: BLOCKED timeout after 120s, not a compile failure.
  - `npm run build`: PASS.
  - `npm run server:check`: PASS.
  - `npm run smoke:school-management`: PASS.
  - `npm run smoke:admin-school-command`: PASS.
  - `npm run smoke:school-from-scratch-live`: PASS.
  - `npm run smoke:rbac-school-scope`: PASS.
- Remaining later only: orphan data cleanup as a separate dry-run-first goal.

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
| Admin School Dashboard | Create school | `createGroupAsync -> /content/groups` | `GroupModel.create` | Backend group scope path exists | `smoke:school-management`, `smoke:admin-school-command` | PASS: visible action now awaits API and exposes loading/error/success through school action state. |
| Admin School Dashboard | Edit school | `updateGroupAsync -> /content/groups/:id` | `GroupModel.findOneAndUpdate` | Backend document scope required | `smoke:school-management`, `smoke:admin-school-command` | PASS: visible rename action awaits API and reports failure near the school workspace. |
| Admin School Dashboard | Delete/disable school | `deleteGroupAsync -> /content/groups/:id` | Deletes school, classes, school packages, access codes, and removes group references | Backend document scope required | `smoke:school-management` | PASS: confirmation exists and delete waits for API before clearing selected school. |
| Admin School Dashboard | Add class | `createGroupAsync -> /content/groups` | `GroupModel.create` with parent school | Parent school/class relationship exists | `smoke:school-management` | PASS: class creation waits for API and uses school action loading/error/success state. |
| Admin School Dashboard | Edit class | `updateGroupAsync -> /content/groups/:id` | `GroupModel.findOneAndUpdate` | Backend document scope required | `smoke:school-management` | PASS: class rename waits for API and keeps the workspace in source-backed state. |
| Admin School Dashboard | Delete class | `deleteGroupAsync -> /content/groups/:id` | Deletes class and removes student/supervisor group links | Backend document scope required | `smoke:school-management` | PASS: destructive class action is confirmed and awaited. |
| Admin School Dashboard | Import/add student | `importSchoolStudents -> /content/schools/:id/import-students`, `applySchoolRelations` | `UserModel`, `GroupModel`, school/class totals | `assertSchoolManagementScope` | `smoke:school-from-scratch-live`, `smoke:batch100g-school-student-pagination` | PASS: live school-from-scratch proved one student inside a class, parent/class supervisor relation, package/access code, report, and cleanup. |
| Admin School Dashboard | Move/assign/remove student from class or school | `assignStudentToGroupAsync/removeStudentFromGroupAsync` through `updateAdminUser` and `updateGroup` | `GroupModel.studentIds`, `User.groupIds`, `User.schoolId` | Backend document scope required | `typecheck`, `build`, `server:check`, `smoke:school-management`, `smoke:batch100g-school-student-pagination` | PASS: class transfer and school/class removal now wait for API persistence with visible roster-saving state. |
| Admin School Dashboard | Link parent | `applySchoolRelations -> /content/schools/:id/relations` | `UserModel.linkedStudentIds`, `schoolId` | `assertSchoolManagementScope` | `smoke:school-management`, `smoke:batch136-admin-users-schools-parent-payment`, `smoke:school-from-scratch-live` | PASS: awaited relation endpoint exists, batch136 passed, and live school-from-scratch proved parent relation with real created data. |
| Admin School Dashboard | Link school/class supervisor | `applySchoolRelations`, `createAdminUser`, `assignSupervisorToGroupAsync/removeSupervisorFromGroupAsync` | `UserModel.groupIds`, `GroupModel.supervisorIds`, `schoolId` | `assertSchoolManagementScope` and supervisor scope resolution | `typecheck`, `build`, `server:check`, `smoke:school-management`, `smoke:admin-school-command`, `smoke:batch136-admin-users-schools-parent-payment` | PASS: quick school/class supervisor assignment, creation, and removal now wait for API persistence with visible roster-saving state. |
| Admin School Dashboard | Link package/path/course | `createB2BPackageAsync/updateB2BPackageAsync/deleteB2BPackageAsync`, `createAccessCodeAsync/deleteAccessCodeAsync` | `B2BPackageModel`, `AccessCodeModel` cleanup | `hasSchoolIdManagementScope` | `typecheck`, `build`, `smoke:admin-school-command`, `smoke:school-management`, `smoke:school-portal-command`, `smoke:batch136-admin-users-schools-parent-payment` | PASS: school package create/update/delete/path/course controls and access-code generation/deletion now await API with visible saving/error/success state. |
| Admin School Dashboard | School report | `getSchoolReport -> /content/schools/:id/report` | `GroupModel`, `UserModel`, `B2BPackageModel`, `AccessCodeModel` | `assertSchoolManagementScope` | `smoke:reports-role`, `smoke:report-actions-live` | PASS: report loading, role report actions, and backend scope are verified. |
| School Portal | Supervisor school/class scope | Frontend scoped from user groups and school/class supervisor IDs | Uses scoped groups, packages, access codes, results | Frontend scope exists; backend scope guards verified for sensitive school APIs | `smoke:supervisor-school-live`, `smoke:supervisor-executive-snapshot-live`, `smoke:rbac-school-scope` | PASS: supervisor school/class scope has live and backend contract evidence. |
| School Portal | Student reports and weak skills | Uses scoped students/results and class/school filters | Exam results and skills analysis scoped by visible students | Role scope prevents cross-school/class leakage in report contracts | `smoke:reports-role`, `smoke:saher-skills`, `smoke:report-actions-live` | PASS: report and Saher skill scope checks passed, and role report actions passed live. |
| Supervisor Dashboard | Weak-student center: school/grade/class/status filters, student report, directed quiz, follow-up alert | `sendStudentAlert -> /notifications/student-alert`; report and quiz routes use scoped student id | Notification persisted by `NotificationModel`; quiz targets student through existing directed-quiz flow | Notification route requires admin/supervisor/teacher and rejects out-of-scope students | `smoke:supervisor-dashboard`, `smoke:school-portal-command`, `smoke:supervisor-school-live` | PASS: phase-one center shipped in `f5795b57`; typecheck, build, contract 4/4, and live supervisor audit 8/8 passed. |
| Supervisor Reports | Scoped student/skill reports plus visible class and teacher comparisons; PDF and Excel summary | Existing scoped analytics/results APIs; print summary; Excel workbook now includes `teachers` sheet | Uses scoped `QuizResult`/skills data and existing group-to-teacher relationships; no schema change | Report visibility remains limited to the supervisor scope | `smoke:reports-role`, `smoke:supervisor-school-live` | PASS: phase-two report comparison shipped in `c6ebd365`; typecheck, build, and reports contract 20/20 passed. |
| Supervisor Quick Decision Board | Best/weakest class, top weak skill, improved students, pending follow-up cases, weekly alert | Derived from scoped results, weak skills, targeted quizzes, and `sendStudentAlert` | Weekly alert targets only scoped pending students; no schema change | Supervisor sees only owned school/class students and results | `smoke:supervisor-dashboard`, `smoke:supervisor-school-live` | PASS: phase-three board shipped in `dac5ca09`; typecheck, build, contract 5/5, live audit 8/8, desktop/mobile screenshots passed. |
| School Portal vs Admin School Dashboard | Duplication review | N/A | N/A | Role-specific visibility expected | `smoke:school-management`, `smoke:admin-school-command`, `smoke:school-portal-command`, mobile production visual proof | PASS: current command surfaces are contract-clean, duplicate operating blocks removed, and mobile selected school workspace is contained. |

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

#### Checkpoint 3 Follow-up - Report Action Buttons

- Role credentials were supplied from the existing operational scenario accounts and local admin environment for verification only; no credential file was committed.
- `npm run smoke:report-actions-live` against the current deployed site changed from BLOCKED to FAIL:
  - Evidence: `audit-artifacts/ui-audit-exhaustive/report-actions-2026-06-13T23-42-48-216Z`.
  - PASS 6 / FAIL 4 / BLOCKED 0.
  - Student, parent, and teacher report actions passed on desktop and mobile.
  - Supervisor and admin failed because `[data-testid="directed-quiz-analysis-export"]` was missing when no directed follow-up options existed.
- Updated `pages/Reports.tsx` so the directed quiz analysis panel is visible for teacher, supervisor, and admin report users even when there are no directed follow-up attempts yet; the export action remains visible and disabled until exportable results exist.
- Verification after the local code change:
  - `npm run typecheck`: PASS.
  - `npm run build`: PASS.
  - `npm run smoke:report-actions-live` against the deployed site before deployment of this commit: FAIL 4, expected because the deployed bundle did not include the local fix yet.
  - Local preview run was not treated as authoritative because localhost did not load the same role-scoped report data/session shape as production.
- Deployed the fix to Vercel production and aliased it to `https://almeaacodax.vercel.app`.
- Final live verification after deployment:
  - `npm run smoke:report-actions-live`: PASS 10/10.
    - Evidence: `audit-artifacts/ui-audit-exhaustive/report-actions-2026-06-14T00-04-43-097Z`.
  - `npm run smoke:reports-role`: PASS 20/20.
- Status: PASS. Live report action buttons are now verified for student, parent, teacher, supervisor, and admin on desktop and mobile.

### Checkpoint 4 - Real Student In Class UI

- `npm run smoke:school-from-scratch-live`: PASS 12/12.
  - Evidence: `audit-artifacts/ui-audit-exhaustive/school-from-scratch-2026-06-13T23-33-53-345Z`.
  - Verified temporary school creation.
  - Verified class creation under school.
  - Verified importing one student into the class.
  - Verified student has school and class scope.
  - Verified parent and class supervisor relation workflow.
  - Verified school and class rosters update.
  - Verified school-wide supervisor scope is separate from class supervisor.
  - Verified school package and access code creation.
  - Verified school report sees the commercial setup.
  - Cleanup review: PASS 0 pending reviews.
- `npm run smoke:batch100g-school-student-pagination`: PASS 4/4.
  - Verified the school student table no longer hard-caps results at the first 80 records.
  - Verified explicit pagination state and derived page rows.
  - Verified student search and class filters reset the page safely.
  - Verified pagination UI communicates visible range and provides previous/next controls.
- Status: PASS for the current real student in class checkpoint. The live flow proves school -> class -> student -> parent/class supervisor/school supervisor -> package/access code -> report, with cleanup completed.

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

#### Checkpoint 5 Follow-up - School/Class CRUD Awaited API

- Updated `store/useStore.ts` with awaited school/class group operations:
  - `createGroupAsync`
  - `updateGroupAsync`
  - `deleteGroupAsync`
- Updated `dashboards/admin/SchoolsManager.tsx` so key school/class actions use awaited API persistence before updating the visible workspace:
  - create school
  - create bulk classes
  - rename school
  - delete school
  - create class shortcuts
  - rename class
  - delete class
- Added operation pending state to prevent repeated clicks during school/class saves.
- Updated `scripts/smoke-school-management-contract.mjs` so the delete action contract recognizes the safer awaited delete flow.
- Verification:
  - `npm run typecheck`: PASS.
  - `npm run build`: PASS.
  - `npm run smoke:school-management`: PASS 22/22.
  - `npm run smoke:admin-school-command`: PASS 6/6.
- Status: PASS for this follow-up. The main school/class CRUD buttons no longer rely only on cosmetic optimistic store updates.

#### Checkpoint 5 Follow-up - School Package Awaited API

- Updated `store/useStore.ts` with awaited school package operations:
  - `createB2BPackageAsync`
  - `updateB2BPackageAsync`
  - `deleteB2BPackageAsync`
- Updated `dashboards/admin/SchoolsManager.tsx` so school package actions wait for the API before updating visible package state:
  - create school package
  - expire all school packages
  - rename package
  - activate/expire package
  - delete package
  - update package type, teacher, revenue share, seats, discount, content type, path, subject, and course links
- Added visible package-saving state and error/success messages near the school workspace.
- Verification:
  - `npm run typecheck`: BLOCKED after 5 minutes, matching the earlier project-level typecheck timeout behavior.
  - `npm run build`: PASS.
  - `npm run smoke:school-management`: PASS 22/22.
  - `npm run smoke:admin-school-command`: PASS 6/6.
  - `npm run smoke:batch136-admin-users-schools-parent-payment`: PASS.
- Status: PASS-PARTIAL for package/path/course controls. Package CRUD and package scope edits now await API; access-code generation still needs the same awaited-flow audit.

#### Checkpoint 5 Follow-up - School Access Code Awaited API

- Updated `store/useStore.ts` with awaited school access-code operations:
  - `createAccessCodeAsync`
  - `deleteAccessCodeAsync`
- Updated `dashboards/admin/SchoolsManager.tsx` so school access-code actions wait for the API before changing visible state:
  - generate school activation code
  - delete school activation code
- Added visible access-code saving state plus clear error/success messages in the school workspace.
- Verification:
  - `npm run typecheck`: PASS.
  - `npm run build`: PASS.
  - `npm run smoke:school-management`: PASS 22/22.
  - `npm run smoke:admin-school-command`: PASS 6/6.
  - `npm run smoke:school-portal-command`: PASS 14/14.
  - `npm run smoke:batch136-admin-users-schools-parent-payment`: PASS.
- Status: PASS. Access-code generation/deletion no longer relies only on optimistic local updates.

#### Checkpoint 5 Follow-up - Student And Supervisor Roster Awaited API

- Updated `store/useStore.ts` with awaited roster operations:
  - `assignStudentToGroupAsync`
  - `removeStudentFromGroupAsync`
  - `assignSupervisorToGroupAsync`
  - `removeSupervisorFromGroupAsync`
- Updated `dashboards/admin/SchoolsManager.tsx` so the remaining quick roster actions wait for API persistence before updating visible state:
  - assign existing supervisor to the whole school
  - remove school-level supervisor
  - assign existing supervisor to a class
  - remove class supervisor
  - create/link quick supervisor
  - move student to another class
  - remove student from class
  - remove student from school
  - relation-upload class/supervisor assignments
- Added visible roster-saving state and disabled repeated roster clicks while saving.
- Updated the affected smoke contracts so they verify the awaited async flow instead of the old optimistic calls.
- Verification:
  - `npm run typecheck`: PASS.
  - `npm run build`: PASS.
  - `npm run server:check`: PASS.
  - `npm run smoke:school-management`: PASS 22/22.
  - `npm run smoke:admin-school-command`: PASS 6/6.
  - `npm run smoke:school-portal-command`: PASS 14/14.
  - `npm run smoke:batch100g-school-student-pagination`: PASS 4/4.
  - `npm run smoke:batch136-admin-users-schools-parent-payment`: PASS.
- Status: PASS. The remaining quick student/supervisor roster assignment and removal flows no longer rely on optimistic local updates.

#### Checkpoint 5 Follow-up - Visual School Workspace Pass

- Browser visual check on production as admin:
  - School list opened from `https://almeaacodax.vercel.app/admin-dashboard?tab=groups`.
  - Desktop school list: PASS, no horizontal overflow, school create and open-management controls visible.
  - Desktop selected school workspace: PASS, no horizontal overflow, key panels visible:
    - `school-workspace-shell`
    - `school-primary-add-class`
    - `school-students-panel`
    - `school-roster-panel`
    - `school-delete-button`
    - `school-wide-supervisors-panel`
  - Mobile selected school workspace initially showed horizontal overflow.
- Updated `dashboards/admin/SchoolsManager.tsx` to keep the school workspace, student panel, and roster panel constrained with `min-w-0`, `max-w-full`, and workspace `overflow-x-hidden`.
- Verification after the mobile containment fix:
  - `npm run typecheck`: PASS.
  - `npm run build`: PASS.
  - `npm run smoke:school-management`: PASS 22/22.
- Post-deployment production visual proof:
  - Production URL checked: `https://almeaacodax.vercel.app/admin-dashboard?tab=groups`.
  - Mobile viewport checked: 390 x 844.
  - Horizontal overflow: PASS, `documentElement.scrollWidth = 390`, `body.scrollWidth = 390`, no overflow nodes found.
  - Visible selected school workspace panels: PASS.
    - `school-workspace-shell`
    - `school-primary-add-class`
    - `school-students-panel`
    - `school-roster-panel`
    - `school-delete-button`
    - `school-wide-supervisors-panel`
  - Console errors: 0.
  - Network 5xx responses: 0.
- Status: PASS. The selected school workspace is visually contained on production mobile after deployment.

### Checkpoint 6 - Final Verification

#### Checkpoint 6 Re-run After Roster Awaited API - 2026-06-14

- Branch verified: `codex/schools-full-closure`.
- Last commit verified: `0d16619e fix: await school roster scope actions`.
- `git status`: clean before this documentation update.
- Verification:
  - `npm run typecheck`: PASS.
  - `npm run build`: PASS.
  - `npm run server:check`: PASS.
  - `npm run smoke:school-management`: PASS 22/22.
  - `npm run smoke:admin-school-command`: PASS 6/6.
  - `npm run smoke:school-portal-command`: PASS 14/14.
  - `npm run smoke:rbac-school-scope`: PASS 4/4.
  - `npm run smoke:reports-role`: PASS 20/20.
  - `npm run smoke:school-from-scratch-live`: BLOCKED.
    - First useful error: `Error: Missing admin credentials`.
    - Checked credential sources: no `ROLE_ADMIN_*`, `SMOKE_ADMIN_*`, `GOLIVE_ADMIN_*`, `ADMIN_*` credentials in the current process or local `.env*` files, and no `audit-artifacts/ROLE_CREDENTIALS.env` file was present.
- Status: final verification is not closed until `smoke:school-from-scratch-live` is rerun with admin credentials and passes. Do not deploy or mark schools complete before that live proof.

#### Extra Scope Re-check While Waiting For Credentials - 2026-06-14

- Branch verified: `codex/schools-full-closure`.
- Last commit verified: `aa12c62b docs: record schools final verification blocker`.
- `git status`: clean before this documentation update.
- Additional verification:
  - `npm run smoke:supervisor-school-live`: PASS 8/8.
    - Evidence: `audit-artifacts/ui-audit-exhaustive/supervisor-school-2026-06-14T13-29-46-514Z`.
  - `npm run smoke:supervisor-executive-snapshot-live`: PASS 2/2.
    - Evidence: `audit-artifacts/ui-audit-exhaustive/supervisor-executive-snapshot-2026-06-14T13-29-47-888Z`.
  - `npm run smoke:saher-skills`: PASS 5/5.
  - `npm run smoke:report-actions-live`: BLOCKED 5/5.
    - Evidence: `audit-artifacts/ui-audit-exhaustive/report-actions-2026-06-14T13-29-46-532Z`.
    - Reason: missing student, parent, teacher, supervisor, and admin role credentials. Network 5xx count was 0.
- Status: supervisor live scope and Saher skills remain PASS. Final deployment is still blocked until live admin/role credentials are available and the live checks pass.

#### Checkpoint 6 Re-run After Local Admin Credentials - 2026-06-14

- Branch verified: `codex/schools-full-closure`.
- Local admin credentials saved only in ignored file `audit-artifacts/ROLE_CREDENTIALS.env`.
- `git check-ignore` confirmed the credential file is ignored through `.gitignore`.
- Verification:
  - `npm run smoke:school-from-scratch-live`: PASS 12/12.
    - Evidence: `audit-artifacts/ui-audit-exhaustive/school-from-scratch-2026-06-14T18-23-02-692Z`.
    - Cleanup review: PASS 0 pending reviews.
  - `npm run typecheck`: PASS.
  - `npm run build`: PASS.
  - `npm run server:check`: PASS.
  - `npm run smoke:school-management`: PASS 22/22.
  - `npm run smoke:admin-school-command`: PASS 6/6.
  - `npm run smoke:school-portal-command`: PASS 14/14.
  - `npm run smoke:rbac-school-scope`: PASS 4/4.
  - `npm run smoke:reports-role`: PASS 20/20.
- Deployed to Vercel production:
  - Production URL: `https://almeaacodax.vercel.app`.
  - Deployment URL: `https://almeaacodax-9lkrcql3a-nasefs-projects-18e6bdb1.vercel.app`.
- Production visual verification:
  - Evidence: `audit-artifacts/ui-audit-exhaustive/prod-schools-visual-2026-06-14T18-43-10-935Z`.
  - Desktop viewport 1440 x 1000: PASS.
  - Mobile viewport 390 x 844: PASS.
  - Visible selected-school panels: `school-workspace-shell`, `school-primary-add-class`, `school-students-panel`, `school-roster-panel`, `school-delete-button`, `school-wide-supervisors-panel`.
  - Horizontal overflow: PASS, none found.
  - Console errors: 0.
  - Network 5xx responses: 0.
  - Auth 401/403 responses during verified run: 0.
- Status: final contract/build verification, production deployment, and production visual verification are PASS.

- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- `npm run server:check`: PASS.
- `npm run smoke:school-management`: PASS 22/22.
- `npm run smoke:admin-school-command`: PASS 6/6.
- `npm run smoke:school-portal-command`: PASS 14/14.
- `npm run smoke:rbac-school-scope`: PASS 4/4.
- `npm run smoke:reports-role`: PASS 20/20.
- `npm run smoke:school-from-scratch-live`: PASS 12/12.
  - Evidence: `audit-artifacts/ui-audit-exhaustive/school-from-scratch-2026-06-13T23-33-53-345Z`.
  - Cleanup review: PASS 0 pending reviews.
- No stale `typecheck`, `tsc --noEmit`, or `live-school-from-scratch` Node processes were left running after verification.
- Status: final contract/build verification is PASS for all Checkpoint 6 commands.

### Post-PASS Schools Reality QA - 2026-06-14

- Branch verified and updated with fast-forward only: `codex/schools-full-closure`.
- Last 5 commits reviewed:
  - `0cf85a14` docs: record schools production visual pass
  - `6a45271e` docs: record schools live admin verification pass
  - `a67c94d7` docs: record additional schools credential-gated checks
  - `aa12c62b` docs: record schools final verification blocker
  - `0d16619e` fix: await school roster scope actions
- Investigation result:
  - Student import was not a database write failure. `/content/schools/:id/import-students` persisted users/classes/groups, but the frontend refreshed through `/auth/admin/users`, which is capped by the backend at 100 users and did not refresh school groups/classes. This could leave the selected school panel showing stale `users/groups/counts`.
  - Supervisor lists could become empty because the relations response returned only school-scoped users and the frontend replaced the whole users store with that partial list. Available global supervisors could disappear after the relation flow.
  - Database integrity dry-run found orphan data, but no DB-level case of imported students being invisible in the selected school.
- Fixes applied:
  - `/content/schools/:id/import-students` now returns authoritative `groups` and `users` for the affected school after import.
  - `SchoolsManager.tsx` now merges partial school users/groups into the existing store instead of replacing global users/groups after import or relations.
  - Supervisor dropdowns now show a clear empty state: `لا يوجد مشرفون متاحون، أنشئ مشرفًا جديدًا أو حرر مشرفًا مرتبطًا بنطاق آخر.`
  - Added dry-run-only integrity audit script: `scripts/audit-school-integrity.mjs`.
- Integrity dry-run evidence:
  - Command: `node scripts/audit-school-integrity.mjs`.
  - Mode: dry-run, writes performed: 0.
  - Database totals: 58 users, 10 groups, 3 schools, 7 classes.
  - Findings:
    - users with missing schoolId group: 7.
    - users with orphan groupIds: 14.
    - groups with missing studentIds: 0.
    - groups with missing supervisorIds: 0.
    - supervisors linked to deleted schools/classes: 4.
    - students imported but not visible in selected school: 0.
    - students visible by school/class but missing from school roster: 0.
  - No cleanup was executed. Orphan cleanup remains approval-gated.
- Verification:
  - `npm run typecheck`: PASS.
  - `npm run build`: PASS.
  - `npm run server:check`: PASS.
  - `npm run smoke:school-management`: PASS 22/22.
  - `npm run smoke:admin-school-command`: PASS 6/6.
  - `npm run smoke:school-from-scratch-live`: PASS 12/12, cleanupReview 0, evidence `audit-artifacts/ui-audit-exhaustive/school-from-scratch-2026-06-14T20-32-59-186Z`.
  - `npm run smoke:rbac-school-scope`: PASS 4/4.
  - Additional nearby check `npm run smoke:batch100f-relationship-audit`: PASS 10/10.
- Status: Post-PASS Reality QA fixes are code-complete and verified. Student import visibility is fixed as a frontend/API hydration issue. Supervisor dropdown disappearance is fixed as a partial-store replacement issue. Orphan data exists and must not be cleaned without explicit approval.

## Work Rule

- No new account starts from scratch.
- Read this file first.
- Read only the last 5 commits.
- Continue from the first incomplete checkpoint.
- Do not use `git add .`.
- Do not open goals outside schools.

## UX Simplification - Selected School Workspace - 2026-06-15

- Branch: `codex/schools-ux-simplification`.
- Scope: frontend-only changes inside `dashboards/admin/SchoolsManager.tsx`.
- No backend, database, API, barcode, question editor, homepage, or orphan cleanup changes were made.
- Simplified the selected school workspace so the first view starts with:
  - one readiness/status strip,
  - readiness percentage,
  - the most important missing items only,
  - one visible operating journey for classes, students, supervisors, packages/codes, and handover report.
- Hid older repeated visual blocks from the user-facing layout while preserving their existing test hooks for regression coverage.
- Student import now shows a clear five-step wizard: template download, file upload, preview, import, and credentials download.
- Single-student add is collapsed by default and opens from the main student action or a class action.
- Supervisor empty-state copy remains clear when no supervisors are available.
- Package/code tab keeps a summary-first entry point, with detailed management remaining inside the section.
- Verification:
  - `npm run typecheck`: PASS.
  - `npm run build`: PASS.
  - `npm run server:check`: PASS.
  - `npm run smoke:school-management`: PASS 22/22.
  - `npm run smoke:admin-school-command`: PASS 6/6.
  - `npm run smoke:school-from-scratch-live`: PASS 12/12, cleanupReview 0.
- Visual check:
  - Local production preview checked on desktop 1440 x 1000 and mobile 390 x 844.
  - Horizontal overflow: PASS on both viewports.
  - Wizard visibility: PASS.
  - Single-student card collapsed by default and opens from the primary action: PASS.

## UX Simplification Visible Difference Follow-up - 2026-06-15

- Branch: `codex/schools-ux-simplification`.
- PR: `#2`.
- Scope remained frontend-only inside `dashboards/admin/SchoolsManager.tsx`; no backend, API, database, barcode, question editor, homepage, or orphan cleanup changes.
- Updated the selected school first screen so it is visibly different:
  - the first visible area is now one large status card with school name, readiness label, readiness percentage, and the top 3 missing items only;
  - old workspace tabs and repeated command-center blocks are hidden from the user-facing layout;
  - five large operating steps are shown collapsed by default: classes, students, supervisors, packages/codes, and handover report;
  - opening one step shows only that step's details;
  - student import is reached through the students step and keeps the five-stage wizard;
  - single-student add stays hidden until the user opens it.
- Verification:
  - `npm run typecheck`: PASS.
  - `npm run build`: PASS.
  - `npm run server:check`: PASS.
  - `npm run smoke:school-management`: PASS 22/22.
  - `npm run smoke:admin-school-command`: PASS 6/6.
  - `npm run smoke:school-from-scratch-live`: PASS 12/12, cleanupReview 0.
- Visual check:
  - Local production preview checked on desktop 1440 x 1000 and mobile 390 x 844.
  - Horizontal overflow: PASS on both viewports.
  - First screen changed: PASS, `school-ux-launch-board` visible.
  - Old command center and old tabs hidden: PASS.
  - Details collapsed by default: PASS.
  - Five UX steps visible: PASS.
  - Student import wizard visible only after opening students step: PASS.
  - Single-student form hidden by default and opens from its visible button: PASS.

## Schools Supervisor Controls Follow-up - 2026-06-15

- Branch: `main`.
- Scope: frontend-only changes inside `dashboards/admin/SchoolsManager.tsx`.
- No backend, database, API schema, barcode, question editor, homepage, or orphan cleanup changes were made.
- Production visual issue reported from `/admin-dashboard?tab=schools`:
  - supervisor dropdowns showed names but selection did not give a clear result;
  - class button "إنشاء مشرف جديد لهذا الفصل" did not visibly open the creation workflow;
  - selected class action area needed button verification.
- Fix:
  - Schools page now loads all supervisor and teacher candidates by role pages, then merges them with the current user list so candidates are not lost by the first 100 users page.
  - Supervisor link/remove actions now show explicit saving/success/error status while waiting for the backend.
  - The "create supervisor" shortcut now selects the target school/class, scrolls to the supervisor creation card, and focuses the supervisor name field.
  - Class action buttons reviewed: add student, roster, Excel import, content/codes, supervisor select/create, course select, class report download/print, edit, and delete are wired.
- Verification:
  - `npm run typecheck`: PASS.
  - `npm run build`: PASS.
  - `npm run server:check`: PASS.
  - `npm run smoke:school-management`: PASS 22/22.
  - `npm run smoke:admin-school-command`: PASS 6/6.
  - `npm run smoke:school-from-scratch-live`: PASS 12/12, cleanupReview 0.
  - `npm run smoke:rbac-school-scope`: PASS 4/4.

## School Orphan Cleanup Dry Run Only - 2026-06-18

- Branch: `main`.
- Scope: dry-run-only planning for old school orphan references.
- Added `scripts/cleanup-school-orphans.mjs`.
- No DB writes, no user deletion, no school deletion, no class/group deletion, and no cleanup apply were performed.
- Safety:
  - default mode is dry-run.
  - future write mode requires both `--apply` and `--confirm-school-orphan-cleanup`.
  - the script does not delete users, schools, classes, or groups.
- Baseline audit:
  - users with missing schoolId group: 7.
  - users with orphan groupIds: 13.
  - groups with missing studentIds: 0.
  - groups with missing supervisorIds: 0.
  - supervisors linked to deleted schools/classes: 3.
  - students imported but not visible in selected school: 0.
  - students visible by school/class but missing from school roster: 0.
- Cleanup dry-run plan:
  - affected users: 16.
  - affected supervisors/teachers: 3.
  - affected students: 10.
  - user records that would change after future approval: 16.
  - group records that would change: 0.
  - users/schools/classes/groups that would be deleted: 0.
  - proposed future changes: remove orphan groupIds from users, clear schoolId when the referenced school group no longer exists, and remove old supervisor/teacher links to deleted schools/classes by clearing stale user references.
- Risk:
  - current Production schools are not at risk based on dry-run.
  - no correct student would be removed from an existing valid school/class.
  - apply requires a separate explicit approval.
- Verification:
  - `npm run build`: PASS.
  - `npm run server:check`: PASS.
  - `npm run smoke:school-management`: PASS 22/22.
  - `npm run smoke:admin-school-command`: PASS 6/6.
  - `npm run smoke:rbac-school-scope`: PASS 4/4.
- Production verification after deploy:
  - School-wide supervisor login: PASS.
  - `بوابة مدرستي` shows `QA Admin Journey 20260618-0639` only; unrelated schools were not visible.
  - Supervisor portal counters show 3 students and 3 classes for the QA school.
  - Console errors: 0.
  - Network 5xx responses: 0.

## Production Admin Journey Follow-up - 2026-06-18

- Branch: `main`.
- Scope: schools UI counters and supervisor overview scoping only.
- No backend schema changes, DB direct edits, cleanup apply, deletion, barcode, question editor, or homepage changes were made.
- Production QA issue:
  - after adding a single student, the selected school workspace showed the student, but the school list card could still show 0 after refresh.
  - supervisor school portal was scoped correctly, but the supervisor overview top cards still showed platform-level style counters.
- Fix:
  - school card counters, readiness, portfolio rows, and selected school metrics now use one shared school-student calculation.
  - the shared calculation counts students linked by `schoolId`, school roster `studentIds`, class `studentIds`, or class/school `groupIds`.
  - school management now loads paginated admin users for students, parents, supervisors, and teachers so school cards do not depend on the first users page only.
  - school management triggers a fresh bootstrap plus roster refresh when the schools page opens, so the first school list view is not stale.
  - supervisor overview now builds scope from both `groupIds` and direct school/class `supervisorIds`.
  - supervisor top KPI cards now show scoped school/class/student/follow-up counts instead of global platform counts.
- Verification before push:
  - `npm run typecheck`: BLOCKED timeout after final roster-refresh-on-open change; earlier in this fix batch it passed, and the final build passed.
  - `npm run build`: PASS.
  - `npm run server:check`: PASS.
  - `npm run smoke:school-management`: PASS 22/22.
  - `npm run smoke:admin-school-command`: PASS 6/6.
  - `npm run smoke:school-from-scratch-live`: PASS 12/12, cleanupReview 0.
  - `npm run smoke:rbac-school-scope`: PASS 4/4.
- Next verification after deploy:
  - Production retest from Browser after final deploy: PASS for admin school list count after hard refresh.
  - `QA Admin Journey 20260618-0639` school card shows `طلاب 1` without opening the school first.
  - Selected school workspace also shows `1 طالب`.
  - Console errors during the final school-list check: 0.
  - Excel upload retest remains BLOCKED by browser automation file-upload limitations; automated school-management smoke still covers bulk import wiring.
  - Supervisor re-login retest remains BLOCKED because the QA supervisor password was not available in this run; scoped overview code and RBAC smoke passed.

## Production Admin Journey Completion - 2026-06-18

- Branch: `main`.
- Scope: finish the real Production UI admin journey for schools only.
- No backend schema changes, DB direct edits, cleanup apply, deletion, barcode, question editor, or homepage changes were made.
- Production UI verification:
  - Admin login: PASS.
  - Existing QA school opened from `https://almeaacodax.vercel.app/admin-dashboard?tab=schools`: PASS.
  - Excel/CSV import: PASS. The QA school moved from 1 student to 3 students after upload, preview, import, save/verify, and refresh.
  - Save and verify button: PASS after import and after supervisor link.
  - Supervisor creation/link from UI: PASS.
  - Supervisor login: PASS.
  - Supervisor school portal scope: PASS after the school-wide scope fix. A school-wide supervisor sees the linked QA school and student scope without unrelated schools.
  - Console errors: 0.
  - Network 5xx responses: 0.
- Fix applied during this completion pass:
  - `dashboards/admin/SchoolPortalManager.tsx` now treats `user.schoolId` as school-wide supervisor scope, matching the overview logic and the school-wide supervisor relation created from the schools UI.
  - The supervisor school portal now loads scoped school reports and uses their totals as a safe fallback when the supervisor bootstrap has the linked school but not the full student/class roster yet.
- Verification after fix:
  - `npm run typecheck`: PASS.
  - `npm run build`: PASS.
  - `npm run server:check`: PASS.
  - `npm run smoke:school-management`: PASS 22/22.
  - `npm run smoke:admin-school-command`: PASS 6/6.
  - `npm run smoke:rbac-school-scope`: PASS 4/4.

## Supervisor Portal Production Pass - 2026-06-24

- Branch: `codex/supervisor-dashboard-production`.
- Scope: supervisor school portal / `بوابة مدرستي` only, plus the notification API needed for scoped student alerts.
- Fix:
  - removed the portal's manual `window.history.pushState` + synthetic `hashchange` school-operations navigation that could make the page shake or fail.
  - `SchoolPortalManager` now receives a dashboard callback for opening school operations; the action is visible for platform admin only.
  - supervisors stay in a follow-up portal and get clear action feedback instead of a broken setup navigation.
  - added scoped in-app student alerts from the supervisor portal:
    - bulk alert for priority students.
    - single-student alert from the watch list.
    - backend route blocks supervisors/teachers from alerting students outside their school/class scope.
  - added a simple `اختباراتي الموجهة ونتائجها` panel showing directed quizzes, attempts, and average score inside the supervisor scope.
- Verification:
  - `npm run smoke:school-portal-command`: PASS 16/16.
  - `npm run smoke:supervisor-dashboard`: PASS 3/3.
  - `npm run build`: PASS.
  - `npm run server:check`: PASS.
  - `npm run smoke:reports-role`: PASS 20/20.
  - `npm run smoke:rbac-school-scope`: PASS 4/4.
  - `npm run smoke:school-management`: PASS 22/22.
  - `npm run smoke:admin-school-command`: PASS 6/6.
- Notes:
  - `npm run typecheck` did not finish within 5 minutes in this run; `npm run build` and `npm run server:check` passed.
  - Local visual QA was blocked by missing authenticated supervisor scope on the local dev session; use a real supervisor session after deploy to confirm Console errors and Network 5xx.
- Next checkpoint:
  - deploy this branch and retest Production as a real school supervisor:
    1. open `بوابة مدرستي`.
    2. confirm no `فتح تشغيل المدارس` button appears for supervisor.
    3. confirm priority alert and single-student alert work only inside scope.
    4. confirm directed quiz panel shows the supervisor's scoped tests/results.
    5. confirm Console errors = 0 and Network 5xx = 0.

## Supervisor Portal Production Verification - 2026-06-24

- Branch: `codex/supervisor-dashboard-production`.
- Deployed frontend: `https://almeaacodax.vercel.app`.
- Backend deploy: Render live for the scoped notification route used by supervisor student alerts.
- Production verification:
  - `npm run smoke:supervisor-school-live`: PASS 8/8.
  - `npm run smoke:supervisor-executive-snapshot-live`: PASS 2/2.
  - Supervisor overview: PASS on desktop and mobile.
  - School portal decision center: PASS on desktop and mobile.
  - Staff performance reports: PASS on desktop and mobile.
  - Directed quiz entry from the portal: PASS on desktop and mobile.
  - Missing required text groups: 0.
  - Visual overflow: none.
  - Console errors: 0 in the smoke run.
  - Network 5xx responses: 0 in the smoke run.
- Remaining risk:
  - Alert buttons are wired through scoped backend API and visible in the supervisor portal. A live click against real students was not performed to avoid sending real notifications outside an audit fixture.
  - A direct Production API send check was attempted with `supervisor.school@almeaa.local`, but no scoped audit student existed under that audit supervisor, so no real notification was sent.
