# Current Repository Architecture Audit

Generated from commit `c48bd1052586a9ab3270697711badf98a68026fa` using the TypeScript AST for imports and route extraction.

## Executive snapshot

| Metric | Value |
|---|---:|
| Tracked files | 726 |
| Source files (including scripts/tooling) | 447 |
| Runtime source files | 298 |
| Source lines | 143,256 |
| Runtime source lines | 123,155 |
| Frontend route literals | 49 |
| Backend HTTP route entries | 236 |
| Router mount points | 25 |
| Runtime relative import edges | 1032 |
| Unresolved runtime relative imports | 0 |
| Unresolved non-runtime relative imports | 2 |
| Runtime dependency cycles | 0 |
| Cross-domain runtime import edges | 757 |
| Runtime hotspots >= 400 lines | 83 |
| Candidate migration-map entries | 288 |

## Largest runtime source hotspots

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
| `server/src/scripts/smokeOperationalJourneysApi.ts` | 1270 | 48899 | operations |
| `dashboards/admin/LessonsManager.tsx` | 1263 | 61158 | learning |
| `dashboards/admin/PublicBarcodeTestsManager.tsx` | 1250 | 64951 | exams |
| `pages/SubjectLearningPage.tsx` | 1192 | 65541 | learning |
| `dashboards/admin/HomepageManager.tsx` | 1166 | 69794 | content |

## Baseline safety evidence

- `BASELINE_CONTRACT_MANIFEST.json` captures current frontend route literals, backend HTTP route entries, router mount points, environment-key usage, and hashes of route sources.
- `MIGRATION_MAP_V2_CANDIDATE.json` is deliberately a **candidate** map; ambiguous ownership is marked for review and must not be treated as an automatic move instruction.
- Runtime imports are parsed with the TypeScript compiler AST and Node/TypeScript ESM `.js` specifiers are resolved back to tracked TypeScript source files.
- Cycles and cross-domain edges are measured only on runtime source, so test/audit scripts do not pollute architecture gates.

## Architectural interpretation

The target remains a modular monolith. The audit is intended to reduce file size, clarify domain ownership, and create enforceable boundaries without changing the product's URL/API contracts or database behavior during the structural phase.
