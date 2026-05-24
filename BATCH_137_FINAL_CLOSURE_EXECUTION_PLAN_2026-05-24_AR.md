# BATCH 137 - Final Closure Execution Plan (2026-05-24)

Status: In progress (execution plan ready for any new account)

## Why this batch
- BATCH 136 delivered core fixes and broad smoke PASS.
- Remaining closure needs authenticated runtime evidence and final operational sign-off.
- Owner requested this plan to be reusable across any new chat/account with zero context loss.

## Completed before this plan
1. Admin users three-dots actions wired.
2. Admin schools three-dots actions wired.
3. Safe admin user deletion flow implemented (API + UI + protections).
4. Parent-student linking source fixed to full `linkableStudents` in create/edit paths.
5. Payment approve-button blocker fixed in admin financial manager.
6. Course player runtime fixed:
   - tabs: description/resources/discussions
   - actions: favorite/share
7. Payment modal improved:
   - receipt URL supported
   - receipt image upload + preview/remove (image-only, max 2MB)
8. Deploy execution already completed:
   - Vercel production deploy succeeded
   - Render deploy triggered and reached live

## Mandatory closure scope (owner-priority)
1. Admin users management deep runtime matrix.
2. Relationships integrity (student/parent/supervisor/school/class).
3. Schools management deep runtime matrix (including supervisors).
4. Student journey end-to-end:
   - purchase request
   - admin review/approve
   - learner unlock verification
5. Payment portals/runtime matrix and approval lifecycle.
6. Embedded browser runtime verification evidence on production URL.

## Runtime matrix to execute (authenticated)
1. Users:
   - add user
   - filter/search
   - edit role/school/class
   - delete allowed user
   - verify 3-dots actions and persistence after refresh
2. Parent linkage:
   - link children on create/edit
   - save/reload persistence
   - parent scope reflects linked children
3. Schools:
   - create/edit school
   - add/remove supervisors
   - school actions menus
   - relations save and reload integrity
4. Payments:
   - submit payment proof (URL and image)
   - request appears in admin queue
   - approve/reject changes status correctly
   - approved request unlocks correct learner/package scope
5. Course player:
   - resources/discussions tabs actionable
   - favorite/share actionable

## Commands for closure cycle
1. `npm run typecheck`
2. `npm run build`
3. `npm --prefix server run build`
4. `npm run smoke:batch136-admin-users-schools-parent-payment`
5. `npm run smoke:student-learning-journey`
6. `npm run smoke:payment-package`
7. `npm run smoke:batch100f-relationship-audit`
8. `npm run smoke:school-management`
9. `npm run smoke:real-usage-readiness`
10. `npm run smoke:health-readiness`
11. `npm run smoke:frontend:strict`
12. `npm run smoke:operational` (requires admin auth env)

## Current blocker (secrets-gated only)
- Operational authenticated smoke requires one of:
  - `SMOKE_ADMIN_TOKEN`
  - `SMOKE_ADMIN_EMAIL` + `SMOKE_ADMIN_PASSWORD`
  - `GOLIVE_ADMIN_EMAIL` + `GOLIVE_ADMIN_PASSWORD`
  - `ADMIN_EMAIL` + `ADMIN_PASSWORD`

## Definition of final closure
- All mandatory commands PASS.
- Authenticated browser runtime matrix executed and documented.
- Status/Ledger/Handover updated with exact PASS/FAIL evidence.
- Explicit commit + push recorded.
- Production URLs verified after latest push/deploy.

## Execution Update (2026-05-24)

PASS:
1. `npm run typecheck`
2. `npm run build`
3. `npm --prefix server run build`
4. `npm run smoke:batch136-admin-users-schools-parent-payment`
5. `npm run smoke:student-learning-journey`
6. `npm run smoke:payment-package`
7. `npm run smoke:batch100f-relationship-audit`
8. `npm run smoke:school-management`
9. `npm run smoke:real-usage-readiness`
10. `npm run smoke:health-readiness`
11. `npm run smoke:frontend:strict` (production serving expected commit `a3fcf8f`)

FAIL (expected, secret-gated):
1. `npm run smoke:operational`
   - reason: missing admin auth env in current shell.

Current readiness snapshot:
- Code/runtime contracts: PASS.
- Production shell/version alignment: PASS.
- Remaining closure gate: authenticated operational smoke only.

## Operational Closure Attempt Log (2026-05-24)

Attempt A (local API):
- base: `http://localhost:4000/api`
- result: FAIL
- failure:
  - admin login returned 500 due to database monitor connection close:
  - `"connection <monitor> to 159.143.85.4:27017 closed"`

Attempt B (production API):
- base: `https://almeaacodax-k2ux.onrender.com/api`
- result: FAIL (temporary gate)
- failure:
  - admin login rate-limited:
  - `429 Too many login attempts. Try again later.`

Interpretation:
- This is not a route/linkage regression in app logic.
- Remaining gate is operational auth/rate-limit/database-session conditions for admin login path.

Next exact retry command (after login rate-limit cooldown):
`$env:SMOKE_API_BASE_URL='https://almeaacodax-k2ux.onrender.com/api'; $env:SMOKE_ALLOW_PASSWORD_LOGIN='true'; $env:SMOKE_ADMIN_TOKEN='<fresh_admin_token>'; npm run smoke:operational`

## Do-not-touch areas
- No design refactor.
- No route/schema breaking changes.
- No unsafe deletion of historical docs.
- No `git add .`

## Next exact action for any new account
1. Read:
   - `PROJECT_STATUS.md`
   - `CODEX_HANDOFF.md`
   - `BATCH_136_ADMIN_USERS_SCHOOLS_PARENT_PAYMENT_DEEP_AUDIT_2026-05-24_AR.md`
   - this file `BATCH_137_FINAL_CLOSURE_EXECUTION_PLAN_2026-05-24_AR.md`
2. Run closure command set above.
3. Execute authenticated browser matrix.
4. Update docs and close BATCH 137 with evidence.
