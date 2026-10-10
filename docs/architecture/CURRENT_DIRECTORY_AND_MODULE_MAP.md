# ALMEAA Current Directory & Module Map

Assessment windows/retakes (2026-10-10, pending delivery): `quizzes/application/quizAvailability.ts` owns validation and runtime window policy; `quizViewerPolicy.ts` overlays only the requesting student's grant. `http/quizRetakeRoutes.ts` reuses definition-management/audience authority and writes additive `QuizRetake` records. `QuizRetakeDialog` owns selected recipients; `useQuizWindowClock` owns a local boundary timer. Legacy definition, attempt/result and scoring ownership remain intact.

Classroom report read recovery (2026-10-10): `hooks/useClassroomTeacherReports.ts` owns mounted-view summary history loading, pending deduplication, request lifecycle/school isolation and explicit retry for SmartClassroomReportsSection and ClassSkillGapsRadar. Callers retain diagnostics/filter/detail ownership; existing server APIs/authorization unchanged.

Shared-network login (2026-10-10): `server/src/middleware/loginProtection.ts` owns login-only guards; `server/src/modules/auth/application/loginFailureBudget.ts` owns expiring source failure counters with bounded memory/atomic Redis adapters. Existing rateLimiters factory and Redis connection reused; auth route/password authority retained. No new production service.

Password recovery email preparation and scoped dispatch belong to `server/src/modules/auth/application/sendPasswordRecovery.ts`; the auth route retains reset-token creation/verification and user mutation. This bounded extraction retains the existing65,000-character auth-route ownership gate; no raised budget.

Request-read boundary (2026-10-10): `server/src/middleware/classroomRequestReads.ts` owns per-HTTP-request read reuse for student classroom guards/routes. Existing auth middleware and school resolvers retain authority; no cross-request cache, transport/API/model or persisted-data change.

Status: CANONICAL CURRENT-STATE MAP  
Audit branch: `fix/parent-authority-b9`  
Rule: this file describes what exists now. Target architecture is documented separately and must not be mistaken for completed migration.

## 1. Repository shape

Optional school insights (2026-10-10): utils/classSkillMatrix.ts owns read-only composite skill aggregation; SupervisorFollowUpPriorities and SchoolExecutiveSummary render existing bounded data. ClassroomOptionalPulse owns opt-in closed-batch presentation only; ClassroomActiveSessionPanel keeps live data and reviewed support-batch preparation. Existing API/RBAC/scoring/data-access ownership stays unchanged.

Role dashboard presentation (2026-10-10): components/DashboardSectionNav.tsx owns grouping of caller-permitted entries; components/DisplayListControls.tsx owns screen-only incremental rows and complete beforeprint/afterprint restoration. School teacher, supervisor, parent, director and platform-teacher callers keep routing, scope, aggregation and API ownership.

Student tests presentation (2026-10-10): components/SchoolTestsPanel.tsx owns directed-test status/search/cards; components/StudentListPager.tsx bounds rendered rows only. Quizzes and MockExamStudentHub keep loading, access and result ownership. Reports keeps full printable skill rows while bounding student screen rows. No API/data-access ownership change.

Student plan completion (2026-10-10): `pages/Plan.tsx` composes the page; `utils/studentPlanSchedule.ts` owns the existing scheduler, `utils/studentPlanCompletion.ts` owns completion/reference exclusion and pending action selection, and `store/slices/studyPlansSlice.ts` commits only acknowledged own-user API rows. Initial #506 introduced no new endpoints or migration. Bounded evidence: `docs/audits/STUDENT_PLAN_COMPLETION_2026-10-10.md`.

Published verification follow-up: `hooks/useStudentStudyPlans.ts` and `services/apiGroups/studyPlansApi.ts` own a private page-entry read through protected `contentStudyPlanRoutes.ts` (own userId, limit200, no-store). The shared learning bootstrap continues excluding personal plans; App does not overwrite them with the shared empty list. No data migration or per-answer request.

Current branch tree contains 1,466 files.

| Root | Files | Runtime meaning |
|---|---:|---|
| `scripts/` | 318 | smoke/audit/ops tooling; not product runtime |
| `docs/` | 289 | engineering/product/archive documentation |
| `server/` | 276 | API/runtime/server scripts |
| `dashboards/` | 141 | frontend role/admin workspaces |
| `tools/` | 84 | architecture/refactor tooling |
| `pages/` | 69 | route-level frontend screens |
| `components/` | 68 | shared + domain frontend components |
| `.github/` | 49 | CI workflows/support |
| `load-tests/` | 44 | performance evidence/tooling |
| `utils/` | 33 | frontend helpers, some domain-heavy |
| `services/` | 19 | frontend API/integration facade |
| `public/` | 17 | static public assets |
| `store/` | 9 | Zustand facade + extracted slices |
| `deploy/` | 8 | VPS/Docker deployment templates |
| `contexts/` | 2 | frontend context |
| `hooks/` | 1 | shared hook |
| `src/` | 1 | only `src/observability/sentry.ts` today |

Important: the planned frontend `src/app`, `src/core`, `src/features`, and `src/shared` structure is a TARGET, not the current filesystem. Do not bulk-move files merely to make the tree resemble the target.

## 2. Backend current map

`server/src` ownership:
- `models/` — 55 Mongoose models.
- `modules/quizzes/` — 53 files: strongest domain module; application/infrastructure/http/presentation/analytics.
- `modules/schools/` — 14 files: school policy/workspace/application ownership.
- `modules/content/` — 13 files: partial content/bootstrap/http decomposition.
- `routes/` — 29 root route files plus 9 classroom route registrars.
- `services/` — 16 legacy/shared services.
- `modules/notifications/` — 4 files; partial.
- `modules/product-config/` — 4 files.
- `modules/reports/` — 3 files.
- `modules/ai/` — 1 file.
- `modules/auth/` — 1 file.
- `modules/privacy/` — 1 application file; Batch 10 account-erasure lifecycle boundary.
- `modules/public-tests/` — 1 file.
- `app/bootstrap/` — 4 files; healthy composition boundary.
- `middleware/`, `config/`, `sockets/`, `queues/`, `observability/` — cross-cutting runtime infrastructure.

### Backend model to emulate

Teacher directed discovery (2026-10-09): `modules/schools/application/teacherAssessmentClassIds.ts` maps explicit school/class/student audiences onto validated assigned class rosters in the existing teacher workspace. Query and published/owner visibility remain in that reader; route authority remains unchanged.

Directed assessment linkage (2026-10-09): existing director readers delegate explicit school/class/student audience matching to `modules/schools/application/schoolAssessmentAudience.ts`. Frontend supervisor results live separately from the personal store in `dashboards/admin/supervisorTests/useScopedAssessmentResults.ts`; `assessmentReportEvidence.ts` owns target/latest-attempt report derivation. Existing APIs and role guards retain authority; bounded paging/manual refresh and opt-in question review retain the resource boundary.
Smart Classroom already uses thin roots plus role/capability registrars:
`classroom.routes.ts` / `classroomRoot.routes.ts` →
teacher/student/supervisor/batch/template/competition/insights registrars →
school/application authority such as `TeachingAssignment`.

This is the preferred incremental pattern for other large routes.

Teacher-led laboratory evidence (2026-10-09): `modules/schools/application/classroomStudentReport.ts` owns pure per-student/skill derivation from cumulative sent-question evidence. Existing session snapshots retain the result; existing staff aggregate/history registrars serve detail and opt-in compact history. `components/classroom/ClassroomStudentReportTable.tsx` is the shared teacher/archive display. Authority remains in existing school/classroom guards.
The teacher panel delegates school-scoped lazy bank loading to `hooks/useClassroomQuestionBank.ts`; pure batch activation/closure lives in the existing school `classroomLifecycle.ts`. Isolated student report assertions live in `server/src/scripts/smartClassroomStudentReportEvidence.ts`. These extractions preserve the existing runtime hotspot budget.

### Backend hotspots requiring domain-owned decomposition
- `content.routes.ts`: ~2,640 lines, 43 imports, broad content/school/bootstrap responsibilities.
- `quiz.routes.ts`: ~2,350 lines, 66 imports; many application extracts already exist, continue them instead of rewriting.
- `payment.routes.ts`: ~1,930 lines; payment lifecycle/webhooks/admin/settings remain in one transport file.
- `auth.routes.ts`: large mixed transport for account/auth/admin-user/parent/access-code/trainer concerns; Batch 10 extracted account erasure/revocation into `modules/privacy/application/deleteUserLifecycle.ts`, but further decomposition remains domain-owned rather than line-count-driven.
- `ai.routes.ts`: ~1,685 lines; provider runtime/config/use-cases/analytics mixed.
- `publicTests.routes.ts`: ~765 lines; partial application extraction.
- `operations.routes.ts`: ~792 lines; broad diagnostic/read/repair ownership.
- `notification.routes.ts`: ~544 lines after current extraction; still authority/audience/report logic in transport.

Not every route needs splitting: health, search, SEO, review, certificates, activity, question analytics, quiz result facade, and product config are currently small enough unless behavior changes.

## 3. Frontend current map

Current runtime source remains primarily in:
`App.tsx`, `pages/`, `components/`, `dashboards/`, `services/`, `store/`, `utils/`.

Existing decomposition to preserve:
- `dashboards/admin/SchoolsManager/`: 74 files; good incremental feature-folder pattern.
- `pages/Reports/`: 23 extracted report/view-model files.
- `services/apiGroups/`: 13 API domain groups.
- `store/slices/`: 7 extracted Zustand slices.
- `components/classroom/`: 16 domain components.

### Frontend high-change-radius hotspots
- `pages/Reports.tsx` ~2,587 lines.
- `pages/QuizPage.tsx` ~2,412 lines / ~31 local states / ~10 effects.
- `dashboards/admin/PathsManager.tsx` ~2,366 lines / ~47 local states.
- `pages/Dashboard.tsx` ~2,323 lines.
- `PlatformIntegrationsManagerLegacy.tsx` ~2,317 lines.
- `SchoolsManager.tsx` ~2,197 lines / 62 imports; much logic is already extracted, so treat mainly as orchestrator cleanup.
- `Results.tsx` ~2,185 lines.
- `FinancialManager.tsx` ~2,135 lines.
- `AdminDashboard.tsx` ~2,093 lines.
- `QuestionBankManager.tsx` ~1,943 lines / ~27 states.
- `QuizzesManager.tsx` ~1,981 lines.
- `store/useStore.ts` ~1,772 lines / ~85 API calls.
- `App.tsx` ~1,706 lines and owns router + SEO + bootstrap + prefetch + compatibility navigation.
- `Header.tsx` ~1,437 lines / ~25 states.
- `Quiz.tsx` ~1,428 lines.
- `PublicBarcodeTestsManager.tsx` ~1,250 lines / ~43 states.
- `AiAssistantManager.tsx` ~1,236 lines.
- `CoursePlayer.tsx` ~1,076 lines / ~8 effects.

Line count is only a signal. Split when responsibilities, state ownership, authorization, network orchestration, or change radius are mixed.

## 4. Canonical ownership boundaries

| Concern | Canonical direction | Compatibility still present |
|---|---|---|
| School membership | `SchoolMembership` | `User.schoolId`, some Group/User readers |
| Teacher class/subject authority | `TeachingAssignment` | `User.groupIds`, `Group.supervisorIds` readers |
| School entitlement | `SchoolContract.modules` | legacy school/package context in some routes |
| Parent/student authority | `ParentStudentRelationship` on Batch 9 branch | `User.linkedStudentIds` fallback until backfill/cutover |
| Paid/content access | `AccessGrant` | `User.subscription.purchased*`, enrollment mirrors |
| Assessment historical production record | `QuizResult` until verified cutover | additive assessment Version/Assignment/Attempt/Response layer |
| Notification delivery | `NotificationDelivery` + Redis + BullMQ | some legacy audience resolution |
| Account erasure / privacy lifecycle | `modules/privacy/application/deleteUserLifecycle.ts` + `PRIVACY_DATA_LIFECYCLE_RETENTION_MATRIX.md` | exact retention durations for retained history remain policy-dependent |
| Media | external URL/CDN references; production question images verified on Cloudflare R2 public delivery | application stores URL/key metadata; R2 object bytes require independent recovery evidence |
| Disaster recovery | `DISASTER_RECOVERY_RUNBOOK.md` + verified Mongo/R2 backup/restore scripts + fail-closed `.github/workflows/production-dr-backup.yml` | scheduler code exists; live secret-backed runs, independent off-site evidence and measured full restore drills remain deployment evidence. A FREE Frankfurt recovery/staging Atlas cluster exists and is not production. |
| Production release identity | `server/src/observability/releaseIdentity.ts` + health payload + post-deploy identity smoke | Vercel is the frontend release owner; Render backend SHA must match the intended GitHub release before closure |

## 5. Runtime areas that should NOT be restructured for appearance

- `server/src/app/bootstrap/*`: explicit startup/shutdown composition is already healthy.
- notification SSE realtime bridge: event-driven Redis/local fan-out; Mongo is read once for initial unread count, not continuously polled.
- BullMQ weekly scheduler: distributed Sunday 08:00 Asia/Riyadh scheduler already exists.
- Smart Classroom route registrar pattern.
- Vite root + nested `server` package topology unless a measured deployment need justifies change.
- API/PWA rule that API responses are not service-worker cached.
- current production deployment ownership is Vercel frontend → Vercel `/api` rewrite → Render backend; Hostinger/VPS and Docker remain secondary/recovery paths until an explicit cutover.

## 6. Resource / bandwidth map

Current product media contract stores URLs for lesson/library/video/image resources. The Node API is not the normal binary-media CDN and no first-party binary upload runtime is currently exposed.

Target:
- Cloudflare-backed object/media delivery for heavy images/media.
- DB stores URL/key + metadata, not binary blobs.
- direct/presigned upload when first-party uploads are introduced and security permits.
- protected assets use an authorization/signed-delivery contract rather than proxying all bytes through Node.
- immutable/versioned frontend assets remain edge-cacheable.
- API/private responses remain authorization-aware and are not blindly CDN cached.
- Batch 13 measures origin egress, payload bytes, request counts, cache hit behavior, SSE/socket traffic and bootstrap duplication before optimization.

Read-only production inspection on 2026-09-20 confirmed 1,768 question documents with `imageUrl` values on `*.r2.dev/questions/pilot/...`. This proves current R2-backed media references, not R2 recoverability. Cloudflare bucket policy, independent backup destination, access controls and recovery drill remain live verification items.

## 7. Agent navigation rules

Before changing a feature:
1. locate its domain in this map and `MODULE_CATALOG.md`;
2. inspect canonical authority and compatibility readers;
3. modify the owning module, not a convenient unrelated UI;
4. extract worthwhile boundaries while the batch is open;
5. add focused contracts;
6. run typecheck/build/domain tests/exact-head CI;
7. update maps if authority or ownership changed.

Do not use stale generated migration maps as automatic move instructions. `generated/CURRENT_REPOSITORY_AUDIT.md` and `generated/MIGRATION_MAP_V2_CANDIDATE.json` are historical snapshots from an older head and must be regenerated before using their counts/targets as current evidence.


## 8. Batch 13 measured-performance boundary — 2026-09-20

Batch 13 owns measurement and certification, not speculative optimization. The current load-tooling boundary is now explicit: both k6 journey and the legacy Autocannon endpoint runner require one selected profile per invocation (`pilot`, `scale500`, or `scale1000`), defaulting to the safe pilot tier. Evidence files are profile-specific so one scale tier cannot overwrite another.

No runtime product module was split merely for size in this checkpoint: inspection found the concrete responsibility defect in load orchestration itself (implicit escalation across capacity tiers). Live 500/1000-user certification remains blocked until exact release identity, Redis-backed scale readiness, production-like Render capacity/metrics, Atlas metrics, and queue/realtime/provider evidence are available.


### Batch 13 final repository-side checkpoint

Performance ownership now includes: isolated load profiles; profile-specific evidence; bootstrap cache counters; bounded authenticated queue/realtime scale metrics; decoded-vs-wire-byte read baseline evidence; and keyset-paged notification campaign audience resolution. No frontend/domain bulk move is part of Batch 13. Remaining certification evidence is deployment/infrastructure-owned and must not be replaced with speculative code refactors.

## Interactive teaching board ownership — 2026-10-08
- CompactTeachingPlan appends a validated trusted final option value to the final lesson scene only; ai.routes retains owned-review authority and result snapshot/current-question answer source selection. No grading or answer-key persistence ownership moves.
- QuestionAssistant's internal structuredBoard option isolates trusted context from legacy prose output rules; CompactTeachingPlan owns bounded1–3 solution items and legacy string compatibility. Public board contract remains unchanged.
- contracts/checkpointHints.ts owns answer-free procedural checkpoint coaching shared by server/browser validation, including old cached plans. Browser boardText.ts owns narrowly observed prose separator cleanup without modifying mathematical n or LaTeX commands. Compact provider schema no longer requests hint content.
- components/results/teaching/spokenMath.ts owns bounded local Arabic/English speech preparation; narrationEngine selects an available matching voice, preferring local voices. Board expressions and server contracts remain unchanged.
- application/compactTeachingPlan.ts owns the compact provider schema, language preference and deterministic content-to-storyboard compiler. Provider adapters receive this schema only for board generation; the browser wire contract remains storyboard_v1.
- PracticeCheckpoint.tsx owns attempt input and local progressive hints; useTeachingPlayback owns the checkpoint pause. Existing question assistant owns generated feedback, without grading authority.
- server/src/modules/ai/contracts/teachingStoryboard.ts is a pure browser/server wire contract and validator; it imports no database, provider or Node runtime. The frontend consumes this contract without bundling gateway code.
- server/src/modules/ai/application/questionTeachingPlan.ts owns planner instructions and validated string-cache normalization; ai.routes.ts retains review authority, budgets and provider routing.
- components/results/teaching/ owns deterministic board state, narration abstraction, local playback and rendering. InteractiveSmartTeacher owns conversation and main/follow-up lesson selection; whiteboardParser remains legacy fallback.
- Teaching provider adapter ownership unchanged: `aiProviderAdapters.ts` owns model-specific board thinking/budget compatibility and actual called-model metadata; `ai.routes.ts` consumes it. The 3.8 fallback uses low thinking and a bounded combined budget; ordinary chat remains unaffected. See the 2026-10-08 real-provider audit; live certification remains partial.
- `components/results/teaching/boardText.ts` also normalizes known LaTeX wrappers/operators in prose fragments consumed by TeachingBoard; equations continue using bounded, untrusted KaTeX. No new ownership or API shape.

### Supervisor frontend scope repair — 2026-10-08
`utils/supervisorSchoolScope.ts` owns frontend resolution of explicit school versus assigned class/private-group scope for `AdminDashboard`, `SupervisorDashboard` and `supervisorTests/useSupervisorAssessmentScope`. Backend authority remains `quizSupervisorScope.ts` and its repository; no API, role or persistence ownership changed. Behavioral parity is executed by `scripts/smoke-supervisor-scope-parity.mjs`, included in the supervisor smoke.


## Classroom waiting and prepared batches — 2026-10-09
`ClassroomSavedBatchesPanel` owns lazy scoped template reads and dispatch through the existing append API; the active panel shares its push lock and reload. `ClassroomStudentWaitingPanel` owns idle student presentation; student session/join/realtime/submission remain in `ClassroomStudentLive`. Existing persisted templates and batch/report models stay authoritative.

### Classroom same-origin transport — 2026-10-09
`hooks/useClassroomRealtime.ts` retains one credentialed shared transport. `vercel.json` forwards its existing `/socket.io/:path*` path to the same Render API host before SPA fallback, with no-store; server socket authority and classroom rooms remain in `server/src/sockets/`. Proxy delivery is verified by `scripts/smoke-classroom-proxy-realtime.mjs`.

## School assessment evidence refinement — 2026-10-09
- `quizStudentAssessmentEvidence.ts` owns answered/result vs unassessed classification in existing scoped overview; no new database query.
- `supervisorTests/assessmentSkillEvidence.ts` owns taxonomy-aware question-weighted report grouping; `AssessmentClassComparison.tsx` renders loaded-target/latest-result comparisons with participation and no unassessed-zero scoring. No new polling, service or personal-store mutation.
- Classroom24-client API persistence passed; p95 latency11.339s and fullbrowser measurement remain unresolved. Audit: `docs/audits/SCHOOL_ASSESSMENT_QUALITY_AND_CLASS_LOAD_2026-10-09.md`.

### School report roster propagation
SupervisorDashboard local scopedStudentUsers is passed to SupervisorTestsManager/useSupervisorAssessmentScope/TestAnalyticsReport (direct and comparison). Personal/global users and results remainisolated; existing paged roster query is reused. AssessmentClassComparison also intersects loaded groupstudentIds with reporttargets; no additional dataquery.

## Staff report presentation — 2026-10-10
`pages/Reports/StaffDecisionPanel.tsx`, `DirectedAssessmentReportPanel.tsx`, `StaffRemediationPanel.tsx`, and `ScopedRecentAttemptsPanel.tsx` own existing staff JSX. Reports retains data reads, state, scoping and actions. No additional requests, store, timer, API or result persistence ownership.


## Student platform/school context reports — 2026-10-10
StudentJourneySourcesPanel owns context-specific loaded reports; StudentResultHistoryControls owns history selection/coverage; useStudentResultHistory owns bounded personal paging and stale response suppression; studentLearningContext owns labels and explicit origin selection. Existing Quizzes/Reports compose them. Overall mastery/plan authority remains unchanged.

- Older attempt detail: useStudentResultDetail owns a single on-demand existing protected /quiz-results/:id read with actor/request identity isolation; Results composes it. Quizzes and the source report panel link by persisted result ID. No global result hydration or history traversal.


## New question activity provenance — 2026-10-10
Question activity provenance: application/questionActivityProvenance owns canonical quiz type, existing access/target guards and question membership before metadata writes; adaptiveTelemetryRoutes composes it. utils/studentQuestionActivity owns disjoint answered-activity counts; existing store slice retains server metadata.
