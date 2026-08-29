# Current Repository Architecture Audit

Generated from commit `5bf304913ed0db6d66f395eef0ae43f96e7d143b` using the TypeScript AST for imports and route extraction.

## Executive snapshot

| Metric | Value |
|---|---:|
| Tracked files | 1089 |
| Source files (including scripts/tooling) | 739 |
| Runtime source files | 431 |
| Source lines | 166,237 |
| Runtime source lines | 131,829 |
| Frontend route literals | 49 |
| Backend HTTP route entries | 236 |
| Router mount points | 25 |
| Runtime relative import edges | 1317 |
| Unresolved runtime relative imports | 0 |
| Unresolved non-runtime relative imports | 2 |
| Runtime dependency cycles | 0 |
| Cross-domain runtime import edges | 873 |
| Runtime hotspots >= 400 lines | 83 |
| Candidate migration-map entries | 421 |

## Largest runtime source hotspots

| File | Lines | Bytes | Domain candidate |
|---|---:|---:|---|
| `server/src/routes/quiz.routes.ts` | 2660 | 103810 | quizzes |
| `server/src/routes/content.routes.ts` | 2629 | 100989 | content |
| `pages/Reports.tsx` | 2607 | 187317 | reports |
| `dashboards/admin/PathsManager.tsx` | 2238 | 126125 | paths |
| `pages/Dashboard.tsx` | 2195 | 132224 | shared |
| `dashboards/admin/SchoolsManager.tsx` | 2176 | 107630 | schools |
| `dashboards/admin/FinancialManager.tsx` | 2135 | 144154 | payments |
| `pages/Results.tsx` | 2090 | 106586 | reports |
| `dashboards/admin/AdminDashboard.tsx` | 2079 | 125644 | shared |
| `pages/QuizPage.tsx` | 1930 | 101211 | quizzes |
| `server/src/routes/payment.routes.ts` | 1886 | 71300 | payments |
| `dashboards/admin/PlatformIntegrationsManager.tsx` | 1845 | 101223 | operations |
| `dashboards/admin/QuizzesManager.tsx` | 1827 | 101477 | quizzes |
| `dashboards/admin/SupervisorDashboard.tsx` | 1823 | 118548 | schools |
| `dashboards/admin/SchoolPortalManager.tsx` | 1735 | 101732 | schools |
| `pages/Plan.tsx` | 1732 | 79122 | shared |
| `server/src/scripts/seedOperationalScenario.ts` | 1725 | 60632 | operations |
| `store/useStore.ts` | 1718 | 86139 | shared |
| `server/src/routes/ai.routes.ts` | 1648 | 65293 | ai |
| `server/src/scripts/seedOperationalScenarioApi.ts` | 1609 | 57436 | operations |
| `pages/Quizzes.tsx` | 1575 | 74944 | quizzes |
| `dashboards/admin/AdvancedCourseBuilder.tsx` | 1567 | 94724 | courses |
| `dashboards/admin/MockExamManager.tsx` | 1550 | 82630 | exams |
| `dashboards/admin/QuestionBankManager.tsx` | 1502 | 72146 | questions |
| `server/src/routes/auth.routes.ts` | 1501 | 52427 | auth |
| `dashboards/admin/QuizBuilder.tsx` | 1494 | 82025 | quizzes |
| `pages/Quiz.tsx` | 1428 | 65611 | quizzes |
| `pages/GenericPathPage.tsx` | 1380 | 82076 | paths |
| `components/LearningSection.tsx` | 1308 | 80165 | learning |
| `server/src/scripts/smokeOperationalJourneysApi.ts` | 1270 | 48900 | operations |
| `dashboards/admin/LessonsManager.tsx` | 1263 | 61158 | learning |
| `dashboards/admin/PublicBarcodeTestsManager.tsx` | 1250 | 66200 | exams |
| `pages/SubjectLearningPage.tsx` | 1192 | 65541 | learning |
| `dashboards/admin/HomepageManager.tsx` | 1166 | 70061 | content |
| `dashboards/admin/UsersManager.tsx` | 1121 | 60691 | users |

## Baseline safety evidence

- `BASELINE_CONTRACT_MANIFEST.json` captures current frontend route literals, backend HTTP route entries, router mount points, environment-key usage, and hashes of route sources.
- `MIGRATION_MAP_V2_CANDIDATE.json` is deliberately a **candidate** map; ambiguous ownership is marked for review and must not be treated as an automatic move instruction.
- Runtime imports are parsed with the TypeScript compiler AST and Node/TypeScript ESM `.js` specifiers are resolved back to tracked TypeScript source files.
- Cycles and cross-domain edges are measured only on runtime source, so test/audit scripts do not pollute architecture gates.

## Architectural interpretation

The target remains a modular monolith. The audit is intended to reduce file size, clarify domain ownership, and create enforceable boundaries without changing the product's URL/API contracts or database behavior during the structural phase.
