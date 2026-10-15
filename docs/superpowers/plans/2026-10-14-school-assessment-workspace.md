# School Assessment Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Native execution is recommended to minimize context/token cost; owner review and execution-method confirmation precede product implementation.

**Execution checkpoint:** Owner authorized start after current-vs-planned inventory. Inline execution. Scoped reports, safe edit/copy, bank composition and transactional Task5 commands are implemented; overall plan remains IN_PROGRESS. See docs/audits/SCHOOL_ASSESSMENT_WORKSPACE_2026-10-14.md and the plan-specific execution ledger. Complete learner detail, full workspace/role journeys, scored mock analysis and release are outstanding. Task5 exact-head CI is pending.

**Goal:** Deliver a school supervisor's test card/workspace for bank-based normal or multi-subject mock creation, assisted composition, targeting, management and complete per-test analytics.
**Architecture:** Extend the existing SupervisorTestsManager, builders, target-scope services, frozen results and protected APIs. Add small school-assessment application/read-model modules; share grading and bank authority. Notifications, reopening, retakes and cloning are distinct operations; no new campaign subsystem or global assessment-data cutover.
**Tech Stack:** Existing React/TypeScript, Express/Zod, Mongoose/Mongo, current notification and AI routing/quota infrastructure. No new provider, paid service or global dependency installation.
**Spec:** ../specs/2026-10-14-unified-assessments-learning-access-design.md, including the owner's school-first clarification.

## Global Constraints

- Baseline main1bebcd4a58d44212177919411ef25d2ff2c72c51; preserve primary edits and four unowned generated files. Fresh focused implementation branch from current main.
- First release prioritizes school supervisor assessment management and analytics. Anonymous links/Saher/remaining learning-page UI follow this release; learning-placement access authority remains a binding rule throughout.
- Experimental old result compatibility is not a gate. No production deletion/backfill is authorized. New scored evidence must remain accurate and stable.
- Normal/mock scoring uses existing server grading. AI composes approved authorized bank content; it does not create questions, verbal banks, scores or publication decisions.
- Every school/group/student/question predicate is server-scoped. Monetization/visibility is controlled by actual learning-page placement; school targeting cannot modify public catalogue access.
- Preserve existing default-off assessment cutover/mirror settings; do not replace legacy result authority to implement this workspace.
- No new paid configuration, billing changes, provider key setup, load test or database region move. Required CI on exact final head, focused review and bounded published journey before closure.

## Review Focus

1. Two supervisors viewing the same school test have different class scopes: summaries/rows/actions must each intersect the caller's authority (Tasks1,2,5).
2. An examination is edited after a learner starts: block content mutation and offer a new copy; do not silently change an ongoing attempt or stored snapshot (Task4).
3. Resend succeeds but the response is lost: retry must not duplicate notification delivery, reopen a test or grant another attempt (Task5).
4. The report exceeds one page and a learner has repeated attempts: compute full-population summary from the established latest-attempt policy, not the first page or highest score (Task2).
5. AI returns foreign IDs, an unknown skill, missing coverage or unavailable provider: no unauthorized question lookup/publication and no fabricated success (Task3).

## Task1 — Authoritative school assessment context and operation policy

**Files:** Create server/src/modules/quizzes/application/schoolAssessmentManagementPolicy.ts and server/src/modules/quizzes/http/schoolAssessmentsRouter.ts; modify server/src/routes/index.ts. Reuse quizSupervisorReportScope, quizAccessPolicy, schoolAssessmentAudience and teaching-assignment readers.
**Interfaces:** Export resolveSchoolAssessmentContext(actor,quizId): Promise<{quiz,scope,targetPredicate,canManage}> and assertSchoolAssessmentOperation(context,operation): Promise<void>; operation is edit|clone|retarget|reopen|remind|retake. Keep query predicates in server context rather than serializing whole rosters to the browser.

- [ ] Add scripts/test-school-assessment-workspace.ts on the existing isolated replica fixture: admin, scoped supervisor, school director, assigned teacher, unrelated staff, learner and parent. Assert cross-school/class refusal and fresh inactive-assignment refusal; a client-supplied schoolId cannot widen scope.
- [ ] Run server/node_modules/.bin/tsx.cmd scripts/test-school-assessment-workspace.ts; confirm the new context/operations cases fail before implementation.
- [ ] Implement context/policy and mount /api/school-assessments before broad dynamic quiz handlers. Use fresh existing authorization and creator/ownership guards, with role changes confined to the approved school-only policy. No global catalogue publishing permission is added.
- [ ] Rerun focused HTTP/Mongo cases and commit only owned files: feat(schools): resolve scoped assessment management authority.

## Task2 — Complete per-test report summary and paged learner detail

**Files:** Create server/src/modules/quizzes/application/schoolAssessmentReport.ts, server/src/modules/quizzes/infrastructure/schoolAssessmentReportRepository.ts and types/schoolAssessments.ts; extend schoolAssessmentsRouter. Modify services/api.ts to compose new services/apiGroups/schoolAssessmentsApi.ts.
**Interfaces:** GET /school-assessments/:id/report returns SchoolAssessmentReport with coverage, audience, participation, scores, subjects, sections and skills. The existing scoped result pagination/detail APIs continue to provide learner rows and one owned frozen review. Export createSchoolAssessmentsApi(request).schoolAssessmentReport(id).
**DTO:** coverage {complete:boolean,missingEvidence:string[]}; audience {targeted:number}; participation {completed:number,notCompleted:number,started:number|null}; scores {average:number|null,passRate:number|null,highest:number|null,lowest:number|null}; subjects/sections/skills carry stable IDs, display labels, denominators and observed scores. Missing started evidence returns null, not a guessed number.

- [ ] Add an isolated1005-target fixture with unrelated students, multiple subjects/sections, a repeated learner attempt and no-results case. Assert full-target denominator, latest-attempt policy, grade/section/skill counts and empty averages=null. A page of100rows must not change summary1005. Intersect a second caller's class scope independently.
- [ ] Run the focused script and observe the missing summary/incorrect capped behavior RED.
- [ ] Build targeted Mongo aggregations from persisted frozen results and scoped audience predicates; no questionReview bodies in summary and no all-results array in the browser. Assess expected indexes with isolated explain; no speculative index additions or manual production commands. Keep personal training/anonymous results outside school evidence.
- [ ] Verify exact summary parity and bounded response shape; commit feat(reports): aggregate complete scoped school assessment summaries.

## Task3 — Bank composition with structured/AI-assisted specification

**Files:** Create server/src/modules/quizzes/application/schoolAssessmentComposition.ts and schoolAssessmentCompositionAi.ts; extend schoolAssessmentsRouter and schoolAssessmentsApi; create dashboards/admin/supervisorTests/SchoolAssessmentComposePanel.tsx. Reuse approved bank queries, mock normalization and existing AI provider adapters/routing/quota checks; do not reuse a generative-question route as a bank selector.
**Interfaces:** POST /school-assessments/compose accepts {kind:'normal'|'mock',pathId,subjectSpecs:[{subjectId,skillIds,count,difficulty}],prompt?:string}; validated bounds reuse existing builder/assessment schema. Return {draft,coverage:[{subjectId,skillId?,requested,available,selected}],warnings}; zero publication or question writes. Export composeSchoolAssessment(context,spec,interpret:SchoolSpecInterpreter):Promise<CompositionPreview>. The AI interpreter returns validated filters/section specifications, never trusted question IDs or answer keys.

- [ ] Add tests for a single subject, a multi-subject mock, non-repeated canonical IDs and insufficient approved questions. Inject an interpreter returning foreign subject/skill IDs, extra fields and malformed counts; assert refusal rather than broader selection. Provider unavailable must return an explicit AI error while structured manual composition still works.
- [ ] Run the new cases RED; implement filtered bank selection and preview. AI sees only the allowed compact taxonomy/specification, never student names, result rows or answer keys. Reuse configured provider/quotas; no credentials in frontend or fixtures.
- [ ] Require the staff member to review/edit the proposed question/section distribution before saving through the ordinary scoped authoring workflow. No silent count reduction, taxonomy relaxation or auto-publish.
- [ ] Run focused tests with an injected fake interpreter (no external spend), plus existing provider/capability contracts; commit feat(schools): preview authorized bank-based assessment composition.

## Task4 — One card/workspace per assessment, including safe editing and cloning

**Files:** Modify dashboards/admin/SupervisorTestsManager.tsx and existing UnifiedQuizBuilder/MockExamManager integration; create supervisorTests/SchoolAssessmentCard.tsx and SchoolAssessmentWorkspace.tsx. Reuse AssignedTestDetailPanel, TestAnalyticsReport and useScopedAssessmentResults as detail consumers, not full-summary authority.
**Interfaces:** Workspace props {quizId,onClose}; tabs overview|students|grades|skills|sections|settings. Sections tab applies to actual mocks. Card props use the scoped quiz summary plus operation permissions from Task1. Route-managed state retains quizId and selected tab when returning from a student result.

- [ ] Add meaningful UI tests for creating a normal exam and multi-subject mock, selecting a card, viewing real summary/sections, loading/error/retry, paged learner details and a denied action. Rename vague «تدخل جديد» to «إنشاء اختبار»; no nested dashboard search for a report.
- [ ] Add backend edit tests: draft/no-start content edits allowed; active session/result evidence blocks in-place content edits. POST /school-assessments/:id/clone copies authorized definition/question IDs into a fresh draft, clears audience/publication/version/result identity, and returns the new quiz ID. No source result mutation.
- [ ] Wire existing builders with editingQuiz and validated return paths. Preserve source definitions/snapshots after any new learner begins. Show «إنشاء نسخة للتعديل» when in-place editing is blocked, and preserve failed form drafts.
- [ ] Verify desktop/mobile RTL, actual API persistence and clone/source independence; commit feat(schools): manage each assessment through a unified workspace.

## Task5 — Distinct targeting, resend, reopening and retake operations

**Files:** Extend schoolAssessmentManagementPolicy, schoolAssessmentsRouter and schoolAssessmentsApi; create server/src/modules/quizzes/application/schoolAssessmentCommands.ts and server/src/modules/quizzes/infrastructure/schoolAssessmentCommandModel.ts. Integrate existing QuizAssignWidget/QuizRetakeDialog, quizRetakeModel and notification delivery infrastructure; register the additive command receipt in database ownership/migration maps. Do not reuse CommandCenter business records or create a second grant/scoring system.
**Interfaces:** POST /school-assessments/:id/commands accepts {commandId,operation:'retarget'|'remind'|'reopen'|'retake',payload}; return a scalar receipt {commandId,operation,targetGroupCount?,targetUserCount?,notifiedCount?,grantedCount?,reopened?}; operation-specific counts avoid implying that target-group entries equal learner counts. Validate payload per operation with Zod. Export executeSchoolAssessmentCommand(context,input):Promise<CommandResult>. SchoolAssessmentCommand has unique {actorId,quizId,commandId}, a server-canonical payload hash and completed scalar result; no prompts/student rosters or automatic TTL. Receipt plus Mongo effects commit in one transaction. Retake uses existing deterministic quizRetakeId/absolute maxAttempts, with the receipt preventing a replay after a later learner submission from granting another attempt. NotificationDelivery.id is derived from command/recipient/channel, and external fan-out happens only after commit. A duplicate is reread and its actor/quiz/hash verified; mismatched payload returns409.

- [ ] Tests: retarget within scope vs foreign group; remind only eligible incomplete targets; repeated identical command and simulated lost response yield one delivery effect; same command ID with different payload is rejected; reopen changes availability but does not increment maxAttempts; retake grants only the selected eligible learners and preserves previous scored results. Ordinary notification must not create a new quiz or attempt.
- [ ] Run RED cases before implementation. Complete concurrent HTTP replay on disposable Mongo/Redis where the existing mechanism requires it; do not swallow E11000 as generic success or broaden idempotency keys across actors/tests.
- [ ] Implement transactional/durable effects using existing notification/retake semantics, return explicit errors and UI retry states. A window reset and an additional attempt remain separate controls. Never clear old results to reopen an assessment.
- [ ] Verify operation/read/report parity and commit feat(schools): separate idempotent assessment management commands.

## Task6 — Integrated per-test analytics and scoped student journey

Owner clarification2026-10-15: mocks belong to a PATH and may span multiple materials. Preserve one overall canonical grade and independent frozen subjectResults for every actual material; nest section/skill analysis under that material and show incomplete/legacy evidence explicitly. Top-level quiz.subjectId must not classify the whole mock. No historical rewrite.

**Files:** Update TestAnalyticsReport integration through focused supervisorTests adapters/components; extend scripts/test-school-assessment-workspace.ts and existing live-report-actions/mock/supervisor journeys. Add a bounded school-assessment-workspace journey script to the existing isolated full-stack workflow.
**Interfaces:** Use Task2 summary for all-participant metrics, existing paged results for grade rows and protected result detail for a selected learner. Preserve quizId/subjectId/sectionId in drill-down links. No synthetic analytics when frozen evidence is missing.

- [ ] Verify creation→preview→publish→target→student discovery→normal/mock solve→server score→student result→same supervisor grade/subject/section/skill analysis. Include absentees, wrong answers, unanswered questions, retake latest-result semantics and a changed question label with frozen old evidence.
- [ ] Assert another student cannot read the result, another school cannot read/manage the test/report, and parent scope is limited to linked children; teacher publication remains school-only and platform catalogue approval separate. Learning-page paid/free access stays authoritative and cannot be widened by a school action.
- [ ] Verify report exports/drill-down cover the chosen audience/page truthfully; distinguish unavailable historical start/timing data. Include mobile390px and desktop, reload and request failure/retry.
- [ ] Run focused cases, affected typecheck/build/contracts and existing required gates. Commit test(schools): certify scoped assessment workspace journeys.

## Task7 — Focused publication and bounded closure

**Files:** docs/MASTER_CONTROL/CURRENT_EXECUTION_STATUS_AR.md, docs/architecture/CODEX_EXECUTION_STATE.md, affected module/data-access maps and a focused docs/audits/SCHOOL_ASSESSMENT_WORKSPACE evidence record.

- [ ] Self-review actual final diff against the spec; update only ownership/query maps that changed. Preserve unrelated generated files; stage exact paths only. Request one fresh whole-branch reviewer, address concrete findings and rerun affected checks.
- [ ] Create/attach focused PR(s); all three required CI checks must pass on exact final source head before normal merge. No manual preview deployment or skipped gate.
- [ ] Verify matching automatic Render/Vercel deployment, then one authorized bounded published supervisor/student normal and multi-subject mock journey, AI composition only if an existing provider is configured. Record actual result/analysis parity and safety; do not certify AI from a fake interpreter or 10kcapacity from local tests.
- [ ] Save final counts, SHA/PR/deployment evidence and remaining limitations. Continue the broader design in a separate focused goal; do not reopen existing unrelated audits or perform production cleanup.

## Self-review outcome and handoff

School-first clarification is covered by Tasks1–6: manual and assisted bank creation, material/section composition, one assessment card/workspace, all management operations, grades and per-test skill/subject/section analysis. The five Review Focus failure classes have explicit owner tasks/tests. Old experimental result migration, public anonymous redesign, broader Saher naming and new learning-page controls are outside this first release; their design requirements remain recorded in the spec.

This is a reviewable implementation plan, not implementation evidence. Recommended execution: Native, in the current session, with one fresh final reviewer. Owner review of this written plan and execution-method confirmation are the final prerequisites before product code changes under the architectural design workflow.
