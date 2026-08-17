# Current Repository Architecture Audit

Generated from commit `c72cd743e1f1feb664843f22d330e46ddfd7fab5`.

## Executive snapshot

| Metric | Value |
|---|---:|
| Tracked files | 704 |
| Source files | 435 |
| Source lines | 142,522 |
| Frontend route literals | 49 |
| Backend router method entries | 5 |
| API mount points | 4 |
| Relative import edges | 623 |
| Unresolved relative imports | 429 |
| Dependency cycles | 1 |
| Cross-domain import edges | 454 |
| Source hotspots >= 400 lines | 80 |
| Candidate migration-map entries | 279 |

## Largest source hotspots

| File | Lines | Bytes | Domain candidate |
|---|---:|---:|---|
| `dashboards/admin/SchoolsManager.tsx` | 5243 | 331742 | schools |
| `pages/Reports.tsx` | 3742 | 248917 | reports |
| `server/src/routes/content.routes.ts` | 3406 | 128523 | content |
| `server/src/routes/quiz.routes.ts` | 3145 | 119634 | quizzes |
| `dashboards/admin/PathsManager.tsx` | 2289 | 126749 | paths |
| `pages/Dashboard.tsx` | 2211 | 131122 | shared |
| `store/useStore.ts` | 2210 | 104715 | shared |
| `pages/Results.tsx` | 2185 | 107469 | reports |
| `dashboards/admin/FinancialManager.tsx` | 2129 | 141826 | payments |
| `dashboards/admin/AdminDashboard.tsx` | 2079 | 123566 | shared |
| `services/api.ts` | 2036 | 68194 | shared |
| `server/src/routes/payment.routes.ts` | 1887 | 69433 | payments |
| `pages/QuizPage.tsx` | 1879 | 95941 | quizzes |
| `dashboards/admin/PlatformIntegrationsManager.tsx` | 1845 | 99379 | operations |
| `dashboards/admin/QuizzesManager.tsx` | 1815 | 98694 | quizzes |
| `dashboards/admin/SchoolPortalManager.tsx` | 1735 | 99998 | schools |
| `pages/Plan.tsx` | 1732 | 77391 | shared |
| `server/src/scripts/seedOperationalScenario.ts` | 1725 | 60632 | operations |
| `dashboards/admin/SupervisorDashboard.tsx` | 1653 | 107279 | schools |
| `server/src/routes/ai.routes.ts` | 1643 | 63535 | ai |
| `server/src/scripts/seedOperationalScenarioApi.ts` | 1609 | 57436 | operations |
| `dashboards/admin/AdvancedCourseBuilder.tsx` | 1567 | 93158 | courses |
| `dashboards/admin/MockExamManager.tsx` | 1550 | 81081 | exams |
| `pages/Quizzes.tsx` | 1519 | 70184 | quizzes |
| `dashboards/admin/QuestionBankManager.tsx` | 1502 | 70645 | questions |
| `dashboards/admin/QuizBuilder.tsx` | 1494 | 80532 | quizzes |
| `server/src/routes/auth.routes.ts` | 1450 | 49027 | auth |
| `pages/Quiz.tsx` | 1428 | 64184 | quizzes |
| `pages/GenericPathPage.tsx` | 1380 | 80697 | paths |
| `components/LearningSection.tsx` | 1308 | 80165 | learning |

## Baseline safety evidence

- `BASELINE_CONTRACT_MANIFEST.json` captures current frontend route literals, backend route entries, API mount points, environment-key usage, and hashes of route sources.
- `MIGRATION_MAP_V2_CANDIDATE.json` is deliberately a **candidate** map; ambiguous ownership is marked for review and must not be treated as an automatic move instruction.
- Unresolved imports and cycles are measured before migration so structural changes cannot silently make the graph worse.

## Architectural interpretation

The target remains a modular monolith. The audit is intended to reduce file size, clarify domain ownership, and create enforceable boundaries without changing the product's URL/API contracts or database behavior during the structural phase.
