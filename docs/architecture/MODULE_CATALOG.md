# ALMEAA — Module Catalog

| Domain | يملك | لا يملك | المداخل الحالية | الحالة |
|---|---|---|---|---|
| auth | identity/login/account | تقارير أو scoring | `server/src/routes/auth.routes.ts`, auth UI | Legacy boundary |
| schools | schools/classes/staff/parents/scope | platform content | `SchoolsManager`, `SchoolsManager/` action/hooks/services, `SchoolPortalManager`, school routes | PARTIAL — core admin journeys and supervisor scope are verified; Sellable School MVP closure remains |
| curriculum | Path/Level/Subject/Section/Skill | attempt scoring | taxonomy routes, PathsManager | Boundary started |
| questions | bank/authoring/types/import/search | report presentation | QuestionBankManager, question routes | Boundary pending |
| assessments | definition/versioning, distribution, sessions, attempts/responses, submission, scoring, results, assessment-specific analytics | payment provider، long-term cross-assessment reports | compatibility facades in quiz routes/QuizPage/Results; `server/src/modules/quizzes/application/assessment*` | PARTIAL — additive foundations, controlled mirror/reconciliation/rollback are isolated-CI proven; UI commercial closure and production opt-in remain |
| learning | lessons/topics/player/library/progress | school authorization | learning pages/content routes | Mixed legacy |
| courses | catalog/builder/enrollment/linkage | low-level media storage | course builders/API groups | Mixed legacy |
| reports | result views/student/class/school/skill/export | write-side scoring | Reports, Results, report routes | View-model extraction started |
| commerce | packages/memberships/payments/access | learning content ownership | payment routes, FinancialManager | High caution |
| notifications | templates/delivery/read/realtime | assessment rules | notification routes/service/queue | P0 scale risk |
| media | assets/storage/processing | business permissions | URL fields and players | Future platform |
| ai | provider/runtime/study advice | source-of-truth scoring | ai routes/gemini service | Provider adapter needed |
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
