# ALMEAA — Codex Execution State

- Current phase: Product Delivery Gate 2 — Subject Learning Space Boundary (CLOSED)
- Primary execution plan: `docs/architecture/CHAT_EXECUTION_GOALS_AR.md` — Sellable Strong MVP → Prove Real Use → Improve and Scale. `FINAL_MASTER_PLAN_V3_AR.md` remains the product/architecture reference.
- Permanent delivery rule: `AGENTS.md` now requires product-value filtering, bounded goal scope, local gates, focused commit/push, remote CI on the exact commit, documentation/evidence update, and a commercial completion report before moving to the next goal.
- Current batch: Gate 2 closed; student and manager journeys VERIFIED on isolated UI/API/DB evidence
- Role & Scope Contract: APPROVED (documentation baseline) before Product Gate 3. Existing five roles remain; scope/capabilities govern Teacher and Supervisor behavior. No role migration, new roles, or Permissions Engine is authorized in this phase.
- Product Gate 3 entry: ACTIVE implementation. First vertical slice is Admin school setup/access followed by Supervisor scoped assessment/learning follow-up; current batches are recorded below.
- Product Gate 3 Batch 1 — Teacher school-operations boundary: `PARTIAL`. Group CRUD (`/content/groups`) is now restricted to Admin/Supervisor; Teacher cannot create, update, or delete school/class groups. This preserves Teacher Content Scope and prevents implicit Supervisor elevation. Focused contract smoke passed 9/9. Teacher assignment as a separate School Scope and end-to-end Learning Access consumption remain the next real gaps; no role/schema/API shape was added.
- Product Gate 3 Batch 2 — Learning Access boundary: `PARTIAL`. School package quiz access now requires an active user-specific `AccessGrant` linked to an active school package and matching content/path/subject scope; school membership alone no longer unlocks every package. Focused school and quiz integrity smokes passed (27/27 and 4/4). Student redemption remains the supported grant path; full UI student consumption evidence is the next gap.
- Product Gate 3 Batch 3 — Student access guard alignment: `PARTIAL`. The frontend `hasScopedPackageAccess` guard no longer infers package entitlement from school membership; it now relies on premium, purchased package, or purchased public-path entitlement, matching the server's user-specific grant boundary. School-management contract smoke passed 28/28 and quiz-integrity smoke 4/4. Full Admin-to-student live consumption evidence remains the next gap.
- Product Gate 3 Batch 4 — Explicit Teacher school-scope assignment: `PARTIAL`. School relations import now accepts separate `teacherEmail/teacherName`, creates or links Teacher accounts, assigns their `schoolId/groupIds` scope, and never writes them into `supervisorIds`; legacy teacher-as-supervisor header aliases were removed. Relation boundary smoke, school-management contract smoke (29/29), and server typecheck passed. Live end-to-end Teacher assignment evidence remains pending.
- Product Gate 3 Batch 5 — Direct Teacher class-scope assignment: `PARTIAL`. School class cards now expose assign/remove teacher controls. The existing `updateAdminUser` contract persists only `schoolId/groupIds`; the Teacher role is enforced in the store action and no `supervisorIds` mutation or new schema/API was introduced. School-management contract smoke passed 30/30, RBAC school-scope smoke 4/4, quiz-integrity smoke 4/4, server check passed, and frontend production build passed. Backend Integration CI [33856879372](https://github.com/nasef6464/almeaacodax/actions/runs/33856879372) passed on exact commit `450465ea`; Deep Pre-Merge E2E [33856879312](https://github.com/nasef6464/almeaacodax/actions/runs/33856879312) is still in progress at the dependency-install step. Live deployed-role evidence remains pending.
- Supervisor Portal verification correction: `VERIFIED` at contract level. The auth-hydration smoke now matches the implemented fallback chain (`backendUser → sessionUser → existing`) and the full School Portal contract passes 16/16; no runtime behavior changed.
- Supervisor directed-assessment evidence hook: `PARTIAL`. The existing School Portal "اختبار موجه" action now has a stable `supervisor-create-directed-assessment` selector for action-level UI proof; behavior and route/API contracts are unchanged. Targeted contract smoke passes 16/16. Deep action execution remains to be proven on the isolated full-stack gate.
- Supervisor action navigation proof: `PARTIAL`. The live supervisor audit now clicks the directed-assessment control and verifies navigation to `tab=quizzes`; syntax and School Portal contract checks pass. Commit `7e14a59c` is pushed; the currently running Deep/Backend jobs remain tied to the preceding exact runtime commit and must reach a terminal result before this evidence is promoted.
- CI dependency-install guard: `PARTIAL`. Added 10-minute timeouts to frontend/API `npm ci` steps in both required gates (`8311be54`) so a dependency service stall becomes an observable terminal failure instead of an indefinite run. Queued runs `33858307711` (Deep) and `33858307404` (Backend) target that commit; no product behavior changed.
- Gate 3 TypeScript wiring correction: `VERIFIED` locally. Restored the existing teacher assignment handlers at the `SchoolClassesPanel` call site and aligned `RelationImportSummary.missingTeachers` with the server response (`9adfcc05`). Typecheck and targeted school-management/portal contracts pass; Deep/Backend CI is running on this exact head.
- Current branch: `codex/assessment-data-evolution`
- Current implementation HEAD: `9adfcc05` (`fix(schools): restore teacher assignment type wiring`)
- Branch relation: runtime HEAD is pushed and verified by Backend Integration [33688377700](https://github.com/nasef6464/almeaacodax/actions/runs/33688377700) and Deep Pre-Merge E2E [33688377731](https://github.com/nasef6464/almeaacodax/actions/runs/33688377731). The latter passed every isolated full-stack suite, including normal/directed Assessment and mock resume/retry. The CI-only global limit prevents one loopback audit from masking later suites; production defaults and runtime policy are unchanged. Existing generated audit modifications and ZIP/text files are excluded from this batch.
- Last completed Phase 5 code commits: `df6fe6d9` adds the final direct-result surface (`/quizzes/results/latest`); `ff3e0f67` adds bounded reads to legacy direct list routes; `3030cb8b` adds bounded compatible list reads; `7be63b94` adds the reversible per-assessment reader control. Phase 5 is closed at the documented safe boundary; legacy result reporting aggregates intentionally remain legacy.
- Last implementation delivery: `f40d957f` extracted one-time school roster bootstrap/refresh ownership from `SchoolsManager.tsx` into `useSchoolRosterBootstrap`; `b8bf7ca3` extracted selected-school server verification into `useSchoolWorkspaceRefresh`; `a0186e23` restored a payload type still required by the school-deletion refresh; `32c340e5` makes relation imports single-flight in the UI and removes dead local state; `ad1d8d08` moves the four existing supervisor/student assignment and removal actions into `schoolRosterAssignmentActions`; `0dcde80f` accepts the existing refresh result type without changing behavior; `c3b6dc37` stabilizes the unrelated Barcode mobile audit around its stronger selector/control contract; `1be5f6c6` moves selected-school class creation/deletion orchestration into `schoolClassLifecycleActions`; `26580a41` moves package create/update/delete/expire-all orchestration into `schoolPackageActions`; `3ffc7118` moves the class rename persistence callback into `schoolClassLifecycleActions`; and `8fb2bbb6` moves school-wide and class-scoped supervisor removal confirmations into `schoolRosterAssignmentActions`. `d0b4c7f4` bounded every remaining deep CI journey. All are pushed to `origin/codex/assessment-data-evolution`. Isolated backend CI `33464627707` and deep full-stack E2E CI `33464627717` both succeeded on `8fb2bbb6`; the latter proves bounded Chromium, scale, public, role-page, question-editor, supervisor-school, school-CRUD, and Barcode desktop/mobile journeys. Generated audit artifacts and ZIP exports remain intentionally excluded.
- Latest school checkpoint: `26f615e1` moves bulk class creation orchestration into `schoolClassLifecycleActions` while preserving UI/API behavior. Backend Integration CI `33465513158` and Deep Pre-Merge E2E CI `33465513152` both succeeded on that exact HEAD. This closes the current implementation checkpoint; it does not by itself make the full School MVP `VERIFIED`.
- Latest control-plane commits: `4f206b0f`, `31aeecbd`, `e0617d4e`
- Current gates: the automatic isolated-Mongo backend integration gate has passed for the additive models, definition reader, result reader, reconciliation fixture, direct dual-write recovery proof, controlled runtime mirror, bounded reconciliation, read-only inventory, result-only backfill, rollback to legacy, and every direct result surface (`33364720313`, `33365058231`, `33365337318`, `33365515059`, `33365711034`, `33365912688`, `33377161555`, `33377661059`, `33377975143`, `33378321696`, `33407725338`, `33408950515`, `33409276297`, `33411114387`, `33411718907`, `33412140613`, `33413330281`, `33436942341`, `33437577025`, `33439284856`, `33439883472`, `33441314567`, `33441596251`, `33442530413`, `33460232085`, `33460455654`, `33461230355`, `33461976860`, `33463061480`, `33463795064`, `33464627707`). The isolated deep E2E gates `33413330307`, `33437577018`, `33439883492`, `33441596375`, `33442530408`, `33443384047`, `33461230288`, `33461976862`, `33463061493`, `33463795132`, and `33464627717` passed; `33464627717` proves the supervisor-removal confirmation extraction preserved bounded Chromium, scale, public, role-page, question-editor, supervisor-school, school-CRUD, and Barcode desktop/mobile journeys. Local `smoke:barcode-public-tests` (42/42) and `smoke:school-management` (26/26) are PASS for the current work. Fresh audit reports 83 hotspots (budget 83), zero unresolved runtime imports, and zero dependency cycles. Do not claim production-scale certification or a completed historical backfill.
- Open blockers: the authorized historical scope is result-only, with an explicit data-completeness marker. No historical `AssessmentAttempt`, `AssessmentResponse`, or authoritative historical definition may be reconstructed because their source data is not complete. No existing production assessment is opted in; production-scale certification is not proven; production secrets must be rotated outside the repository; self-service parent/student linking remains disabled until a verified-consent product decision is approved.
- Assessment test execution: `docs/architecture/ASSESSMENT_TEST_ROADMAP_AR.md` records the user-supplied acceptance matrix. The structural batch is closed; the isolated harness covers the normal directed journey, bounded cross-school/class rejection, a two-section mock journey, partial mock-definition preservation, duplicate-reference normalization, missing/invalid published-question rejection, teacher managed-question scope, historical-result reads, and the latest-result compatible reader. Backend run `33437577025` and full-stack E2E run `33437577018` both passed on isolated Mongo at commit `af8ea80a`. The remaining evidence is a focused UI mapping for the five named assessment journeys; the bounded CI read-scale check is not a production-scale certification.
- Phase 5 decision: `docs/architecture/ASSESSMENT_DATA_EVOLUTION_DECISION_AR.md` records the current result/session boundary and the additive protocol. Result-only backfill and an opt-in single-result reader control are authorized only on isolated evidence; no production opt-in is authorized.
- Next exact action: commit the ACC-05 documentation/report, then start Subject Learning Space Boundary from the updated execution state. Do not reconstruct attempts/responses/definitions, opt in production assessments, change scoring/RBAC/API contracts, or delete legacy records.

## Batch ACC-05 — Assessment Commercial Completion Report

- Status: `VERIFIED` as a Strong MVP on isolated CI evidence; production cutover and production-scale certification remain `NOT PROVEN` and unauthorized.
- Scope: reconciled the final Mock section identity edge with exact persisted question-ID mapping while retaining legacy `_copy` fallback. No API, RBAC, scoring, payment, or persisted-schema contract changed.
- Evidence: local `npm run typecheck`, `git diff --check`, focused Learning Space contract smokes all passed; Backend Integration [33770005131](https://github.com/nasef6464/almeaacodax/actions/runs/33770005131) and Deep Pre-Merge E2E [33770005171](https://github.com/nasef6464/almeaacodax/actions/runs/33770005171) passed on exact commit `22ac5d2a`, including normal/directed, Mock resume/retry, Results, and Student Learning Space journeys.
- Commercial result: Assessment is sellable for school/teacher controlled release with Builder, assignment, runner, autosave/resume, scoring, results, section/skill analysis, and learning recommendations. Recommendation-target click-through exhaustiveness and advanced exports remain `PARTIAL` Future Improvements.
- Next goal: Subject Learning Space Boundary, using the existing canonical `GenericPathPage → LearningSection` runtime and preserving legacy links.
- Plan handoff: read `docs/architecture/FINAL_MASTER_PLAN_V3_AR.md` before any new work
- Files in next scope: assessment public entry points and acceptance evidence only: `docs/architecture/ASSESSMENT_TEST_ROADMAP_AR.md`, `pages/QuizPage.tsx`, builder/assignment entry points, Results surfaces, quiz compatibility routes, and `server/src/modules/quizzes/`; no implementation change until the matrix identifies the first vertical gap
- Explicitly out of scope: database schema migration, RBAC changes, scoring/payment changes, route/API URL changes, broad frontend move, deleting legacy files
- Delivery rule: after each green Batch, update this file, create a focused commit, push, and refresh the latest ZIP without including secrets, `.env`, `.git`, dependencies, or build artifacts.

## Batch LSB-01 — Scoped Learning Space failure and retry state

- Status: `VERIFIED` for the first Subject Learning Space product gap.
- Scope: the canonical runtime remains `GenericPathPage` → `LearningSection`; `SubjectLearningPage` has no application route/import and is retained only as an uncalled compatibility artifact. Existing `/category/:pathId`, legacy subject redirects, and stable learning-tab URLs remain unchanged.
- Product fix: the bounded per-subject Courses/Quizzes bootstrap now exposes a loading state and a visible Arabic error with an in-place retry when both scoped reads fail. It preserves the currently displayed content, rejects late responses from another scope, and never falls back to a global reload.
- MVP boundary: one subject entry with Path → Level → Subject → Courses/Foundation/Practice/Assessments/Library, bounded scoped reads, and failure recovery. Deferred: advanced personalization, AI recommendations, broad search, offline/native, and visual redesign. No commercial value now: moving all frontend files or renaming routes.
- Evidence: local `smoke:learning-canonical-entry`, `smoke:learning-scoped-bootstrap`, `smoke:learning-tabs`, `typecheck`, and `git diff --check` passed. Exact commit `a254ea7d` passed Backend Integration [33690011174](https://github.com/nasef6464/almeaacodax/actions/runs/33690011174) and Deep Pre-Merge E2E [33690011175](https://github.com/nasef6464/almeaacodax/actions/runs/33690011175).
- Boundaries preserved: no API/RBAC/scoring/payment/schema change, no global unbounded content read, and no production test or data write.
- Next exact action: add an isolated Learning Space UI/API/data audit to the Deep gate; current generic Deep success does not itself prove the student/manager Learning Space journey.

## Batch ACC-02 — Normal + directed commercial journey closure

- Status: `VERIFIED` on isolated release candidate `48a66358`.
- Evidence: Deep Pre-Merge E2E `33565698390` and Backend Integration `33565698452` both passed on the exact commit. The Playwright audit proves Builder create, scoped question selection, preview/publish, group assignment, target catalog visibility, runner submission, server `QuizResult`, and outsider direct-URL rejection.
- Product fixes included: authoritative group-membership hydration for catalog filtering; null-safe quiz route context; removal of email-domain-based dev-session bypass so fixture users submit through the real server path.
- Local evidence: frontend/server typechecks and quiz-integrity contract 4/4 passed. No API URL, RBAC policy, scoring rule, payment rule, or legacy data migration was changed.
- Commercial boundary: normal and directed assessments are usable as an isolated sellable journey. Mock multi-section session locking, server resume/failure injection, and advanced result/history evidence remain `PARTIAL` for ACC-03/ACC-04.
- Next batch: ACC-03 — mock session + autosave/resume + failure/retry safety.

## Batch ACC-03 — Mock session, autosave/resume, and failure/retry safety

- Status: `VERIFIED` on isolated release candidate `47dabd68`.
- Product fix: the learner result-list projection now includes persisted mock `sectionResults`; the Results UI already renders those sections, so a student can read the section analysis after leaving the runner.
- Evidence: Backend Integration [33665523965](https://github.com/nasef6464/almeaacodax/actions/runs/33665523965) and Deep Pre-Merge E2E [33665524038](https://github.com/nasef6464/almeaacodax/actions/runs/33665524038) both passed on the exact commit. The backend proves directed start authorization, concurrent save idempotency, resume, expiry rejection, legacy-submit reconciliation, and learner result-list section results. The deep audit proves Builder creation of a directed two-section mock, autosave of each section response, resumed server answers, retry safety, submission, and the student-facing result read.
- Local evidence: `server:check`, `smoke:quiz-integrity-guard` (4/4), `smoke:api-security` (6/6), and `git diff --check` passed before the runtime commit.
- Boundaries preserved: no route/API/RBAC/scoring/payment/schema contract change, no production dual-write/cutover, and no historical attempt/response reconstruction.
- Remaining risk: `PARTIAL` only for ACC-04 result/history/analytics acceptance; the CI bounded read-scale check is not production-scale certification.
- Next batch: ACC-04 — results, analytics, and historical compatibility.

## Batch ACC-04 — Result reload and learner-safe review

- Status: `PARTIAL`; this closes the first concrete user-facing result gap, not the whole batch.
- Product fix: a fresh `Results` page now reads the selected result detail through the existing owner-protected endpoint when the paginated summary lacks `questionReview`. It merges only that result into the display, retains the paginated/bounded list, and leaves historical rows without stored review data as usable summaries.
- Evidence: Backend Integration [33667130693](https://github.com/nasef6464/almeaacodax/actions/runs/33667130693) and Deep Pre-Merge E2E [33667130828](https://github.com/nasef6464/almeaacodax/actions/runs/33667130828) both passed on exact commit `5dfe7209`. The E2E audit submits a directed assessment, reloads `/results` for that persisted attempt, waits for the protected detail read, and opens learner-safe answer review.
- Local evidence: frontend and server typechecks, `smoke:quiz-answer-exposure` (5/5), script syntax check, and `git diff --check` passed.
- Boundaries preserved: the established detail route remains owner-protected and serializer-safe; no answer key is added to list data, and no API/RBAC/scoring/schema/production migration changes occurred.
- Remaining risk: analytics and history/legacy UI acceptance remain `PARTIAL`; no production-scale or production-cutover claim.
- Next batch action: map the first missing analytics/history vertical journey before adding code.

## Batch ACC-04 — Manager mock-section analytics evidence

- Status: `PARTIAL`; this verifies the manager-facing section-analytics slice, not ACC-04 as a whole.
- Product fix: the frontend quiz adapter now preserves API `quizKind`. A newly published multi-section mock therefore remains a typed current assessment after a fresh manager reload and appears in the manager catalog rather than being filtered as a legacy untyped standalone mock.
- Evidence: Backend Integration [33678273932](https://github.com/nasef6464/almeaacodax/actions/runs/33678273932) and Deep Pre-Merge E2E [33678274167](https://github.com/nasef6464/almeaacodax/actions/runs/33678274167) passed on exact commit `9bf273f1`. The isolated audit creates a directed two-section mock in Builder, opens a separate manager session before learner use, proves catalog/preview visibility, autosave/resume/retry, waits for the persisted server result with its two section analyses, and proves authorization-scoped manager analytics in the UI after submission.
- Audit reliability: `600b08d7` preserves the explicit kind across the API read model; `9bf273f1` replaces the result-list read race with a bounded persisted-result poll. Neither changes API, RBAC, scoring, schema semantics, or production data.
- Local evidence: `npm run typecheck`, `node scripts/smoke-mock-exam-contract.mjs` (10/10), `node scripts/smoke-assessment-classification-contract.mjs` (9/9), script syntax check, and `git diff --check` passed before their runtime commits.
- Remaining risk: Result history/detail for incomplete legacy rows, journey 5 edit/version preservation through UI, and broader student/class/school report and export evidence remain `PARTIAL`. Production scale and production cutover remain `NOT PROVEN`/not authorized.
- Next batch action: inspect journey 5 and the learner historical result UI; implement only the first unproven vertical gap.

## Batch ACC-04 — Published-definition version preservation

- Status: `PARTIAL`; this closes the server/persistence portion of journey 5, not its dedicated edit UI or paginated selection acceptance.
- Product fix: publishing a definition and every later update that remains published append an immutable `AssessmentVersion`; prior published snapshots become `superseded`. The public `Quiz` route and legacy document remain the compatibility facade, while the version reader now cannot serve an old definition after manager edits.
- Evidence: Backend Integration [33680376925](https://github.com/nasef6464/almeaacodax/actions/runs/33680376925) and Deep Pre-Merge E2E [33680376880](https://github.com/nasef6464/almeaacodax/actions/runs/33680376880) passed on exact runtime head `46eae178`. The isolated HTTP journey creates a published directed assessment, proves version 1, PATCHes title/settings, proves version 2 retains the selected question and settings, then proves the targeted learner reads the updated immutable definition. The same gate proves the existing attempt-limit guard remains enforced; Deep also passed normal/directed and mock commercial journeys.
- Local evidence: `npm run server:check`, `npm run typecheck`, and `git diff --check` passed before commit `84b7a692`; the first CI run exposed only an audit fixture changing `maxAttempts`, corrected in `46eae178` without product behavior change.
- Boundaries preserved: no route/API/RBAC/scoring/payment contract, historical reconstruction, production opt-in, or cutover. This is the delegated additive definition-version behavior, not a production migration.
- Remaining risk: `PARTIAL` for a dedicated UI edit/reload/publish acceptance and question-selector pagination/selection preservation, plus result history/legacy rows and broader report/export evidence.
- Next batch action: map the `QuizzesManager` edit facade to the active Builder and add only the missing UI journey-5 acceptance evidence or its first concrete defect.

## Batch ACC-04 — Published edit UI acceptance and CI reliability

- Status: `PARTIAL`; Definition/versioning acceptance is now `VERIFIED`, while the overall commercial module still needs the remaining result/history/analytics closure.
- Product evidence: the connected manager journey creates, publishes, reopens, edits, and reloads a directed definition. It proves the selected question and edited time limit persist through the Builder and the version-aware definition read; the learner then completes the existing directed runner/result journey and an outsider remains blocked.
- Evidence: Backend Integration [33683096158](https://github.com/nasef6464/almeaacodax/actions/runs/33683096158) and Deep Pre-Merge E2E [33683096173](https://github.com/nasef6464/almeaacodax/actions/runs/33683096173) passed on exact runtime head `038255fb`. Deep passed normal/directed, mock resume/retry, and all final required suites.
- CI reliability: the prior Deep run proved the Assessment audit but failed only when a later Barcode audit hit a sensitive in-memory rate limit. `038255fb` changes the isolated workflow environment only (`RATE_LIMIT_SENSITIVE_LIMIT=2000`); it does not alter production limits or runtime policy. The rerun passed all suites including Barcode.
- Remaining risk: question-selector pagination preservation, incomplete historical result rows in the UI, and broader student/class/school analytics/report/export evidence remain `PARTIAL`; production cutover and production-scale certification remain `NOT PROVEN`/not authorized.
- Next batch action: inspect the first unproven Results/history or analytics vertical journey and implement only that product gap.

## Batch ACC-04 — Paginated selection and learning-loop evidence

- Status: `VERIFIED` for the Assessment Strong MVP on isolated UI/API/DB evidence; advanced report/export and exhaustive recommendation-target UI coverage remain explicitly `PARTIAL` Future Improvements.
- Product evidence: the isolated commercial audit creates 101 scoped temporary questions, selects one from page 1 and one from page 2, publishes a directed definition, reopens/edits/reloads it, and proves both selections persist. The targeted learner completes the two-question runner after autosave; the outsider remains rejected. Fixtures are deleted in `finally` and never touch production data.
- Learning-loop audit: `Question.skillIds` is required at authoring; submission persists per-skill `skillsAnalysis`; submission side effects update per-student `SkillProgress` mastery/status/attempts; `Results` resolves weak-skill actions to approved/visible lesson, video/resource, or targeted quiz and exposes a re-assessment path. This reuses the existing loop—no recommendation system or scoring policy was introduced.
- Classification: Question → Skill `VERIFIED`; Result → Skill Analysis → persisted Skill Mastery `VERIFIED`; Weakness → existing recommendation resolver `VERIFIED` as deterministic application behavior; clicking every lesson/video/resource/reassessment target in one isolated E2E chain is `PARTIAL` and deferred because it is coverage expansion rather than an MVP blocker. Historical rows that lack granular source data remain readable summaries, `VERIFIED`; reconstructing missing attempts/responses/definitions remains prohibited.
- Evidence: local `typecheck`, `server:check`, frontend/server builds, focused assessment/result/skill smoke guards, and script syntax checks passed during the batch. Exact runtime CI: Backend Integration [33688377700](https://github.com/nasef6464/almeaacodax/actions/runs/33688377700) and Deep Pre-Merge E2E [33688377731](https://github.com/nasef6464/almeaacodax/actions/runs/33688377731) passed on `d2298993`.
- Boundaries preserved: no route/API/RBAC/scoring/payment/schema semantic change, no production dual-write/cutover, and no historical reconstruction. `d2298993` changes only the isolated CI workflow rate-limit budget, not production configuration.
- Next batch: ACC-05 — issue the commercial completion report and move only then to Subject Learning Space Boundary.

## Batch PLAN-01 — Product-delivery realignment

- Purpose: replace phase-order/refactor momentum with sellability gates while preserving the safe modular-monolith migration and all current contracts.
- Inputs reviewed: the 2026-09-01 Lead Architect report, the three latest prior ALMEAA tasks, `FINAL_MASTER_PLAN_V3_AR.md`, this execution state, assessment test/data decisions, schools handoff, Git HEAD/log/status, and latest CI evidence.
- Changed files: `FINAL_MASTER_PLAN_V3_AR.md`, `CODEX_EXECUTION_STATE.md`, `MODULE_CATALOG.md`, `CHANGE_MAP.md`, and `DATA_ACCESS_MAP.md`.
- Architecture impact: no runtime/API/schema/RBAC/scoring/payment change. Domain boundaries remain modular-monolith boundaries; `ProductConfig` is recorded as a future boundary, not implemented.
- Product impact: establishes Gate 0 schools checkpoint closure, then Gate 1 Assessment Commercial Closure, Gate 2 Learning Space, Gate 3 School MVP, Gate 4 Results/Reports, and Gate 5 White-label.
- Evidence policy: all readiness claims now use `VERIFIED / PARTIAL / NOT PROVEN / BLOCKED`; isolated Phase 5 proof is not presented as production cutover or scale certification.
- Tests/CI: latest implementation HEAD `26f615e1` has successful Backend Integration `33465513158` and Deep Pre-Merge E2E `33465513152`. On planning commit `c465b7ea`: Backend Integration `33485027032` PASS and Deep Pre-Merge E2E `33485027029` PASS; locally `npm ci` PASS (root 0 vulnerabilities), `npm --prefix server ci` PASS (17 dependency audit findings recorded, no blind fix), and typecheck, server check, frontend build, server build, repository audit, architecture gate, route-loading, runtime-source, quiz-integrity 4/4, auth-login-security 9/9, and API-security 6/6 all PASS. Audit: 49 frontend routes, 236 backend routes, 0 unresolved runtime imports, 0 cycles, 83 hotspots (budget 83). GitHub Actions reports a Node 20→24 deprecation annotation for current action versions; record it as CI maintenance, not a product blocker.
- Risks: generated audit artifacts are already modified outside this batch and must remain excluded; no new Assessment or School MVP capability is claimed by this planning update.
- Next step: create the Assessment Definition→Analytics capability/evidence matrix and choose the first unproven vertical journey.

## Batch ACC-01 + ACC-02 — Evidence map and normal/directed commercial journey

- Status: `PARTIAL` pending the required isolated-Mongo Deep Pre-Merge E2E run on this commit. Local source/build and focused contract gates are green; no production system, account, or data was contacted.
- ACC-01 evidence map: added to `ASSESSMENT_TEST_ROADMAP_AR.md`. It maps all five mandatory journeys to the public UI entry points, API/model truth, existing proof, fixture strategy, and the remaining precise gaps. The first true gap was a missing connected UI acceptance journey, not a scoring, RBAC, or API-contract defect.
- ACC-02 implementation: `live-assessment-commercial-audit.mjs` creates one temporary normal test through the admin Builder UI, selects a scoped approved question, assigns the actual isolated student's group, publishes, proves the target sees and submits it, verifies a server result, and confirms an outsider cannot access the direct runner URL. It deletes the temporary definition in `finally`.
- Testability only: stable `data-testid` hooks were added at the quiz-manager create action, Builder fields/steps, question selection buttons, directed-test card, runner answers, and finish confirmation. No route, payload, schema, RBAC, scoring, payment, or legacy-reader behavior changed.
- CI wiring: the Deep Pre-Merge E2E workflow runs the new audit against its isolated API/Chromium stack and makes it a required green suite. The audit fails closed without explicitly supplied isolated `UI_AUDIT_BASE_URL` and `UI_AUDIT_API_BASE_URL`.
- Local checks: `node --check scripts/live-assessment-commercial-audit.mjs`, `npm run typecheck`, `npm run server:check`, `npm run build`, `npm run smoke:quiz-integrity-guard` (4/4), `npm run smoke:assessment-directed-scope` (4/4), `npm run smoke:assessment-question-selection` (10/10), `node tools/refactor/architecture-gate.mjs`, and `git diff --check` all PASS.
- Excluded: pre-existing generated audit files, ZIP exports, and `claude_prompt.txt` remain unstaged/unmodified by this batch.
- CI correction evidence: Backend Integration `33493106346` passed on `ae27f014`. Deep run `33493106288` passed typecheck/build/API/scale/public/role/question-editor/schools/barcode, but its focused Assessment suite outcome failed because the audit queried the paginated list to rediscover the newly created definition and did not find it. The Builder POST itself completed and the modal closed. Commit `7d6bf781` now captures and validates the authoritative `POST /api/quizzes` response directly, with the list read retained only as secondary evidence; this is an audit correction, not a product/API/RBAC/scoring change. Re-run pending.
- Follow-up evidence: on HEAD `5de59d89`, Backend Integration `33509305799` passed and Deep run `33509305485` proved the Builder POST/create evidence, but the student context had loaded its bootstrap before the new assignment and timed out waiting for `student-directed-tests`. The audit now starts a fresh learner browser context after assignment, matching the commercial sequence in which the target signs in after publication. No runtime product contract changed; re-run pending.

## Product-owner handoff — sequential chat goals

- Added `docs/architecture/CHAT_EXECUTION_GOALS_AR.md` after comparing the owner/ChatGPT report with Git HEAD and the current product-delivery plan.
- Decision: no new roadmap is required. The report's core direction is already represented by Gates 1–6; duplicating the master plan would create competing truth.
- Product impact: the owner now has six self-contained prompts to send one at a time: Assessment, Learning Space, School MVP, Results/Reports, White-label, then Questions/Curriculum/Courses/Operations.
- Control: each prompt carries an explicit exit criterion, exclusions, evidence requirement, and next goal. A later goal must not start merely because a chat ended.

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

## Batch 5C-02 — Controlled post-legacy assessment mirror

- Scope: added a default-off `assessmentData.mirrorSubmissions` opt-in to assessment definitions, restricted to directed or mock assessments. After the existing `QuizResult` commits, the mirror writes the additive projection and a dedicated audit row; it records and contains mirror failure without changing the legacy HTTP response.
- Changed files: `Quiz.ts`, `quizDefinitionSchema.ts`, `assessmentSubmissionMirror.ts`, `assessmentMirrorAuditModel.ts`, `quiz.routes.ts`, and the isolated harness.
- Preserved contracts: legacy submission/scoring/RBAC/response behavior remains authoritative. Existing quizzes remain opt-out. No existing production record was enabled, no backfill or reader cutover was run, and no legacy document is deleted or updated by reconciliation.
- Tests: `smoke:quiz-integrity-guard` 4/4, API typecheck/build, harness typecheck, and `Platform V3 Backend Integration Gate` `33377661059` PASS. The HTTP journey asserts a directed opt-in submission returns the normal legacy 201, creates exactly one linked additive result, and emits a completed mirror audit row.
- Commit: `4f12a327` `feat(assessments): mirror eligible legacy submissions safely`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: the route-level failure containment is structurally enforced and direct primitive failure is tested, but an operational bounded reconciler is still needed before any rollout of opt-in definitions. No capacity claim is made.
- Next exact action: add a cursor/batch-limited reconciliation discovery dry-run and an explicit repair mode, both isolated and idempotent, before considering backfill.

## Batch 5D-01 — Bounded mirror reconciliation

- Scope: added a cursor-based reconciler for `AssessmentMirrorAudit` rows. It inspects at most 100 records per invocation, reports missing legacy/additive records and field differences, and defaults to no-write. An explicit repair mode repairs only linked additive result projections and is idempotent on repeat.
- Changed files: `assessmentMirrorReconciliation.ts` and the isolated harness.
- Preserved contracts: no HTTP route, learner response, legacy `QuizResult`, scoring, RBAC, or backfill behavior changed. Dry-run writes nothing; repair never changes legacy submissions, attempts, assignments, or versions.
- Tests: API typecheck/build, harness typecheck, and `Platform V3 Backend Integration Gate` `33377975143` PASS. The isolated Mongo journey proves mismatch discovery, explicit repair, and the following repair pass reporting `consistent`.
- Commit: `40a275b3` `feat(assessments): add bounded mirror reconciliation`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: reconciliation presently covers mirror audit rows, not the historical legacy corpus; it supplies evidence and repair capability, not a backfill.
- Next exact action: implement a no-write, cursor-bounded legacy result inventory/dry-run with reproducible counts/checksum evidence before deciding on a real backfill.

## Batch 5E-01 — Read-only historical backfill inventory

- Scope: added a read-only inventory over legacy `QuizResult` records with an `_id` cursor, bounded pages (maximum 500), already-projected/pending counts, and a stable SHA-256 checksum for the scanned page.
- Changed files: `assessmentLegacyBackfillInventory.ts` and the isolated harness.
- Preserved contracts: the inventory creates no `AssessmentResult`, writes no legacy data, changes no HTTP API, RBAC, scoring, assignment, or reader default. It is evidence for a future migration, not a migration.
- Tests: API typecheck/build, harness typecheck, and `Platform V3 Backend Integration Gate` `33378321696` PASS. The isolated journey proves batch limit enforcement, cursor advance, checksum stability, and zero writes to legacy/additive result collections.
- Commit: `156d8440` `feat(assessments): inventory legacy backfill safely`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: the required next operation writes historical additive records. `ASSESSMENT_DATA_EVOLUTION_DECISION_AR.md` delegates Additive only and explicitly says it does not authorize backfill; therefore no backfill command or job has been added.
- Next exact action: wait for an explicit owner authorization of batch size, schedule, and rollback observation window before implementing or running a historical backfill.

## Batch 5E-02 — Architecture-gate hotspot correction

- Scope: the fresh repository audit exposed one new ≥400-line hotspot (`backendIntegrationGate.ts`), raising the total to 84. To keep the enforced 83-file budget without weakening it, presentation types/constants for the legacy Notifications Manager were extracted into a small sibling module.
- Changed files: `dashboards/admin/NotificationsManager.tsx` and `dashboards/admin/notificationsPresentation.tsx`.
- Preserved contracts: notification routes, API calls, permissions, state transitions, visible manager behavior, and all Phase 5 data behavior are unchanged. This is a frontend ownership/maintainability correction only.
- Tests: frontend typecheck PASS; repository audit reports 83 hotspots, zero unresolved runtime imports, and zero cycles; architecture gate PASS; route/runtime/quiz integrity/auth/API/school-RBAC smoke gates PASS; backend integration `33407725338` PASS on isolated Mongo.
- Commit: `b86522e7` `refactor(notifications): extract presentation metadata`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: no Phase 5 data risk was introduced. Historical backfill remains unimplemented and no production data was touched.
- Next exact action: complete the Phase 5 verification ledger while retaining the explicit hold on actual historical backfill/cutover until its data-completeness policy is settled.

## Batch 5F-01 — Result-only reader rollback proof

- Scope: extended the isolated HTTP harness for historical result-only backfill from `QuizResult` into `AssessmentResult`, then proved that removing the additive projection immediately restores the legacy result response and that re-running the bounded backfill restores the projection without duplication.
- Changed files: `server/src/scripts/backendIntegrationGate.ts`.
- Preserved contracts: existing result URL, response compatibility fields, legacy `QuizResult` authority and fallback, scoring, RBAC, assignment/access rules, and all production data. No production backfill or opt-in was run.
- Tests: `Platform V3 Backend Integration Gate` `33409276297` PASS on isolated Mongo. The journey proves dry-run zero writes; executed result-only record markers; no invented Attempt/Version; compatible result read; additive-record deletion falling back to legacy; and idempotent re-backfill.
- Commit: `eddaab08` `test(assessments): prove result-only reader rollback`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: reader selection is still implicit when a compatible projection exists; no explicit cutover control is present yet. Historical data continues to be result-only, so it cannot support attempt/response analytics.
- Next exact action: add an explicitly opt-in, per-assessment result-reader control that defaults to legacy and prove both rollback branches before enabling it for any assessment.

## Batch 5F-02 — Reversible single-result reader cutover

- Scope: added `assessmentData.resultReaderMode` (`legacy` by default; `compatibility` only by explicit per-assessment update) for `GET /api/quiz-results/:id`. The reader checks authorization against legacy first, then reads the additive projection only when the assessment control is enabled.
- Changed files: `Quiz.ts`, `quizDefinitionSchema.ts`, `quizResults.routes.ts`, reader policy/repository modules, `quiz.routes.ts`, and the isolated harness.
- Preserved contracts: all HTTP paths/payloads, existing legacy result serialization, legacy authority, RBAC, scoring, and production data. A missing additive result and a `legacy` flag both return the legacy record. Partial PATCH preserves the unrelated `mirrorSubmissions` control.
- Tests: server check/build, strict harness check, architecture gate PASS; isolated backend integration `33411114387` PASS. The HTTP journey proves default legacy read, enable, disable rollback, retained mirror setting, result-only compatible read, and fallback after additive deletion.
- Commits: `7be63b94` (control), `b0d1fd90` (harness CSRF correction), `56d3c144` (partial-update preservation), `12cb5018` (historical fixture).
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: only the single-result detail route participates. Result lists deliberately remain legacy because enabling their projection safely requires a bounded batched lookup rather than per-row queries. No production assessment is enabled.
- Next exact action: inventory result-list readers/callers and design their bounded compatibility lookup before any broader cutover.

## Batch 5F-03 — Bounded compatible direct-result lists

- Scope: extended the existing per-assessment reader control to `/quiz-results/my` and `/admin/quiz-results` with two page-bounded batch lookups: reader modes by quiz and projections by legacy-result IDs.
- Preserved contracts: result URLs, pagination, sorting, authorization, scoring, legacy defaults, and report/analytics aggregates. No per-row database query or production opt-in was added.
- Tests: server typecheck, strict harness check, architecture gate, and isolated backend integration `33411718907` PASS; the HTTP journey proves both student and admin lists use an enabled projection.
- Commit: `3030cb8b` `feat(assessments): batch compatible result list reads`.
- Next exact action: verify remaining reporting/analytics reads are intentional legacy aggregates before closing Phase 5 verification.

## Batch 5F-04 — Legacy direct-list compatibility surface

- Scope: applied the same bounded two-query compatibility lookup to `/quizzes/results` and `/quizzes/results/scoped`, which are direct result payload APIs despite their legacy route ownership.
- Preserved contracts: paths, pagination, cache semantics, RBAC/scoping, scoring, legacy-default behavior, and all aggregate/report readers.
- Tests: isolated backend integration `33412140613` PASS, including the legacy direct-list route reading an enabled compatibility projection.
- Commit: `ff3e0f67` `feat(assessments): batch legacy result route reads`.
- Next exact action: classify aggregate/report reads as intentional legacy projections and close the Phase 5 verification ledger without a production activation.

## Batch 5G-01 — Direct result surface ledger and CI completion

- Scope: inventoried every `QuizResult` read surface and completed the one direct result payload route omitted by the earlier list work: `GET /quizzes/results/latest`. It now honors the same per-assessment `resultReaderMode` as detail and list readers, after selecting the authoritative legacy result. The aggregate/report/AI/notification readers are documented as intentional legacy consumers because they derive historical metrics rather than return a compatibility payload.
- Changed files: `server/src/routes/quiz.routes.ts`, `server/src/scripts/backendIntegrationGate.ts`, `.github/workflows/platform-v3-deep-premerge-e2e-gate.yml`, `ASSESSMENT_DATA_EVOLUTION_DECISION_AR.md`, `DATA_ACCESS_MAP.md`, and `MIGRATION_REGISTRY.md`.
- Preserved contracts: every HTTP path and response shape, legacy `QuizResult` authority, authorization/scoping order, RBAC, scoring, cache semantics, and production data. The single-record reader performs no additive query in `legacy` mode; the list readers retain their two bounded batch lookups. No production assessment was enabled.
- Tests: server typecheck/build and isolated backend integration `33437577025` PASS. The harness proves the latest direct-result surface reads an enabled compatibility projection. Isolated deep E2E `33437577018` PASS, including frontend/API builds, Chromium, bounded loopback read-scale validation, public journeys, role pages, question editor, supervisor school, school CRUD, and barcode journeys. `33436942341` also passed the same HTTP proof before the CI timeout-only follow-up.
- CI resilience: `0741502b`, `008655cc`, and `af8ea80a` bound the scale, Chromium-install, and public-journey steps respectively. The prior unbounded run was superseded by workflow concurrency; the exact-head rerun reached terminal success.
- Commits: `df6fe6d9` (latest reader), `bf71ece5` (TypeScript correction), `af8ea80a` (public-journey timeout).
- Risks: Phase 5 remains isolated-only. Historical backfill is result-only; no attempt/response/version historical reconstruction, production-scale certification, production opt-in, legacy retirement, or final cutover is authorized.
- Next exact action: record this documentation commit, then begin the read-only Phase 6 schools/academic-operations entry audit.

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
