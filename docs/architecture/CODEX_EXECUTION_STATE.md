# ALMEAA — Codex Execution State

- Current phase: Phase 5 assessment-data evolution — dual-write evidence is proven; controlled runtime integration remains pending
- Current batch: `5C-02` — design an opt-in, rollback-safe post-legacy mirror for eligible assigned/mock submissions only
- Current branch: `codex/assessment-data-evolution`
- Current HEAD: `2f383e3ab4c46163ccfce49800bdef1b6d618a09` (`test(assessments): prove dual-write recovery semantics`)
- Last completed code commit: `2f383e3a` (direct isolated proof of the idempotent persistence and reconciliation-repair primitives; still not imported by a production write route)
- Last remote delivery: pushed through `2f383e3a` to `origin/codex/assessment-data-evolution`; generated audit artifacts and ZIP exports remain intentionally excluded.
- Latest control-plane commits: `4f206b0f`, `31aeecbd`, `e0617d4e`
- Current gates: the automatic isolated-Mongo backend integration gate has passed for the additive models, definition reader, result reader, reconciliation fixture, and current direct dual-write proof (`33364720313`, `33365058231`, `33365337318`, `33365515059`, `33365711034`, `33365912688`, `33377161555`). The latest run proves legacy-success/new-failure containment, idempotent retry, response uniqueness, reconciliation detection, and repair without changing legacy data. Local `server:check`, integration-harness typecheck, and `smoke:quiz-integrity-guard` are PASS. Earlier full frontend and architecture evidence remains valid pre-Phase-5 but has not yet been rerun on `2f383e3a`; do not claim a complete Phase-5 gate from those earlier runs.
- Open blockers: no production route is connected to the new write primitive; a controlled eligibility and rollback policy is required before that changes. Production-scale certification is not proven; production secrets must be rotated outside the repository; self-service parent/student linking remains disabled until a verified-consent product decision is approved. None is silently treated as closed.
- Assessment test execution: `docs/architecture/ASSESSMENT_TEST_ROADMAP_AR.md` records the user-supplied acceptance matrix. The structural batch is closed; the isolated harness covers the normal directed journey, bounded cross-school/class rejection, a two-section mock journey, partial mock-definition preservation, duplicate-reference normalization, missing/invalid published-question rejection, teacher managed-question scope, and historical-result reads. Backend run `33337500677` and full-stack E2E run `33337500695` both passed on isolated Mongo at commit `55e0ea5d`. The remaining evidence is a focused UI mapping for the five named assessment journeys and a bounded scale validation; neither is a production-scale certification.
- Phase 5 decision: `docs/architecture/ASSESSMENT_DATA_EVOLUTION_DECISION_AR.md` records the current result/session boundary and the required additive migration protocol. No schema/backfill work is authorized until its product decisions are answered.
- Next exact action: establish a default-off, configuration-free-to-enable policy and a post-legacy-submission adapter restricted to assigned/mock assessments. It must preserve the existing 201 response when the mirror fails, retain diagnosable reconciliation evidence, and be covered by isolated HTTP tests before any rollout setting is enabled. Do not start a backfill, change scoring/RBAC/API contracts, or delete legacy records.
- Plan handoff: read `docs/architecture/FINAL_MASTER_PLAN_V3_AR.md` before any new work
- Files in next scope: `server/src/routes/quiz.routes.ts` create/update publish slices, `server/src/modules/quizzes/http/quizDefinitionSchema.ts`, and focused definition contracts
- Explicitly out of scope: database schema migration, RBAC changes, scoring/payment changes, route/API URL changes, broad frontend move, deleting legacy files
- Delivery rule: after each green Batch, update this file, create a focused commit, push, and refresh the latest ZIP without including secrets, `.env`, `.git`, dependencies, or build artifacts.

## Batch 2T-01 — Two-section mock assessment acceptance journey

- Scope: extended the existing isolated HTTP harness with a published, directed mock assessment containing two independently scored sections.
- Changed files: `server/src/scripts/backendIntegrationGate.ts`.
- Preserved contracts: all quiz routes and payload formats, persisted schemas, assignment/access policy, scoring, section-result response shape, and RBAC.
- Coverage: admin creates a second approved question and publishes a two-section mock; an outside student is rejected; the targeted student submits mixed answers; the stored result preserves mock snapshot and two per-section scores; admin reads section analytics.
- Tests: `smoke:reports-role` PASS 20/20; `smoke:quiz-access` PASS 18/18; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Gates blocked: the new HTTP journey has not run because local `server/node_modules` is incomplete and no isolated Mongo service was started; `server:check`/`server:build` therefore remain environment-blocked.
- Commit: `6c58ceb9` `test(assessment): cover two-section mock journey`.
- Push: not performed; no push or CI-dispatch authorization was supplied.
- Risks: route-level smoke contracts do not prove this journey at runtime; CI must run the isolated Mongo harness before it can count as acceptance evidence.
- Next exact action: manually dispatch the isolated backend CI gate (or authorize a push that triggers it), inspect the result, then proceed to the Playwright subset from the roadmap.

## Batch 2A-15 — Supervisor report scope resolver

- Scope: moved supervisor report-scope orchestration out of `quiz.routes.ts`; the route delegates to an application resolver, while GroupModel reads are isolated in a quizzes infrastructure adapter.
- Changed files: `server/src/modules/quizzes/application/quizSupervisorReportScope.ts`, `server/src/modules/quizzes/infrastructure/quizSupervisorScopeRepository.ts`, `server/src/routes/quiz.routes.ts`, and the focused reports-role smoke contract.
- Preserved contracts: all existing HTTP paths/methods, Group and User persistence semantics, school-wide versus class-only supervisor isolation, RBAC, scoring, and result/report response behavior.
- Tests: `smoke:reports-role` PASS 20/20; `smoke:quiz-access` PASS 18/18; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Gates blocked: `server:check` and `server:build` cannot locate local `tsc`; no API service or Mongo integration gate was started.
- Commit: `5ce8b0eb` `refactor(quizzes): isolate supervisor report scope resolver`.
- Push: not performed; no push authorization was supplied. This worktree is detached because `refactor/modular-platform-safe` is checked out by `C:/ALMEAA MAY - codax`; attach/cherry-pick this commit there before pushing.
- Risks: HTTP-level cross-school/cross-class rejection remains unproven locally without the isolated Mongo test environment.
- Next exact action: with authorization, attach `5ce8b0eb` to the safe branch and run the isolated backend CI gate; then add only bounded cross-school and cross-class rejection cases. Do not begin timer/session extraction or any schema/RBAC/scoring/route change.

## Batch 2A-16 — Role-bound report student scope

- Scope: extracted role-specific student filtering for quiz report read models from `quiz.routes.ts` into an injected application policy. The route still owns UserModel querying, projection, ordering, limit, and count.
- Changed files: `server/src/modules/quizzes/application/quizReportStudentScope.ts`, `server/src/routes/quiz.routes.ts`, and `scripts/smoke-reports-role-contract.mjs`.
- Preserved contracts: all report endpoints and response fields, admin full scope, teacher/supervisor group and school scope, class-only supervisor isolation, parent linked-child scope, self-student fallback, managed path/subject filtering, RBAC, scoring, and persistence semantics.
- Tests: `smoke:reports-role` PASS 20/20; `smoke:quiz-access` PASS 18/18; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Gates blocked: `server:check` cannot locate local `tsc`; no API service or Mongo integration gate was started.
- Commit: `7b66c16f` `refactor(reports): isolate role-bound student scope`.
- Push: not performed. This worktree remains detached because `refactor/modular-platform-safe` is checked out by `C:/ALMEAA MAY - codax`; attach/cherry-pick `5ce8b0eb`, `031fd755`, and `7b66c16f` there before pushing.
- Risks: runtime HTTP rejection evidence for cross-school and cross-class attempts remains pending the isolated Mongo test environment.
- Next exact action: with authorization, attach the pending commits to the safe branch and run the isolated backend CI gate; then add only bounded cross-school and cross-class rejection cases. Do not begin timer/session extraction or any schema/RBAC/scoring/route change.

## Batch 2A-18 — Consistent attempt-gap read-model use

- Scope: replaced the two remaining analytics references to the former local `buildAttemptGaps` converter with `buildQuizReportAttemptGaps`.
- Changed files: `server/src/routes/quiz.routes.ts` and `scripts/smoke-reports-role-contract.mjs`.
- Preserved contracts: analytics endpoint URL and response fields, question-attempt skill/subject/section enrichment, mastery calculation, evidence threshold, role scopes, RBAC, scoring, and Mongo schema.
- Tests: `smoke:reports-role` PASS 20/20; `smoke:quiz-access` PASS 18/18; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Gates blocked: server TypeScript check/build remain unavailable because local `tsc` is absent; no API service or Mongo integration gate was started.
- Commit: `3894ee46` `fix(reports): use extracted attempt gap read model`.
- Push: not performed. This worktree remains detached; attach/cherry-pick pending commits onto `refactor/modular-platform-safe` from its owning worktree before pushing.
- Risks: cross-school/cross-class HTTP rejection evidence remains pending the isolated Mongo test environment.
- Next exact action: with authorization, attach the pending commits to the safe branch and run the isolated backend CI gate; then add only bounded cross-school and cross-class rejection cases. Do not begin timer/session extraction or any schema/RBAC/scoring/route change.

## Batch 2A-17 — Question-attempt gap read model

- Scope: moved the conversion of persisted `QuestionAttempt` skill references into the analytics gap read model out of `quiz.routes.ts`.
- Changed files: `server/src/modules/quizzes/application/quizReportAttemptGaps.ts`, `server/src/routes/quiz.routes.ts`, and `scripts/smoke-reports-role-contract.mjs`.
- Preserved contracts: report endpoint URL and response shape, preloaded skill/subject/section lookup behavior, mastery calculation (`100` for correct and `0` for incorrect), evidence thresholds, role scope, RBAC, scoring, and persistence semantics.
- Tests: `smoke:reports-role` PASS 20/20; `smoke:quiz-access` PASS 18/18; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Gates blocked: server TypeScript check/build remain unavailable because local `tsc` is absent; no API service or Mongo integration gate was started.
- Commit: `af27eba8` `refactor(reports): extract question attempt gap read model`.
- Push: not performed. This worktree remains detached; attach/cherry-pick the pending commits onto `refactor/modular-platform-safe` from its owning worktree before pushing.
- Risks: runtime HTTP rejection evidence for cross-school and cross-class attempts remains pending the isolated Mongo test environment.
- Next exact action: with authorization, attach the pending commits to the safe branch and run the isolated backend CI gate; then add only bounded cross-school and cross-class rejection cases. Do not begin timer/session extraction or any schema/RBAC/scoring/route change.

## Batch 2A-19 — Cross-school directed assessment rejection

- Scope: added an isolated outside-school student fixture and HTTP rejection case proving a school supervisor cannot direct an assessment to that student; the existing sibling-class rejection remains as the class-level counterpart.
- Changed files: `server/src/scripts/backendIntegrationGate.ts` and `scripts/smoke-assessment-directed-scope-contract.mjs`.
- Preserved contracts: existing `/quizzes` POST path and payload, supervisor role policy, class/school scope semantics, scoring, Mongo schema, and all production data.
- Tests: `smoke:assessment-directed-scope` PASS 4/4; `smoke:reports-role` PASS 20/20; `smoke:quiz-access` PASS 18/18; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Runtime evidence: deferred; no API service, Mongo instance, CI gate, or production system was started.
- Commit: `73d8b5ff` `test(assessments): cover cross-school directed scope rejection`.
- Push: not performed.
- Risks: the new HTTP assertion is a harness case until it passes against its required isolated Mongo environment; server TypeScript check/build remain unavailable locally because `tsc` is absent.
- Next exact action: authorize and run the isolated backend CI gate, inspect its result, then continue the next bounded acceptance case from the roadmap.

## Batch 2T-02 — Partial mock-definition update preservation

- Scope: extended the isolated HTTP harness so a title-only admin PATCH of the published two-section mock preserves its settings, mock enablement, sections, and selected section questions.
- Changed files: `server/src/scripts/backendIntegrationGate.ts` and `scripts/smoke-assessment-update-document-contract.mjs`.
- Preserved contracts: existing `/quizzes/:id` PATCH path and payload, admin authorization, publication/integrity policy, settings, mock schema, question selection, score semantics, and production data.
- Tests: `smoke:assessment-update-document` PASS 5/5; `smoke:assessment-directed-scope` PASS 4/4; `smoke:reports-role` PASS 20/20; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Runtime evidence: deferred; no API service, Mongo instance, CI gate, or production system was started.
- Commit: `6c141111` `test(assessments): preserve mock definition on partial update`.
- Push: not performed.
- Risks: the new assertion remains a harness case until it passes on the isolated Mongo gate; local server TypeScript check/build remain unavailable because `tsc` is absent.
- Next exact action: authorize and run the isolated backend CI gate, inspect its result, then continue the next bounded acceptance case from the roadmap.

## Batch 2T-03 — Missing published-question rejection

- Scope: added an isolated HTTP harness case for a published assessment that references a missing question; it must return `400`, report the missing ID, and leave no quiz document persisted.
- Changed files: `server/src/scripts/backendIntegrationGate.ts` and `scripts/smoke-assessment-question-selection-contract.mjs`.
- Preserved contracts: existing `/quizzes` POST path and payload, publication/integrity policy, question ownership and selection, directed audience semantics, RBAC, Mongo schema, scoring, and production data.
- Tests: `smoke:assessment-question-selection` PASS 7/7; `smoke:quiz-integrity-guard` PASS 4/4; `smoke:assessment-directed-scope` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Runtime evidence: deferred; no API service, Mongo instance, CI gate, or production system was started.
- Commit: `33447aee` `test(assessments): reject missing published question references`.
- Push: not performed.
- Risks: the assertion remains a harness case until it passes on the isolated Mongo gate; local server TypeScript check/build remain unavailable because `tsc` is absent.
- Next exact action: authorize and run the isolated backend CI gate, inspect its result, then continue the next bounded acceptance case from the roadmap.

## Batch 2T-04 — Invalid published-question content rejection

- Scope: added an isolated HTTP harness case for an existing legacy-style question record whose content is unusable for an MCQ assessment; publishing a quiz that references it must return `400`, report the invalid ID, and leave no quiz document persisted.
- Changed files: `server/src/scripts/backendIntegrationGate.ts` and `scripts/smoke-assessment-question-selection-contract.mjs`.
- Preserved contracts: existing `/quizzes` POST path and payload, publication/integrity policy, question ownership and selection, directed audience semantics, RBAC, Mongo schema, scoring, and production data.
- Tests: `smoke:assessment-question-selection` PASS 9/9; `smoke:quiz-integrity-guard` PASS 4/4; `smoke:assessment-directed-scope` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Runtime evidence: deferred; no API service, Mongo instance, CI gate, or production system was started.
- Commit: `a5956306` `test(assessments): reject invalid published question content`.
- Push: pending the paired documentation commit.
- Risks: the assertion remains a harness case until it passes on the isolated Mongo gate; local server TypeScript check/build remain unavailable because `tsc` is absent.
- Next exact action: inspect the isolated backend CI gate configuration and run it only if it uses an isolated Mongo dependency; otherwise continue the next bounded acceptance case without starting production-connected services.

## Batch 2T-05 — Duplicate published-question reference normalization

- Scope: normalized root `questionIds` in the pure quiz-create document builder and added an isolated HTTP harness case proving a published definition with the same question reference twice stores one canonical reference.
- Changed files: `server/src/modules/quizzes/application/quizDefinitionDocument.ts`, `server/src/scripts/backendIntegrationGate.ts`, `scripts/smoke-assessment-definition-document-contract.mjs`, and `scripts/smoke-assessment-question-selection-contract.mjs`.
- Preserved contracts: existing `/quizzes` POST path and payload, response shape, publication/integrity policy, question selection, RBAC, Mongo schema, scoring, and production data. Duplicate references now preserve the intended single-question semantics rather than changing scoring or question content.
- Tests: `smoke:assessment-definition-document` PASS 5/5; `smoke:assessment-question-selection` PASS 10/10; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Runtime evidence: deferred; no API service, Mongo instance, CI gate, or production system was started.
- Commit: `173c2bd8` `test(assessments): normalize duplicate question references`.
- Push: pending the paired documentation commit.
- Risks: the HTTP assertion remains a harness case until it passes on the isolated Mongo gate; local server TypeScript check/build remain unavailable because `tsc` is absent.
- Next exact action: cover owner-scope rejection for question references only after proving the existing ownership policy on the route; do not change its RBAC or persistence semantics speculatively.

## Batch 2T-06 — Teacher question managed-scope coverage

- Scope: added isolated HTTP harness coverage showing a teacher can create a question inside the configured path/subject scope with the existing pending-review workflow, and is rejected outside that scope.
- Changed files: `server/src/scripts/backendIntegrationGate.ts`.
- Preserved contracts: existing `/quizzes/questions` POST route and payload, teacher managed-content policy, approval workflow, RBAC, Mongo schema, and production data.
- Tests: `smoke:assessment-question-selection` PASS 10/10; `smoke:quiz-integrity-guard` PASS 4/4; `smoke:quiz-access` PASS 18/18; architecture gate PASS; `git diff --check` PASS.
- Runtime evidence: deferred; no API service, Mongo instance, CI gate, or production system was started.
- Commit: `7a0efb99` `test(assessments): cover teacher question scope`.
- Push: pending the paired documentation commit.
- Next exact action: add an ownership-reference case only after a product-compatible policy is identified; do not invent a new question-to-quiz ownership restriction.

## Batch 2T-07 — Parent-link fail-closed runtime correction

- Scope: corrected parent link, unlink, and linked-student read handlers to use the established authenticated-user context, preserving the existing fail-closed guardianship policy.
- Changed files: `server/src/routes/auth.routes.ts`.
- Preserved contracts: parent-link URLs and methods, the `403` denial for self-service linking without verified consent, administrator-managed linking, RBAC, Mongo schema, and production data.
- Tests: `smoke:auth-login-security` PASS 9/9; `smoke:api-security` PASS 6/6; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Runtime evidence: isolated CI run `33336538458` executed the real HTTP assessment suite and exposed the prior `500`; the fix awaits its next automatic isolated Mongo run after this push. No local API, Mongo instance, or production system was started.
- Commit: `00caa945` `fix(auth): fail closed for parent student linking`.
- Push: pending the paired documentation commit.
- Next exact action: inspect the automatic isolated CI result for this commit; if green, record it as runtime evidence for the assessment roadmap and then continue the deferred E2E design without using production accounts.

## Batch 2T-08 — Teacher question fixture contract correction

- Scope: completed the teacher question fixture with its required skill reference so the isolated HTTP journey reaches managed-scope authorization rather than schema rejection.
- Changed files: `server/src/scripts/backendIntegrationGate.ts`.
- Preserved contracts: question API schema, teacher managed-content policy, approval workflow, RBAC, Mongo schema, and production data.
- Tests: `smoke:auth-login-security` PASS 9/9; `smoke:api-security` PASS 6/6; `smoke:assessment-question-selection` PASS 10/10; `git diff --check` PASS.
- Runtime evidence: the automatic isolated Mongo CI run is pending after this push; no local API, Mongo instance, or production system was started.
- Commit: `15fa3b95` `test(assessments): satisfy teacher question fixture contract`.
- Push: code pushed; documentation commit pending.
- Next exact action: inspect the isolated CI result and record the real HTTP status before extending the acceptance matrix.

## Batch 2T-09 — Isolated HTTP acceptance evidence

- Scope: ran the existing GitHub Actions backend integration gate automatically on the safe branch; it installed dependencies, typechecked and built the API, started the exact branch API, and executed the real HTTP suite against a temporary Mongo service.
- Evidence: workflow run `33336856128` passed on commit `038544cc`; its assessment paths covered normal directed submission/repeat rejection, missing/invalid/duplicate question handling, two-section mock submission and partial update, teacher managed scope, and school/class audience isolation.
- Constraints: the runner generated ephemeral CI secrets and used only `mongodb://127.0.0.1` in the CI container; no production credentials, API, database, or local service were used.
- Remaining work: roadmap Playwright journeys, historical-result compatibility evidence, scale testing, and only product-approved ownership-policy changes.

## Batch 2T-10 — Safe-branch isolated E2E eligibility

- Scope: enabled the existing deep full-stack E2E workflow for `refactor/modular-platform-safe`.
- Changed files: `.github/workflows/platform-v3-deep-premerge-e2e-gate.yml`.
- Preserved contracts: no application route, RBAC, schema, or production deployment behavior changed.
- Evidence: the workflow uses temporary Mongo, starts the exact branch API/frontend in CI, and runs its Playwright-backed UI audits without production writes.
- Tests: architecture gate PASS; `git diff --check` PASS.
- Commit: `5e30cfe4` `ci(assessment): run isolated E2E gate on safe branch`.
- Next exact action: inspect the automatic deep E2E result and classify any failing journey against the roadmap.

## Batch 2T-11 — Full-stack E2E acceptance evidence

- Scope: the safe-branch deep E2E gate completed on isolated Mongo, API, frontend, and Chromium.
- Evidence: GitHub Actions run `33337019142` passed for commit `1c4f9478`, including operational API journeys, public UI, desktop/mobile role pages, question-editor, supervisor-school, school CRUD, and public-test journeys.
- Constraints: all accounts and credentials were ephemeral and masked in CI; production services and local services were not used.
- Remaining scope: the assessment roadmap still requires focused historical-result compatibility evidence and scale certification; this run is strong E2E evidence, not a substitute for those distinct requirements.

## Batch 2T-12 — Historical result read compatibility

- Scope: added an isolated HTTP fixture representing an older result without snapshot or mock-section fields, and verified the student results endpoint preserves its legacy score, time, and quiz identity.
- Changed files: `server/src/scripts/backendIntegrationGate.ts`.
- Preserved contracts: result API URL and response semantics, student RBAC, Mongo schema, scoring, and production data. No migration or backfill was added.
- Tests: `smoke:quiz-integrity-guard` PASS 4/4; `smoke:assessment-question-selection` PASS 10/10; `git diff --check` PASS.
- Runtime evidence: backend run `33337500677` and the companion full-stack run `33337500695` passed on isolated Mongo at commit `55e0ea5d`; the historical-result case therefore has real HTTP acceptance evidence.
- Commit: `a6cc1dba` `test(reports): preserve historical quiz result reads`.
- Next exact action: scope and run bounded scale evidence without claiming production-scale certification.

## Batch 2T-13 — Historical compatibility CI confirmation

- Scope: reconciled the acceptance ledger with the automatic CI runs after the historical-result fixture and report-scope update.
- Evidence: `Platform V3 Backend Integration Gate` run `33337500677` and `Platform V3 Deep Pre-Merge E2E Gate` run `33337500695` both succeeded for `55e0ea5d` on temporary Mongo, exact-branch API/frontend, and masked ephemeral credentials.
- Result: the historical result endpoint preserves legacy score, duration, and quiz identity without requiring a snapshot or mock section fields. This closes the historical-read evidence item in the assessment roadmap.
- Limits: the broad E2E gate is evidence for the isolated stack, but it does not by itself label each of the five roadmap UI journeys; production-scale capacity remains unproven.
- Next exact action: add bounded isolated scale validation and a focused UI-to-roadmap evidence map; do not use production credentials, databases, or load targets.

## Batch 2T-14 — Release candidate evidence and freeze

- Frozen runtime head: `e92ba9c8c07f3958c3b0285aa0daad78834e17c4`.
- Evidence: Backend Integration `33355971164`, Deep E2E `33355971110`, Production Readiness `33355971089`, and Dependency Audit `33355789094` all succeeded on the safe branch. Deep E2E includes the bounded isolated read-scale validation.
- Compare: `main` at `e0617d4e` is an ancestor; architecture and module-boundary gates passed with routes/API/env contracts, zero unresolved runtime imports, and zero cycles preserved.
- Freeze: `MODULAR_PLATFORM_RELEASE_CANDIDATE_FREEZE_AR.md` records the policy and limits. No PR or merge was created automatically.
- Next exact action: await explicit merge approval only.

## Batch RC-01 — Release-candidate documentation hygiene

- Scope: removed whitespace-only errors from the assessment and schools evidence documents during the final candidate comparison.
- Changed files: `docs/architecture/SCHOOLS_RBAC_AUDIT_AR.md`, `docs/assessment-refactor-progress.md`, and `docs/assessment-system-code-audit.md`.
- Preserved contracts: runtime code, routes, API payloads, schemas, RBAC, scoring, configuration, and CI workflows are untouched.
- Tests: `git diff --check` PASS for the working-tree batch; the previously frozen CI evidence remains unchanged because this batch is documentation-only.
- Gates: no runtime gate rerun is required for this whitespace-only documentation correction; final PR/merge remains subject to the frozen candidate evidence.
- Commit: `c0939874` `docs(release): clean candidate evidence formatting`.
- Push: pending explicit release delivery.
- Risks: no functional behavior was altered.
- Next exact action: commit this documentation-only correction, push the release-candidate branch, create the approved PR, and merge after the final compare.

## Batch 5A-01 — Additive assessment evolution foundation

- Scope: recorded the delegated product decisions for Phase 5 and introduced isolated persistence models for immutable versions, assignments, server-owned attempts, saved responses, and finalized results.
- Changed files: `docs/architecture/ASSESSMENT_DATA_EVOLUTION_DECISION_AR.md` and `server/src/modules/quizzes/infrastructure/assessment{Version,Assignment,Attempt,Response,Result}Model.ts`.
- Preserved contracts: no route, API payload, legacy `QuizResult` read/write, `LiveExamSession`, schema migration, backfill, RBAC, scoring, or frontend behavior changed. The new models are not imported by a production request path.
- Tests: `server:check`, `server:build`, root `typecheck`, root `build`, `repository-audit`, `architecture-gate`, `smoke:route-loading`, `smoke:runtime-source`, `smoke:quiz-integrity-guard`, `smoke:auth-login-security`, `smoke:api-security`, `smoke:rbac-school-scope`, and `git diff --check` PASS.
- Gates: isolated-Mongo additive migration dry run is intentionally pending. It is mandatory before any adapter, dual-write, backfill, or live reader work; no production or shared database was contacted.
- Commit: `68c446bc` `feat(assessments): add additive evolution models`.
- Push: pending.
- Risks: the models alone are deliberately inert until an adapter is designed and verified; this prevents a partial migration from changing learner behavior.
- Next exact action: run the additive model/index dry run on a disposable Mongo database, then introduce a compatibility adapter with legacy fallback in a separate batch.

## Batch 5A-02 — Isolated additive index dry run

- Scope: extended the existing isolated-Mongo backend integration harness to create the new assessment-model indexes and assert their compound uniqueness before its HTTP journeys run.
- Changed files: `server/src/scripts/backendIntegrationGate.ts`.
- Preserved contracts: the harness only calls `createIndexes()` after its local-CI Mongo guard passes. It creates no assessment documents and changes no API route, legacy read/write path, live session, RBAC, scoring, or production data.
- Tests: integration-harness TypeScript check, `server:check`, and `git diff --check` PASS locally.
- Gates: CI execution is pending. The harness refuses any Mongo URI except its disposable localhost CI database; no local Mongo/Docker runtime exists in this workspace.
- Commit: `b6e10fc1` `test(assessments): dry run additive indexes in CI`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: actual index behavior is not declared verified until the isolated CI run passes on this exact commit.
- Next exact action: a repository administrator must dispatch `Platform V3 Backend Integration Gate` for `codex/assessment-data-evolution` (or grant Actions dispatch permission to the authenticated account). The current `gh workflow run` request was rejected with `403 Must have admin rights to Repository`; inspect the successful run before beginning any adapter.

## Batch 5A-03 — Automatic isolated-CI trigger

- Scope: allowed the existing backend integration workflow to run automatically on pushes to the Phase 5 branch, avoiding the unavailable manual-dispatch permission.
- Changed files: `.github/workflows/platform-v3-backend-integration-gate.yml`.
- Preserved contracts: no runtime code, API, database, RBAC, scoring, production deployment, or workflow job definition changed; only the push branch allowlist gained this explicitly named development branch.
- Tests: `git diff --check` PASS.
- Gates: pending automatic GitHub Actions run after push. The same job still provisions its own Mongo 7 service and uses a locally guarded disposable database name.
- Commit: pending.
- Push: pending.
- Risks: success remains unproven until the exact commit's isolated workflow completes.
- Next exact action: push this trigger update, wait for the generated Actions run, and record its exact result before beginning the compatibility adapter.

## Batch 5B-01 — Versioned definition read adapter

- Scope: added a definition-read adapter for `GET /api/quizzes/:id`. It uses the latest immutable published version when present and returns the complete legacy quiz document unchanged when none exists.
- Changed files: `server/src/modules/quizzes/application/assessmentDefinitionReadAdapter.ts`, `server/src/modules/quizzes/infrastructure/assessmentVersionRepository.ts`, `server/src/routes/quiz.routes.ts`, and `server/src/scripts/backendIntegrationGate.ts`.
- Preserved contracts: HTTP path/method/response identity, legacy question lookup and learner sanitization, `QuizResult`, submission/scoring, RBAC, Mongo schema semantics, and all write paths. No version is written by any production route in this batch.
- Tests: `server:check`, integration-harness TypeScript check, and `git diff --check` PASS locally. The harness now verifies that an isolated immutable version overrides only its definition while retaining the assessment ID and legacy questions.
- Gates: `Platform V3 Backend Integration Gate` run `33365058231` PASS on `dc15f04f` with Mongo 7, API build, harness typecheck, ready API, and real HTTP journey all green.
- Commit: `dc15f04f` `feat(assessments): read immutable definition versions`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: result-read fallback, version creation, and dual-write remain separate batches; this adapter is read-only and falls back to the legacy document.
- Next exact action: add the matching result-read adapter with legacy fallback before considering dual-write.

## Batch 5B-02 — Result compatibility read adapter

- Scope: detail reads can consume an optional `AssessmentResult.compatibilityProjection` linked to a legacy result while preserving legacy identity and owner authorization; absent projection falls back exactly to `QuizResult`.
- Changed files: assessment-result model, result read adapter/repository, and `quizResults.routes.ts`.
- Tests: `server:check` and `git diff --check` PASS locally.
- Gates: pending isolated HTTP CI.
- Next exact action: push and verify the isolated run before designing dual-write.

## Batch 5B-03 — Result-reader CI confirmation and reconciliation evidence

- Scope: verified the result compatibility projection through the isolated HTTP harness and added a pure parity detector for linked legacy and additive results.
- Changed files: `assessmentResultReadAdapter`, `assessmentResultRepository`, `quizResults.routes.ts`, `assessmentResultReconciliation.ts`, and the isolated harness.
- Preserved contracts: result detail URL/shape and owner authorization remain legacy-compatible; no submission write path, RBAC, scoring, or legacy document changed.
- Tests: `Platform V3 Backend Integration Gate` `33365337318` (reader) and `33365711034` (parity fixture) PASS on isolated Mongo.
- Commit: `59be802d`, `bbd2d916`, and `717f5b0b`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: this proves only a linked compatibility projection and fixture parity; it is not a backfill or runtime dual-write.
- Next exact action: prove the inert writer's success and failure recovery before route integration.

## Batch 5C-01 — Dual-write recovery semantics on isolated Mongo

- Scope: added direct isolated-Mongo proof for the inert post-legacy mirror: success, idempotent retry, response uniqueness, failure after a successful legacy result, retry repair, divergence detection, and reconciliation repair.
- Changed files: `dualWriteAssessmentSubmission.ts`, `assessmentResultReconciliation.ts`, and `backendIntegrationGate.ts`.
- Preserved contracts: `POST /api/quizzes/:id/submit` does not import the primitive; its scoring, RBAC, legacy `QuizResult` write, status code, and response are unchanged. The repair updates only the additive result projection and never mutates `QuizResult`, attempt ownership, assignment, or version.
- Tests: local `server:check`, isolated harness typecheck, `smoke:quiz-integrity-guard` 4/4, and `Platform V3 Backend Integration Gate` `33377161555` PASS (Mongo 7, API build, real HTTP server and suite).
- Commit: `2f383e3a` `test(assessments): prove dual-write recovery semantics`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: production routing remains deliberately absent. The next batch needs an explicitly default-off eligibility/rollback policy and an HTTP proof that mirror failure does not replace a successful legacy 201 response.
- Next exact action: implement and test the controlled post-legacy mirror for eligible assigned/mock assessments only; do not enable it in any environment, backfill, cut over reads, or delete legacy data.

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

تم تثبيت Control Plane في `4f206b0f` ثم تحديثه في `e0617d4e`. أُنجز P0-00 في `81aaee59`، وP0-01 في `3150eb67`، وP0-02 في `0172947a`. أُنجز P0-03A في `f14a9576`، وP0-03B في `057dee2a` بإضافة scope تشغيلي لـcontent bootstrap تستخدمه شاشة إدارة المدارس لتجنب تحميل topics/lessons/library غير المطلوبة، وP0-03C في `8620b20b` باستخدام `.lean()` في قراءات العمليات الإدارية، وP0-03D في `082ab527` بإضافة `phase=compact` لمسار الطالب. أُنجز P0-04 في `71875c15`، ثم أُصلح عقد البيئة في `7f6e2e60` بحيث يستخدم benchmark arguments صريحة ولا يضيف مفاتيح بيئة جديدة؛ architecture gate عاد PASS. في Phase 2A نُقلت آثار تسليم الاختبار إلى application boundary في `5bf30491`، ثم نُقل تحقق سلامة أسئلة الاختبار في `2f8a3170`، ونُقل تطبيع placement في `b10b9081`، واكتمل عزل اختيار الأسئلة وحل مهاراتها في `3651e0ec`، واكتمل عزل workflow defaults وتطهير تحديثات النشر في `7dd90ec5`، واكتمل عزل سياسة قرار النشر في `ca632e5a`، واكتمل عزل إنشاء الأسئلة المضمنة مع إبقاء محول قاعدة البيانات داخل route في `8c0b81cc`، واكتمل عزل تركيب مستند إنشاء الاختبار في `3432aa59`، واكتمل عزل تركيب مستند تحديث الاختبار في `3014a2c4`، واكتمل عزل تركيب حالة الاختبار للتحقق في `a2db9f33`، واكتمل عزل تركيب مستند QuestionAttempt في `81d3df1e`، واكتملت أدوات سياق المحاولة في `756b6f87`، واكتمل حل وترتيب أسئلة الإرسال في `2A-13`. في `2A-14` فُصلت مراجعة الإجابات، ملخص الدرجة، تحليل المهارات، نتائج أقسام المحاكاة، لقطة الاختبار، ووثيقة نتيجة الإرسال خلف وحدات تطبيقية نقية؛ وبقيت صلاحية الإرسال، الاستعلامات، الحفظ، ومعالجة التعارض والـside effects في route. بقي scoring وschema وRBAC وURLs/API contracts دون تغيير، ولا تزال أرقام التوسع الإنتاجية غير مثبتة.
