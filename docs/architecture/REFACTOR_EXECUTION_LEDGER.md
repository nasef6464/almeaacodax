# ALMEAA — Refactor Execution Ledger

## قواعد التسليم

`Inspect → Baseline → One concern → Focused tests → Builds/gates → Document → Commit → Push`

## المنجز قبل هذه الخطة

- API groups: auth, payments, learning support, taxonomy/content.
- School store/API typing stabilization.
- Paths: readiness helper وdisplay presentation وURL-state helper.
- Results score presentation وDashboard path progress projection.
- Runtime cycles/import safety: 0/0 في HEAD الحالي.

## الدفعات القادمة

| Batch | النطاق | الحالة | شرط الخروج |
|---|---|---|---|
| P0-01 | Notification event fan-out | COMPLETED | نفس SSE contract، isolation tests، Redis path |
| P0-02 | Weekly report distributed scheduling | COMPLETED | queue، lock، idempotency، retry، no duplicate send |
| P0-03 | Bootstrap and unbounded reads | IN PROGRESS | scoped/paginated endpoints وpayload budget |
| P1-01 | PWA API cache classification | PLANNED | allowlist public/safe فقط |
| P1-02 | Assessment backend boundary map | PLANNED | ownership/contracts قبل extraction |
| P1-03 | Student result-to-skill loop | PLANNED | evidence-backed recommendation/content links |

## P0-00 — PWA/authenticated API cache safety

- Status: COMPLETED on `refactor/modular-platform-safe`, code commit `81aaee59`.
- Changed: removed broad Workbox runtime caching for `/api/*` from `vite.config.ts`.
- Preserved: HTML navigation cache, immutable assets, explicit public application cache in `services/api.ts`, URLs/API behavior, and authenticated request flow.
- Added: deployment cache contract assertions preventing broad API cache regression.
- Tests: typecheck PASS; frontend build PASS; `smoke:deployment-cache` PASS; `smoke:route-loading` PASS; `smoke:runtime-source` PASS; architecture gate PASS.
- Next: P0-01 notification fan-out inspection.

## P0-01 — Notification realtime fan-out

- Status: COMPLETED in `3150eb67` on `refactor/modular-platform-safe`.
- Changed: added a notification realtime bridge with per-process listeners and optional Redis pub/sub; persisted in-app deliveries publish events after `insertMany`; SSE keeps the existing endpoint and event names while doing one initial unread count instead of Mongo polling per connection.
- Preserved: `/api/notifications/stream`, `connected`/`notification`/`unread_count` events, notification delivery persistence, auth flow, notification read/update routes, and local fallback when Redis is unavailable.
- Added: focused source contract `smoke:notification-realtime` and lifecycle startup/shutdown wiring.
- Tests: `smoke:notification-realtime` PASS (4/4); `smoke:notifications` PASS; `typecheck` PASS; `server:check` PASS; `server:build` PASS; `build` PASS; `architecture-gate` PASS; `smoke:route-loading` PASS; `smoke:runtime-source` PASS.
- Known limitation: realtime delivery is not load-certified yet; Redis availability and multi-instance behavior require staging/load verification in a later gate.
- Next: P0-02 weekly report distributed scheduling.

## P0-03A — Parent progress bounded reads

- Status: COMPLETED in `f14a9576` on `refactor/modular-platform-safe`.
- Changed: `GET /api/parent/children-progress` now uses Mongo aggregation for weekly study seconds and the latest result per child instead of loading all weekly and historical result documents into Node memory.
- Preserved: endpoint URL/method, auth and parent role guard, child scope, response fields (`children`, `summary`, `weeklyStudyMinutes`, `lastQuizScore`, `weakSkills`), and scoring/skill interpretation.
- Query/index alignment: uses the existing `QuizResult` `userId + createdAt` index shape; no schema or migration change.
- Added: `smoke:parent-progress-bounded` contract (4/4).
- Tests: parent bounded-read 4/4; student learning journey 7/7; reports role 20/20; school scope 4/4; notification realtime 4/4; weekly scheduler 4/4; typecheck/server check/server build/frontend build/repository audit/architecture gate PASS.
- Known limitation: this closes only the parent progress hotspot. Taxonomy/content bootstrap and operations status remain candidates for P0-03B; scale/load certification is not claimed.
- Next: inspect and bound taxonomy bootstrap or operations status without changing its response contract.

## P0-03B — Operations-only content bootstrap

- Status: COMPLETED in `057dee2a` on `refactor/modular-platform-safe`.
- Changed: added the additive `scope=operations` mode to `/api/content/bootstrap`; it returns the existing payload shape while skipping topics, lessons, library items, and study plans. The admin `SchoolsManager` now uses this mode for school refresh/verification calls.
- Preserved: existing `scope=full` and `scope=learning` behavior, response keys, school operational data, auth/scope rules, cache invalidation, and public route/API contracts.
- Added: `smoke:content-operations-bootstrap` contract (4/4).
- Tests: content operations 4/4; student learning journey 7/7; reports role 20/20; school portal 16/16; school scope 4/4; notification realtime 4/4; weekly scheduler 4/4; parent bounded-read 4/4; typecheck/server check/server build/frontend build/repository audit/architecture gate PASS.
- Known limitation: this removes unnecessary learning payload from the school-management path; taxonomy full bootstrap and operations status still need separate bounded-read work. Scale/load certification remains unproven.
- Next: P0-03C operations read-memory optimization.

## P0-03C — Operations read-memory optimization

- Status: COMPLETED in `8620b20b` on `refactor/modular-platform-safe`.
- Changed: admin operational bootstrap queries and the existing operations status read contract now use lean/plain documents; added `smoke:operations-read-memory` to protect the memory-oriented boundary and explicit projections.
- Preserved: response shapes, route URLs/methods, admin authorization, operational scope, sorting, cache behavior, and all database schema semantics.
- Tests: operations read-memory 4/4; student learning journey 7/7; reports role 20/20; school portal 16/16; school scope 4/4; typecheck/server check/server build/frontend build/repository audit/architecture gate PASS.
- Known limitation: `.lean()` reduces Mongoose document overhead but does not by itself paginate the underlying collections. Taxonomy payload adjacency and true production load certification remain open.
- Next: inspect taxonomy bootstrap skill-adjacency payloads and choose one additive contract-preserving boundary.

## P0-03D — Compact learner taxonomy bootstrap

- Status: COMPLETED in `082ab527` on `refactor/modular-platform-safe`.
- Changed: added the additive `phase=compact` variant for the public taxonomy bootstrap. It preserves paths, levels, subjects, sections, and skill identity/classification, but excludes each skill's `lessonIds` and `questionIds` adjacency arrays. Learning routes use `core` first, then this compact variant; staff still receive the existing `full` response for authoring tools.
- Preserved: `/api/taxonomy/bootstrap` URL/method and existing `core`/`full` semantics, response top-level shape, visibility rules, cache partitioning, staff authorization, store normalization defaults, database schema, and all quiz/assessment contracts.
- Tests: taxonomy compact 5/5; student learning journey 7/7; reports role 20/20; school portal 16/16; school scope 4/4; typecheck/server check/server build/frontend build/repository audit/architecture gate PASS.
- Known limitation: this reduces client payload for the learner path but does not prove production latency or database throughput at scale. Administrative full taxonomy remains intentionally complete for authoring until it has a dedicated paginated UI contract.
- Next: P0-04 runtime/query/payload measurement baseline for high-volume reads.

## P0-04 — Runtime/query/payload measurement baseline

- Status: COMPLETED in the current checkpoint after `23fa7544` on `refactor/modular-platform-safe`.
- Changed: added `scripts/measure-read-baseline.mjs` with an explicit-target safety gate, bounded sequential sampling, and measurements for status, duration, payload bytes, and existing cache headers. Added `docs/architecture/RUNTIME_READ_BASELINE.md` and a source contract for reproducibility.
- Preserved: no product/runtime behavior, database schema, API contracts, authentication, or production configuration changed. The harness performs no request unless the operator supplies `ALMEAA_MEASURE_BASE_URL`.
- Tests: read-baseline plan PASS; read-baseline contract 5/5; typecheck/server check/server build/frontend build/architecture gate/student/report/school smoke PASS.
- Known limitation: this is instrumentation and a low-impact baseline harness, not a load test. Production capacity for 80k questions, 20–30k users, hundreds of thousands of attempts, images, videos, and reports remains `NOT PROVEN` until an authorized staging benchmark supplies raw metrics.
- Next: select an authorized staging benchmark window and prepare dataset/concurrency budgets across learner, assessment, reports, notifications, and school operations.

## 2A-01 — Quiz submission side-effects boundary

- Status: COMPLETED in `3651e0ec` on `refactor/modular-platform-safe`.
- Changed: extracted quiz-submission side effects into `server/src/modules/quizzes/application/quizSubmissionSideEffects.ts`: skill-progress updates from results and question attempts, spaced-repetition review-card upserts, and non-critical result notifications. `quiz.routes.ts` now delegates to the module while retaining route orchestration and the compatibility facade.
- Preserved: quiz submit URL/method, authentication and directed-quiz checks, max-attempt behavior, time-window checks, question ordering, scoring, skill analysis, result snapshot, idempotent submission key, response serialization, notification wording, and persisted schema semantics.
- Tests: assessment side-effects 6/6; quiz integrity 4/4; auth login security 9/9; API security 6/6; student learning journey 7/7; reports role 20/20; school scope 4/4; school portal 16/16; typecheck/server check/server build/architecture gate PASS.
- Known limitation: definition/selection/publish, session/attempt, and scoring boundaries remain in the legacy route and are intentionally separate future batches. No production load certification is claimed.
- Next: map quiz definition, question selection, and publish validation into the next compatible application boundary without changing scoring or persistence semantics.

## 2A-02 — Quiz question integrity boundary

- Status: COMPLETED in `2f8a3170` on `refactor/modular-platform-safe`.
- Changed: extracted question-reference/content validation into `server/src/modules/quizzes/application/quizQuestionIntegrity.ts`. Create/update publish checks and admin integrity report/repair now reuse the application boundary; the route remains responsible for HTTP response mapping and truncating diagnostic IDs where required.
- Preserved: missing/invalid question detection, copy-suffix resolution, usability rules, publish error messages/statuses, integrity report and repair behavior, route URLs/methods, authorization, database schema, scoring, and quiz submission behavior.
- Tests: quiz integrity 4/4; quiz question presentation boundary PASS; quiz definition boundary PASS; quiz query-schema boundary PASS; assessment side-effects 6/6; student journey 7/7; reports 20/20; school scope 4/4; school portal 16/16; server check/build and architecture gate PASS.
- Known limitation: definition normalization, selection, publish orchestration, session/attempt, and scoring remain separate future boundaries. No production load certification is claimed.
- Next: map quiz definition normalization and publish orchestration into the next compatible application boundary without changing scoring or persistence semantics.

## 2A-03 — Quiz placement normalization boundary

- Status: COMPLETED in `7dd90ec5` on `refactor/modular-platform-safe`.
- Changed: extracted pure `normalizeQuizPlacementPayload` logic into `server/src/modules/quizzes/application/quizPlacement.ts`; create/update routes retain parser calls and delegate placement/type derivation through the application boundary.
- Preserved: public route URLs/methods, parser behavior, `quizKind`, `type`, `placement`, `showInTraining`, `showInMock`, legacy placement-field inference, public/all access normalization, mock defaults, publish checks, and persistence/scoring semantics.
- Tests: quiz definition boundary PASS; quiz query-schema boundary PASS; quiz integrity 4/4; assessment side-effects 6/6; server check/server build; repository audit; architecture gate PASS.
- Known limitation: definition parser ownership, selection, publish orchestration, sessions/attempts, and scoring remain separate future boundaries. No production load certification is claimed.
- Next: map quiz definition parser/publish orchestration into the next compatible application boundary without changing scoring or persistence semantics.

## 2A-04 — Quiz question selection boundary

- Status: COMPLETED in `8c0b81cc` on `refactor/modular-platform-safe`.
- Changed: extracted `getQuizQuestionIds` and `resolveQuizSkillIds` into `server/src/modules/quizzes/application/quizQuestionSelection.ts`; the route now delegates question identity/skill resolution while retaining HTTP, persistence, and scoring orchestration.
- Preserved: mock-section precedence, regular-question fallback, duplicate normalization, skill lookup semantics, question order, route URLs/methods, quiz publish/update behavior, submission behavior, and database schema.
- Tests: assessment question selection 5/5; quiz integrity 4/4; definition/query boundaries PASS; assessment side-effects 6/6; student journey 7/7; reports 20/20; school scope 4/4; school portal 16/16; server check/build/repository audit/architecture gate PASS.
- Known limitation: definition parser/publish orchestration, sessions/attempts, and scoring remain separate future boundaries. No production load certification is claimed.
- Next: map quiz definition parser/publish orchestration into the next compatible application boundary without changing scoring or persistence semantics.

## 2A-05 — Quiz workflow boundary

- Status: COMPLETED in `3432aa59` on `refactor/modular-platform-safe`.
- Changed: extracted `getWorkflowDefaults` and `sanitizeWorkflowUpdate` into `server/src/modules/quizzes/application/quizWorkflow.ts`; create/update flows now delegate workflow ownership and publication sanitization while the route retains HTTP, authorization, persistence, and scoring orchestration.
- Preserved: admin/supervisor/teacher/default ownership metadata, approval transitions, publication restrictions, timestamps, route URLs/methods, database schema, scoring, and RBAC behavior.
- Tests: assessment workflow 3/3; assessment question selection 5/5; quiz integrity 4/4; definition/query boundaries PASS; student journey 7/7; reports 20/20; school scope 4/4; school portal 16/16; auth/API security PASS; frontend build; server check/build; repository audit; architecture gate PASS.
- Known limitation: publication decision, inline-question persistence, sessions/attempts, and scoring remain future boundaries. No production load certification is claimed.
- Next: map quiz publication decision/policy into the next compatible application boundary without changing scoring, persistence, or authorization semantics.

## 2A-06 — Quiz publication policy boundary

- Status: COMPLETED in `3014a2c4` on `refactor/modular-platform-safe`.
- Changed: extracted `isQuizPowerRole` and `resolveQuizPublicationState` into `server/src/modules/quizzes/application/quizPublicationPolicy.ts`; the create route delegates the publication decision while retaining integrity validation, authorization, persistence, and scoring orchestration.
- Preserved: admin/supervisor publication authority, teacher/student non-publication behavior, explicit `isPublished` handling, question-count default, route URLs/methods, database schema, and RBAC behavior.
- Tests: assessment publication 4/4; workflow 3/3; question selection 5/5; quiz integrity 4/4; auth/API security PASS; server check/build; repository audit; architecture gate PASS.
- Known limitation: inline-question persistence, sessions/attempts, and scoring remain future boundaries. No production load certification is claimed.
- Next: map inline-question creation orchestration into a compatible questions/quiz application boundary without changing persistence or authorization semantics.

## 2A-07 — Inline-question creation boundary

- Status: COMPLETED in `a2db9f33` on `refactor/modular-platform-safe`.
- Changed: extracted inline-question normalization and creation orchestration into `server/src/modules/quizzes/application/quizInlineQuestions.ts`; the route supplies the existing `QuestionModel.create` adapter and remains responsible for authorization and attaching IDs to the quiz.
- Preserved: string-reference handling, existing-ID handling, generated IDs, option normalization, default text/type, path/subject fallback, owner metadata, sequential creation order, route URLs/methods, database schema, and RBAC behavior.
- Tests: assessment inline-question contract 4/4; publication 4/4; workflow 3/3; question selection 5/5; integrity 4/4; typecheck; server check/build; frontend build; repository audit; architecture gate PASS.
- Known limitation: quiz-definition assembly, sessions/attempts, and scoring remain future boundaries. No production load certification is claimed.
- Next: map quiz-definition assembly and persistence orchestration into the next compatible application boundary without changing database semantics or API contracts.

## 2A-08 — Quiz definition document boundary

- Status: COMPLETED in `81d3df1e` on `refactor/modular-platform-safe`.
- Changed: extracted pure `buildQuizCreateDocument` into `server/src/modules/quizzes/application/quizDefinitionDocument.ts`; the route still owns validation, authorization, integrity checks, and `QuizModel.create` persistence.
- Preserved: field precedence, generated IDs, workflow metadata, approval status, publication state, platform visibility default, skill IDs, route URLs/methods, database schema, and RBAC behavior.
- Tests: definition-document 4/4; publication 4/4; inline-question 4/4; workflow 3/3; selection 5/5; integrity 4/4; student journey 7/7; reports 20/20; school scope 4/4; school portal 16/16; typecheck/server check/build/frontend build; repository audit; architecture gate PASS.
- Known limitation: update document assembly, sessions/attempts, and scoring remain future boundaries. No production load certification is claimed.
- Next: map quiz update document assembly into the next compatible application boundary without changing database semantics or API contracts.

## 2A-09 — Quiz update document boundary

- Status: COMPLETED in the current checkpoint on `refactor/modular-platform-safe`.
- Changed: extracted pure `buildQuizUpdateDocument` into `server/src/modules/quizzes/application/quizUpdateDocument.ts`; update route delegates payload/skill-field composition before workflow sanitization.
- Preserved: normalized payload fields, optional skill replacement semantics, workflow sanitization, publication integrity validation, `findOneAndUpdate` persistence, route URLs/methods, database schema, and RBAC behavior.
- Tests: update-document 4/4; definition-document 4/4; publication 4/4; inline-question 4/4; workflow 3/3; selection 5/5; integrity 4/4; student journey 7/7; reports 20/20; school scope 4/4; school portal 16/16; typecheck/server check/build/frontend build; repository audit; architecture gate PASS.
- Known limitation: validation-state composition, sessions/attempts, and scoring remain future boundaries. No production load certification is claimed.
- Next: map quiz validation-state composition into the next compatible application boundary without changing integrity, persistence, or API contracts.

## 2A-10 — Quiz validation-state boundary

- Status: COMPLETED in the current checkpoint on `refactor/modular-platform-safe`.
- Changed: extracted pure `buildQuizValidationState` into `server/src/modules/quizzes/application/quizValidationState.ts`; the route still owns sanitization, integrity validation, persistence, and response mapping.
- Preserved: merge precedence of existing, normalized, and sanitized fields; publication integrity behavior; `findOneAndUpdate` persistence; route URLs/methods; database schema; and RBAC behavior.
- Tests: validation-state 4/4; update-document 4/4; definition-document 4/4; publication 4/4; inline-question 4/4; integrity 4/4; student journey 7/7; reports 20/20; school scope 4/4; school portal 16/16; typecheck/server check/build/frontend build; repository audit; architecture gate PASS.
- Known limitation: session/attempt preparation, submission, and scoring remain future boundaries. No production load certification is claimed.
- Next: map quiz session/attempt preparation into the next compatible application boundary without changing submission, scoring, or persistence semantics.

## 2A-11 — Question-attempt document boundary

- Status: COMPLETED in the current checkpoint on `refactor/modular-platform-safe`.
- Changed: extracted pure `buildQuestionAttemptDocument` into `server/src/modules/quizzes/application/questionAttemptDocument.ts`; the route still owns question lookup, correctness calculation, `QuestionAttemptModel.create`, and skill-progress side effects.
- Preserved: attempt payload, selected index, correctness value, user/date metadata, question path/subject/section/skills mapping, route URLs/methods, database schema, and scoring behavior.
- Tests: question-attempt document 4/4; validation-state 4/4; update-document 4/4; publication 4/4; inline-question 4/4; integrity 4/4; student journey 7/7; reports 20/20; school scope 4/4; school portal 16/16; typecheck/server check/build/frontend build; repository audit; architecture gate PASS.
- Known limitation: submission attempt-context, sessions, and scoring remain future boundaries. No production load certification is claimed.
- Next: map quiz submission attempt-context preparation into the next compatible application boundary without changing submission, scoring, or persistence semantics.

## 2A-12 — Quiz attempt-context boundary

- Status: COMPLETED in `756b6f87` on `refactor/modular-platform-safe`.
- Changed: extracted `getQuizMaxAttempts`, `getQuizPassingScore`, and `buildSubmissionKey` into `server/src/modules/quizzes/application/quizAttemptContext.ts`; the submission route retains attempt counting, limit enforcement, question resolution, scoring, and persistence orchestration.
- Preserved: default/max-attempt normalization, score clamping, idempotency key format, attempt numbering, route URLs/methods, database schema, submission behavior, and scoring semantics.
- Tests: attempt-context 4/4; question-attempt 4/4; validation-state 4/4; update-document 4/4; publication 4/4; inline-question 4/4; integrity 4/4; reports 20/20; typecheck/server check/build/frontend build; repository audit; architecture gate PASS.
- Known limitation: question-resolution context, sessions, and high-volume attempt/result load certification remain future work. No production load certification is claimed.
- Next: map quiz submission question-resolution context into the next compatible application boundary without changing submission, scoring, or persistence semantics.

## 2A-13 — Quiz submission question-resolution boundary

- Status: COMPLETED in `7256a7fe` on `refactor/modular-platform-safe`.
- Changed: extracted `buildQuizQuestionLookup` and `resolveOrderedQuizQuestions` into `server/src/modules/quizzes/application/quizSubmissionQuestions.ts`; the route retains the database query, scoring loop, result persistence, and post-submission side effects.
- Preserved: canonical-ID lookup, `_copy` suffix fallback, quiz question order, question-by-ID map passed to side effects, empty-question protection, route URLs/methods, database schema, submission behavior, and scoring semantics.
- Tests: submission-question resolution 4/4; attempt-context 4/4; quiz integrity 4/4; student journey 7/7; auth/API security PASS; repository audit; architecture gate PASS; typecheck/server build and frontend build executed without errors.
- Known limitation: scoring summary, sessions, and high-volume attempt/result load certification remain future work. No production load certification is claimed.
- Next: map quiz submission scoring summary into the next compatible application boundary without changing submission, scoring, or persistence semantics.

## 2A-14 — Quiz submission result-composition boundaries

- Status: COMPLETED in focused commits `d1ea2fbf`, `41cea103`, `9b8ba9f7`, `626a8575`, `aa94a49f`, and `301e11c0` on `refactor/modular-platform-safe`.
- Changed: extracted pure submission-answer review/skill aggregation, score summary, skill analysis, mock-section results, immutable quiz snapshot, and result-document composition into `server/src/modules/quizzes/application/`. The route still resolves the authenticated user and directed scope, reads persistence models, enforces attempt limits, calls `QuizResultModel.create`, translates duplicate-key conflicts, invokes side effects, clears the result cache, and serializes the response.
- Preserved: `POST /api/quizzes/:id/submit`, auth/RBAC and directed-quiz checks, time-window and max-attempt behavior, question order/copy fallback, score and passing calculations, question-review/result/snapshot field semantics, idempotency key/conflict behavior, side effects, response serialization, Mongo schema, and all route/API URLs.
- Tests: answer-review, score-summary, skills-analysis, section-results, snapshot, result-document, and question-resolution contracts PASS; `server:check` and `server:build` PASS; route loading, runtime source, quiz integrity, auth-login security, and API security contracts PASS.
- Known limitation: current frontend dependency installation on this host did not finish, so this batch does not claim a fresh frontend typecheck/build, repository audit, or architecture-gate run. No production load certification is claimed.
- Next: map directed-quiz submission authorization and attempt orchestration only after preserving every existing RBAC and attempt-limit contract.

## 2A-15 — Quiz submission directed-scope boundary

- Status: COMPLETED in `c6baa474` on `refactor/modular-platform-safe`.
- Changed: extracted pure target-group/user normalization and the exact group-membership-check predicate into `quizSubmissionDirectedScope.ts`. The route retains `GroupModel.findOne`, the forbidden response, and the surrounding authentication/authorization flow.
- Preserved: staff bypass, explicitly-targeted-user behavior, target group ID query shape, Mongo membership verification, forbidden status/message, `POST /api/quizzes/:id/submit`, all RBAC semantics, persisted schema, and route/API contracts.
- Tests: directed-scope contract PASS; auth-login security 9/9; API security 6/6; `server:check` PASS.
- Known limitation: frontend dependency installation was incomplete on this host when this batch ran; a later repository-audit and architecture-gate verification is recorded in 2A-18.
- Next: isolate attempt-limit preparation only after proving the existing count/query and conflict semantics remain unchanged.

## 2A-16 — Quiz submission attempt-state boundary

- Status: COMPLETED in `c0681673` on `refactor/modular-platform-safe`.
- Changed: added `buildQuizSubmissionAttemptState` to the existing attempt-context module. The route still executes the unchanged `QuizResultModel.countDocuments` query and maps the same conflict response; the pure boundary only decides whether the limit is reached and derives the next attempt number/idempotency key.
- Preserved: max-attempt normalization, count query (`userId` + `quizId`), `409` message and fields, attempt numbering, idempotency-key format, route/API contracts, RBAC, scoring, and database schema.
- Tests: attempt-context contract PASS; directed-scope contract PASS; quiz integrity 4/4; `server:check` PASS.
- Known limitation: frontend dependency installation remains incomplete on this host, so current-run frontend typecheck/build and repository/architecture gates remain pending.
- Next: map submission request read-model context only after preserving lookup/query ordering and all result fields.

## 2A-17 — Quiz submission read-model-context boundary

- Status: COMPLETED in `a692fd61` on `refactor/modular-platform-safe`.
- Changed: extracted submission skill-ID derivation and skill/subject/section display-map construction into `quizSubmissionReadModelContext.ts`. The route retains the same parallel model queries and passes the resulting maps into existing skills analysis.
- Preserved: skill-ID de-duplication, copy/order-independent lookup inputs, query ordering, empty-skill behavior, display fallback fields, submission response/result semantics, route/API contracts, RBAC, scoring, and database schema.
- Tests: read-model-context contract PASS; skills-analysis contract PASS; result-document contract PASS; `server:check` PASS.
- Known limitation: frontend dependency installation remains incomplete on this host, so current-run frontend typecheck/build and repository/architecture gates remain pending.
- Next: audit the remaining submission orchestration and select only a bounded, contract-preserving extraction.

## 2A-18 — Quiz submission window-policy boundary

- Status: COMPLETED in `c107c8c8` on `refactor/modular-platform-safe`.
- Changed: extracted deadline and time-limit evaluation into `quizSubmissionWindow.ts`; the route parses the request and maps the existing status/message response.
- Preserved: due-date parsing, current-time comparison, 60-second grace interval, forbidden/request-timeout status codes and messages, `POST /api/quizzes/:id/submit`, RBAC, scoring, persistence, and all route/API contracts.
- Tests: submission-window contract PASS; attempt-context contract PASS; API security 6/6; `server:check` PASS.
- Known limitation: frontend typecheck/build both reach the same missing `lucide-react` dependency in the incomplete local install. Repository audit and architecture gate now PASS; no frontend failure is attributed to this batch.
- Next: audit access-policy dependencies and select only a bounded, contract-preserving extraction.

## 2B-01 — Content learning-resource URL policy boundary

- Status: COMPLETED in `cf5118f3` on `refactor/modular-platform-safe`.
- Changed: centralized learning-resource URL cleanup and lesson URL-field normalization in `modules/content/domain/learningResourceUrl.ts`. Both content lesson writes and operations media-readiness checks use the same policy.
- Preserved: malformed URL repair rules, YouTube URL normalization, `videoUrl`/`meetingUrl`/`recordingUrl`/`fileUrl` update behavior, lesson parser call sites, operations media readiness, content/operations route URLs, RBAC, and persistence schema.
- Tests: learning-resource URL contract PASS; content learning-schema boundary PASS; video-question contract 8/8; `server:check` PASS.
- Known limitation: frontend typecheck/build both reach the same missing `lucide-react` dependency in the incomplete local install. Repository audit and architecture gate PASS before this bounded content extraction; no frontend failure is attributed to it.
- Next: audit content bootstrap composition and select only a bounded, response-contract-preserving extraction.

## 2B-02 — Content bootstrap request-policy boundary

- Status: COMPLETED in `43e498f6` on `refactor/modular-platform-safe`.
- Changed: extracted scope/phase normalization, inclusion flags, and shared-cache eligibility/key derivation into `contentBootstrapRequest.ts`; the route retains query parsing, cache reads/writes, HTTP headers, data queries, and response mapping.
- Preserved: non-staff coercion to learning scope, staff full/operations access, `learning/core` behavior, operations-only skips, study-plan inclusion, shared-cache partitioning, `/api/content/bootstrap` URL/method, response shape, and RBAC semantics.
- Tests: bootstrap-request contract PASS; content operations bootstrap 4/4; course visibility 3/3; `server:check` PASS.
- Known limitation: frontend typecheck/build both reach the same missing `lucide-react` dependency in the incomplete local install. Repository audit and architecture gate PASS before this bounded content extraction; no frontend failure is attributed to it.
- Next: audit bootstrap payload composition and select only a bounded, response-contract-preserving extraction.

## 2B-03 — Content bootstrap visibility-filter boundary

- Status: COMPLETED in `15dace85` on `refactor/modular-platform-safe`.
- Changed: extracted learner/staff bootstrap visibility filters and active-path fallback composition into `contentBootstrapVisibility.ts`; the route still obtains active paths and runs the same model queries.
- Preserved: staff full visibility, learner `showOnPlatform` and approval gates, active-path scope and missing/empty/null path fallback, operations behavior, response shape, `/api/content/bootstrap`, RBAC, and persistence semantics.
- Tests: bootstrap-visibility contract PASS; content operations bootstrap 4/4; course visibility 3/3; `server:check` PASS.
- Known limitation: frontend typecheck/build both reach the same missing `lucide-react` dependency in the incomplete local install. Repository audit and architecture gate PASS before this bounded content extraction; no frontend failure is attributed to it.
- Next: audit bootstrap payload composition/cache lifecycle and select only a bounded, response-contract-preserving extraction.

## P0-02 — Distributed weekly parent-report scheduling

- Status: COMPLETED in `0172947a` on `refactor/modular-platform-safe`.
- Changed: replaced the process-local hourly timer with a BullMQ Job Scheduler using `0 8 * * 0` and `Asia/Riyadh`; added a shared worker with concurrency 1 and retry/backoff; extracted report generation into an application service.
- Idempotency: derives the previous Sunday key at job execution time and uses the existing notification `campaignId` to skip a parent already delivered for that week. Partial failures remain visible to BullMQ retries; completed parents are skipped safely.
- Preserved: existing bootstrap facade, report calculation and Arabic notification content, parent recipient selection, notification APIs, persisted schema semantics, and all public/API/RBAC/payment/quiz contracts.
- Added: focused scheduler contract `smoke:weekly-parent-report`; graceful shutdown closes the report worker and queue.
- Tests: weekly scheduler contract PASS (4/4); typecheck PASS; server check PASS; server build PASS; frontend build PASS; repository audit PASS; architecture gate PASS; route/runtime/security/quiz-integrity smoke PASS.
- Known limitation: the scheduler requires the already-supported Redis/BullMQ production configuration; P0-03 still must bound high-volume parent/report reads, and no production load certification has been claimed.
- Next: P0-03 bootstrap and unbounded reads.

كل Batch له Commit منفصل ولا يجمع Structural وProduct وDB migration.
