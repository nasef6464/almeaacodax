Student path delivery VERIFIED (2026-10-13): PR533 + PR534, final automatic publication 35f64e62fa6bca59a7e9370718c3327e02215601. 14 bounded runtime groups PASS; 20 successful scoped business requests including logical restore and fixture hiding. Canonical history unchanged,35focused frontend groups +6backend behavior/model +6HTTP/Mongo groups passed, independent review approved, all3required checks passed on both exact heads. See docs/audits/STUDENT_PATH_EXPERIENCE_PUBLISHED_2026-10-13.json. Earlier pending notes are historical; no production-scale/backfill/payment-gateway claim.

Student path experience (2026-10-13): curriculum owns Path.settings stage policy/label/template; presentation owns HomepageSettings.studentExperience and actor-bound content projections; auth owns bounded User.pathStageSelections and preferences CAS. Student components discover/register paths, choose stages and render the simple template; useStudentSkillProgress owns canceled actor/query/stage-bound report reads. These modules do not grant paid access, assign quizzes, change scoring or rewrite historical progress.

# ALMEAA — Module Catalog

Payment recovery (2026-10-12, locally verified; delivery pending): paymentFulfillment owns approval intent, idempotent effects and activation outcome; tapWebhook owns Tap signature/charge binding. Financial approval and verified activation have separate optional fulfillment state; existing commerce routes, prices and AccessGrant authority remain.

Learning/commerce frontend repair (2026-10-12, verification pending): authSessionLifetime and authStoreSync guard/synchronize the existing account lifecycle; courseCompletion governs exact lesson completion; paymentRequestPresentation separates approved finances from activation and limits recovery to existing authorized manual orders. Pricing keeps canonical published records; unavailable tier cells make no synthetic purchase promises.

Courses/commerce access repair (2026-10-12, implementation pending delivery): shared read authorization is centralized in server/src/services/entitlementPolicy.ts and protected bootstrap projection in content/application/contentPayloadAccess.ts. Existing domain routes retain course definitions, quiz relationship, staff scope and certificate issuance; discussion alone preserves explicit scoped foundation entitlement. Commerce fulfillment remains payment-owned. No new service or storage authority.


Classroom history read lifecycle: `hooks/useClassroomTeacherReports.ts` owns summary loading/error/retry and stale response isolation for report list and skill radar. Presentation/diagnostics/detail actions remain in their existing classroom components.

| Domain | يملك | لا يملك | المداخل الحالية | الحالة |
|---|---|---|---|---|
| auth | identity/login/account/session/admin-user lifecycle; bounded login failure budgets and scoped password-recovery dispatch | تقارير أو scoring | `server/src/routes/auth.routes.ts`, `server/src/modules/auth/`, `server/src/middleware/loginProtection.ts` | HIGH DEBT — route facade retained; recovery dispatch extracted to `application/sendPasswordRecovery.ts`, owner-authorized10/10login policy, unchanged65kownership budget |
| schools | schools/classes/staff/parents/scope | platform content | `SchoolsManager`, `SchoolsManager/` action/hooks/services, `SupervisorDashboard`, school routes | VERIFIED — Sellable School MVP Admin setup/access and Supervisor scoped follow-up vertical slice closed; advanced reporting/UX scalability deferred |
| curriculum | Path/Level/Subject/Section/Skill | attempt scoring | taxonomy routes, PathsManager | Subject Learning Space boundary VERIFIED; School MVP remains |
| questions | bank/authoring/types/import/search | report presentation | QuestionBankManager, question routes | Boundary pending |
| assessments | definition/versioning, distribution, sessions, attempts/responses, submission, scoring, results, assessment-specific analytics | payment provider، long-term cross-assessment reports | compatibility facades in quiz routes/QuizPage/Results; `server/src/modules/quizzes/application/assessment*` | PARTIAL — additive foundations, controlled mirror/reconciliation/rollback are isolated-CI proven; UI commercial closure and production opt-in remain |
| learning | lessons/topics/player/library/progress; canonical Subject Learning Space composition | school authorization, course/assessment ownership | `pages/GenericPathPage.tsx`, `components/LearningSection.tsx`, content routes | Gate 2 VERIFIED on isolated journeys |
| courses | catalog/builder/enrollment/linkage | low-level media storage | course builders/API groups | Mixed legacy |
| reports | result views/student/class/school/skill/export | write-side scoring | Reports orchestration; `pages/Reports/` view-models and staff/student presentation panels; Results; report routes | Gate 4 CLOSED on isolated CI; staff presentation extraction VERIFIED on exact-head CI and bounded published supervisor/student reports; complete student/system certification remains PARTIAL |
| commerce | packages/memberships/payments/access | learning content ownership | payment routes, FinancialManager | High caution |
| notifications | templates/delivery/read/realtime/audience campaigns | assessment rules | notification module + route/service/queue | PARTIAL — Redis/SSE/BullMQ realtime foundation is sound; Batch 9 must close canonical audience authority and campaign batching |
| media | asset URL/key/storage/delivery policy | domain business permissions | URL fields/players; Cloudflare-backed delivery is target | PARTIAL — runtime uses external URL/CDN references and no normal binary upload; provider-neutral storage adapter required when first-party upload/manage is added |
| ai | provider runtime/config, AI use-cases, advice | source-of-truth scoring | `ai.routes.ts`, `modules/ai`, frontend AI service | HIGH DEBT — route mixes provider/config/use-cases/analytics; split before major AI/voice expansion |
| operations | health/backups/monitoring/jobs | user-facing business rules | operations routes/scripts | Production readiness |
| content | homepage/editorial/public content | learning catalog semantics | content routes/HomepageManager | Large route hotspot |
| white-label | product name/branding/features/settings/policies/provider selection | customer-specific forks أو business logic copies | planned `ProductConfig` boundary; current branding/config entry points | NOT PROVEN — Gate 5 after assessment, learning-space, school MVP, and reports boundaries |

## قواعد الملكية

- Feature يستخدم `core` و`shared` فقط من الواجهات العامة.
- لا Deep Import إلى internal feature code.
- HTTP: auth → validation → use case → response mapping.
- `shared` محايد فعليًا؛ لا business rules.
- compatibility facades تبقى حتى يثبت عدم وجود callers.
- ترتيب العمل التجاري المعتمد موجود في `FINAL_MASTER_PLAN_V3_AR.md`: Assessment closure ثم Learning Space ثم School MVP ثم Reports ثم ProductConfig.
- `VERIFIED` تعني دليل رحلة مناسب، وليس مجرد وجود ملف أو نجاح فحص ثابت.

## AI teaching board V1 boundary — 2026-10-08
Shared checkpointHints supplies two fixed procedural coaching prompts chosen by step type and language; no generated answer/value/option/formula is copied into hints, including legacy cached responses. Compact content generation omits hint fields. Browser boardText owns observed prose separator cleanup; math variables and LaTeX commands are preserved.
Local spokenMath prepares supported notation in Arabic/English without computation, provider access or persisted changes; unknown/malformed notation explicitly refers to the visible expression. NarrationEngine prefers matching local voices when available and keeps browser fallback when voices have not loaded.
CompactTeachingPlan in the existing AI application layer owns content schema and deterministic scene/checkpoint compilation; provider adapters apply its schema for board calls only. Browser storyboard_v1 remains the canonical rendering contract.
Existing AI module retains question review authorization, trusted references, provider routing, usage/budget enforcement and scoped cache. A pure versioned teaching contract is shared with the frontend. Browser components/results/teaching owns board state/actions/playback/render and a replaceable narration adapter. No new service or educational authority. Local fixture proof is PARTIAL; live-provider and production certification remain open.

## Mock client policy and ordering ownership — 2026-10-10
- services/mockExamNormalization.ts owns published mock policy conversion; services/adapter.ts delegates. Preserve strict/flexible flags, subject domains and optional legacy defaults.
- utils/mockExam.ts owns section-respecting question order; QuizPage delegates and restores an older draft current question by canonical identity. Scoring, server session authority and persisted historical results remain unchanged.
- utils/quizProgressDraft.ts owns optional strict-section deadline/closed-ID restore validation; QuizPage starts/counts down deadlines and saves them through the existing local draft. This is client resume behavior, not server timing enforcement.
