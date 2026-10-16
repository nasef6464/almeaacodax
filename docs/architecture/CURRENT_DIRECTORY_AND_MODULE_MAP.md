Smart teacher quick explanation (2026-10-16, validation pending): QuestionAssistantPanel owns one lazy, explicit entry; QuestionPreview renders only authorized display fields already loaded by its parent. quickTeachingPlan creates a bounded immutable presentation view with optional checkpoints and separate compact solution operations. Existing playback/narration retain local speech, step state and speed; backend reference, cache, authorization, grading and provider ownership unchanged. No collection/query/migration added.

## CI ownership cleanup — 2026-10-16
Legacy refactor-v2 workflows live as unchanged blueprints under .github/workflows-archive/refactor-v2. V3Recovery owns active build/architecture/readiness and the62retained source contracts through scripts/run-preserved-repo-contracts.mjs + preserved-repo-contracts.json. dependency-security-audit.yml retains lockfile security policy. Historical workflow-race/trigger smoke tests read the archive; global PLAN9 certification asserts live V3 coverage. Protected-main required V3 workflows and product module ownership remain unchanged.

## Personal learning completion — VERIFIED_SCOPED — 2026-10-16
quizzes/application/learningCompletion owns exact unique quiz and whole main-topic completion; quizzes/http/learningCompletionRoutes owns own-student scoped GET and indexed result/progress reads. hooks/useLearningCompletion owns user/scope fences and refresh; studentPaths/LearningCompletionSummary owns the shared summary and topic strip. LearningSection/SubjectLearningPage/GenericPathPage integrate existing content with no new persisted progress owner. Existing results/scoring/lesson completion writes remain authoritative. PR562/source cbecbe90, published c059bb3a; bounded published proof in LEARNING_COMPLETION_PUBLISHED_2026-10-16.json.

## Assessment catalog presentation — 2026-10-16
PathMockCatalog + components/AssessmentOrderControl own horizontal admin cards and rank editing; hooks/useAssessmentCatalog owns bounded normalized subject/path loads. MockExamManager retains the existing editor. utils/assessmentCatalogPresentation owns shared matching/priority semantics; server quizzes/application/adminAssessmentCatalogScope owns staff classification predicates. Existing route/auth and scoring ownership retained.

Task2 learner paging (2026-10-15, IN_PROGRESS): shared quizzes/infrastructure schoolAssessmentAudienceEvidence owns canonical target identity and latest school-only evidence. application schoolAssessmentLearners builds bounded page/status/search reads and one whitelisted frozen review after fresh management context; http schoolAssessmentsRouter exposes additive learners/results GETs. SchoolAssessmentReportWorkspace/LearnersPanel/LearnerResult/DetailsDialog render full counts, paged rows and on-demand single review; generic/scoped legacy result APIs remain unchanged. Director learner reads additionally enforce existing SCHOOL_REPORTS_DETAILED_VIEW + SCHOOL_INTELLIGENCE after assessment context. No collection, index, grading or persisted schema change.

Multi-material path mock analytics (2026-10-15, Task6 IN_PROGRESS): quizzes/application quizSubmissionSubjectResults owns canonical question→material attribution and frozen raw counts, independently of overlapping skill links. quizSubmissionSectionResults adds optional subject metadata; quizSubmissionTaxonomyRead fetches only referenced material labels. School report aggregation retains current scoped/latest school evidence, subject coverage and material-scoped section/skill rows. QuizSubjectResults renders per-material learner evidence and preserves unclassified sections/partial coverage; SchoolAssessmentReportView provides the staff hierarchy. assessmentSectionEvidence keeps original section IDs while separating material identities in loaded-detail summaries. No new service/collection or scoring authority.

School assessment commands (2026-10-15, Task5 pending exact CI): quizzes/application schoolAssessmentCommands owns fresh authorization, normalized command identity, transaction orchestration and version fencing; schoolAssessmentCommandOperations owns separated audience/calendar/attempt/in-app effects. infrastructure/schoolAssessmentCommandModel owns durable scalar receipts. The existing school router exposes POST /:id/commands; useSchoolAssessmentCommands preserves retry UUIDs within the loaded staff workspace. Audience-only assignment, individual retake and separate reopening reuse existing UI. quizAccessPolicy now shares fresh learner audience verification across read/start/submit; frozen-content read overlays only current school operational fields. Existing grading/result/provider ownership stays unchanged.

School assessment edit/copy slice (2026-10-14, pending CI): schoolAssessmentEditing owns private draft cloning and immutable-content evidence checks; the existing generic quiz update composes its optimistic draft fence. live-exam access rejects unpublished learner definitions. teacherAssessmentClassScope is the shared canonical school/class×subject authority for authoring/retakes and management reports; stale school/class assignments cannot grant a subject. Frontend SchoolAssessmentManagementActions reuses UnifiedQuizBuilder and protected context/clone APIs. No collection/index/microservice added.

School assessment workspace (2026-10-14, implementation pending CI): quizzes/application schoolAssessmentManagementPolicy owns fresh role/audience/operation context; schoolAssessmentReport owns summary assembly; infrastructure/schoolAssessmentReportRepository owns full-audience Mongo aggregation; http/schoolAssessmentsRouter exposes protected context/report. Frontend supervisorTests SchoolAssessmentSummaryPanel/ReportView consume services/apiGroups/schoolAssessmentsApi and types/schoolAssessments. Existing builders, results and grading retained; no new service or collection. See docs/audits/SCHOOL_ASSESSMENT_WORKSPACE_2026-10-14.md.

Shared-network guard publication VERIFIED (2026-10-14): PR546/merge8d9dbd1c, all3requiredPASS and matching automatic runtime;10bounded published GETs confirm separate ordinary account counters. Existing rateLimitIdentity/rateLimiters/loginProtection/app ownership documented below remains current. No Mongo/schema/query ownership change. See docs/audits/SHARED_NETWORK_REQUEST_PROTECTION_2026-10-14.json; earlier publication-pending note is historical.

Shared network guards (2026-10-14, CI/publication pending): middleware/rateLimitIdentity owns budget-only signature/expiry ID extraction, request-local weak identity and the unchanged public-read exemption predicate. rateLimiters retains Redis/memory policy, adds coarse/heavy source caps and composes the existing sensitive export for both app/classroom consumers. loginProtection preserves source/account boundaries explicitly. app orders coarse guard→cookies→budget identity→existing actor/action/auth guards. No authorization, Mongo query/model/index or service ownership moved. See docs/audits/SHARED_NETWORK_REQUEST_PROTECTION_2026-10-14.md.

Complete authorized report publication VERIFIED (2026-10-14): PR544/mergeb8f8fd8c,19successful/all3requiredPASS and matching automatic runtime;7bounded published GETsPASS, actual indexed join metadata confirmed. Existing modular ownership/query-builder/helper boundaries retained. See docs/audits/SCHOOL_REPORT_COMPLETE_SCOPE_2026-10-14.json. Older pending scope notes are historical.

Complete authorized school report (2026-10-14, CI/publication pending): quizzes/application/quizReportScope exports the shared authority/selector query while retaining the existing capped roster reader. schoolSkillReportJoin owns the database-only canonical identity dedup and indexed SchoolSkillAggregate userId join; schoolSkillAggregateView retains staff guards, formulas, taxonomy and DTO/final limits. No new service or persisted ownership change. See docs/audits/SCHOOL_REPORT_COMPLETE_SCOPE_2026-10-14.md.

Database query repair publication VERIFIED (2026-10-14): PR542/merge3fa30e47, all3required CI PASS, matching Vercel/Render and actual command-index plan verification. Shared model predicate and related taxonomy reader keep existing ownership; no service/API/scoring rewrite. Two declared indexes restored on empty collections; broader scale/HTTP race replay unproven. See docs/audits/DATABASE_INDEX_QUERY_SAFETY_2026-10-14.json.

Database query safety (2026-10-14): models/commandIdempotencyLookup owns the shared literal-string partial-index predicate used by the two existing command models. quizzes/application/quizSubmissionTaxonomyRead owns related Subject/Section label reads for grading; quizSubmissionReadModelContext remains a pure mapper. Existing model/application/route ownership and contracts stay in the modular monolith. CI/publication pending; see docs/audits/DATABASE_INDEX_QUERY_SAFETY_2026-10-14.md.

Student data hardening (2026-10-13, bounded publication VERIFIED on33663b1e, PR538; eight published API groups and18local boundary groups PASS): schools/application/schoolDirectoryScope owns native-ID directory/operational class-school authority with canonical membership and subject-assignment revocation. Auth and content consumers retain routes/DTOs; active-auth middleware owns one fresh principal per request. Teacher summaries stream projected frozen totals with bounded legacy builders; quiz result cache owns per-actor invalidation; schoolSkillReadModel reuses the existing scope/date evidence index for recent five while preserving cumulative totals. No new service, schema/index migration or historic rewrite. See docs/audits/STUDENT_DATA_PERFORMANCE_HARDENING_2026-10-13.md.

## Live sessions — 2026-10-13 (first delivery pending)
Content liveSessions application/http owns canonical Activity/Lesson/Course references, audience/source access, host policy and Mongo resource reservations. Shared React liveSessions components own calendar/booking/hosting presentation. Models remain in the existing monolith; source access batches bounded reads and all media stays external. See docs/audits/LIVE_SESSIONS_MANUAL_DELIVERY_2026-10-13.md; no automatic provider certification or historical backfill.

Student path delivery VERIFIED (2026-10-13): PR533 + PR534, final automatic publication 35f64e62fa6bca59a7e9370718c3327e02215601. 14 bounded runtime groups PASS; 21 successful scoped business requests including logical restore and fixture hiding. Canonical history unchanged,35focused frontend groups +6backend behavior/model +6HTTP/Mongo groups passed, independent review approved, all3required checks passed on both exact heads. See docs/audits/STUDENT_PATH_EXPERIENCE_PUBLISHED_2026-10-13.json. Earlier pending notes are historical; no production-scale/backfill/payment-gateway claim.

Student path experience (2026-10-13): contexts/StudentExperienceContext owns actor-bound presentation selection/settings; components/studentPaths owns enrollment, discovery and standard/simple framing. utils/studentPathScope, studentPathEvidence and useStudentScopedStore project existing metadata/evidence without mutating canonical rows. store/slices/pathEnrollmentActions owns serialized server-confirmed enrollment; modules/auth/application/studentPathPreferences owns validation/CAS persistence through the existing preferences route. Existing auth, taxonomy, commerce and scoring authority retained. Delivery pending CI/live proof.

Course linked tests (2026-10-12): utils/useCourseLinkedQuizzes.ts owns scoped, actor/course-bound metadata reads for explicitly linked assessments/lesson quizzes on the course tests tab. services/adapter.ts preserves course assessment links. CourseOverview renders existing access/visibility guards; no API/RBAC/data changes.

#Auth DTO projection (2026-10-12): server/src/modules/auth/presentation/serializeAuthUser.ts owns the existing unchanged sensitive-field exclusions. The auth route retains learner access projection, administrative history and authorization; extraction keeps the existing 65,000-character ownership gate without changing its limit.

 ALMEAA Current Directory & Module Map

Payment recovery repair (2026-10-12, local verification; delivery pending): server/src/services/paymentFulfillment.ts owns durable approval intent and resumable document-atomic fulfillment. server/src/services/tapWebhook.ts owns provider hash/precision/canonical charge binding. payment.routes retains existing endpoints, provider/manual evidence and audit boundaries. No new service, queue or production data repair.

Premium read policy (2026-10-12): pure server/src/utils/premiumAccess.ts owns missing/invalid/exact-expiry decisions shared by frontend and entitlementPolicy's existing re-export. The browser imports only this pure file, without Mongo or server configuration. Subscription persistence remains commerce-owned.

Courses/packages frontend repair (2026-10-12, locally verified; delivery pending): utils/authSessionLifetime.ts owns ephemeral actor/session generation, contexts/authStoreSync.ts owns existing store synchronization extracted from AuthContext; contexts/authTypes.ts owns the existing compatible re-exported authentication types, utils/courseCompletion.ts owns canonical lesson completion, and utils/paymentRequestPresentation.ts owns financial/activation wording and retry eligibility. Existing pages and course player retain navigation/rendering; enrollment slice retains API dispatch. No new persisted session data or endpoint.

Courses access repair (2026-10-12, local implementation; delivery pending): server/src/services/entitlementPolicy.ts owns shared active Premium, grant provenance, effective ownership and sanitized learner response projection. Course/quiz/certificate/discussion/auth callers retain HTTP/role/entity ownership; discussion preserves its foundation-specific scope. modules/content/application/contentPayloadAccess.ts owns protected bootstrap payload projection; existing managed visibility and metadata builder remain. No persisted history rewrite or route change.


Review practice (2026-10-10): `pages/ReviewSession.tsx` retains private card loading, canonical answers, event idempotency, session lifecycle and local batch retry. `components/review/PracticeSessionHeader.tsx` owns only the mode/progress/exit presentation alongside existing feedback/summary components. Favorites owns current-tab/page entry and ignores stale tab loads. No server/API/data authority moved.


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
School assessment composition: application/schoolAssessmentComposition owns strict bounded specification/AI confinement and preview; CompositionScope owns fresh authoring authority/taxonomy; infrastructure/schoolAssessmentBankRepository owns approved usable canonical bank sampling/counting. CompositionAi accepts the existing authoring gateway; routes/ai exports its adapter, routes/index injects it into the protected router. ComposePanel owns filters/coverage/review; UnifiedQuizBuilder.initialDefinition seeds a new assessment while editingQuiz retains update semantics. No new collection/provider/service.

### School publication evidence ownership — 2026-10-15
server/src/modules/quizzes/application/schoolAssessmentQuestionEvidence.ts owns immutable question revision references, frozen presentation hydration, serving/grading resolution and locked bank reference guards. Existing version repository publishes internal evidence; definition adapter removes it from browser responses; questionBankRoutes enforces guarded mutation. No public route ownership change.

2026-10-15 owner-approved correction supersedes ASSESSMENT-SCHOOL-QUESTION-EVIDENCE publication freeze: no schoolQuestionEvidence capture or read for delivery/grading. Existing central bank remains live during published/active exams, completed result evidence preserved. schoolAssessmentQuestionEvidence.ts now only protects destructive deletion of locked linked questions. Optional GET quiz questionId filter intersects actual authorized refs; hooks/useLiveQuizQuestion owns bounded displayed-question refresh30s/focus/navigation and safe choice clearing without restarting attempt. No collection/index/backfill or public route ownership change.

2026-10-15 result display ownership: components/quiz/QuizSubjectResults owns material-first cards and saved main/subskill evidence; QuizSectionResults owns optional independent timed sections; QuizAnswerDistribution owns correct/wrong/unanswered split. Results reuses these components and existing actions; no data authority or route change.
