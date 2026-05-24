# BATCH 148 - Final Delivery Deep Audit Plan (2026-05-24)

## Goal
- Make the platform ready for final delivery through deep runtime audit and minimal-risk fixes, while preserving current design, branding, layout, and UX direction.

## Non-Negotiable Rules
- No redesign, no theme replacement, no large refactor.
- Do not remove working features.
- Apply smallest safe fix only after root-cause verification.
- Retest every touched flow to prevent regression.
- Keep deployment compatibility for Vercel + Render.
- Use explicit git staging only (`git add <files>`, never `git add .`).

## Execution Phases
1. Discovery
- Read: `PROJECT_STATUS.md`, `docs/NEXT_SESSION_HANDOVER_AR.md`, `CODEX_HANDOFF.md`.
- Inspect stack, scripts, auth/roles, routes, API structure, env strategy, and existing smoke contracts.

2. Runtime Bring-Up
- Run frontend/backend locally (or verify production-first path when credentials are external).
- Resolve safe local blockers only (deps/env wiring/import/runtime crashes).

3. Browser Deep Audit (Integrated Browser)
- Test real runtime as user: navigation, forms, actions, filters, pagination, empty/loading/error/success states.
- Validate direct URL + refresh + back/forward behavior.

4. Role and Permission Matrix
- Cover roles present in code (admin/supervisor/teacher/student/parent/guest or discovered custom roles).
- Verify both UI guards and API authorization boundaries.

5. Feature and Linkage Sweep
- Focus on owner-reported risk areas:
  - users management actions and delete flow,
  - parent-student linking consistency,
  - schools/supervisors/class relationships,
  - student purchase -> admin approve -> unlock journey,
  - course player tabs/actions (`الوصف/المصادر/المناقشات` + favorite/share),
  - payment review actions and request approvals.

6. Verification and Regression
- Run required checks:
  - `npm run typecheck`
  - `npm run build`
  - `npm run smoke:health-readiness`
  - `npm run smoke:frontend:strict`
  - `npm run smoke:real-usage-readiness`
  - `npm run smoke:batch136-admin-users-schools-parent-payment`
  - `npm run smoke:operational` (when admin auth env is available)
- Revalidate fixed flows in browser after each important fix.

7. Delivery Closure
- Update:
  - `PROJECT_STATUS.md`
  - `docs/SPARK_BATCH_LEDGER_AR.md`
  - `docs/NEXT_SESSION_HANDOVER_AR.md`
  - `CODEX_HANDOFF.md`
- Include exact PASS/FAIL evidence, blockers, and next exact task.
- Publish cycle: GitHub push -> Vercel deploy -> Render trigger -> post-deploy smokes.

## Acceptance Criteria
- Core runtime flows work without critical blockers.
- Role boundaries hold at UI and API layers.
- No critical console/network/API regressions in tested routes.
- Design/theme/layout preserved (no unnecessary UI drift).
- Production deploy + strict/health smokes pass and are documented.
