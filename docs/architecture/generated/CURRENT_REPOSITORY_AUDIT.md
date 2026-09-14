# Current Repository Architecture Audit

Generated from commit `84fe836539df60c7b91989bcf3dc1be4a239b85d` using the TypeScript AST for imports and route extraction.

## Executive snapshot

| Metric | Value |
|---|---:|
| Tracked files | 1440 |
| Source files (including scripts/tooling) | 1001 |
| Runtime source files | 617 |
| Source lines | 200,261 |
| Runtime source lines | 160,788 |
| Frontend route literals | 55 |
| Backend HTTP route entries | 306 |
| Router mount points | 31 |
| Runtime relative import edges | 1897 |
| Unresolved runtime relative imports | 0 |
| Unresolved non-runtime relative imports | 5 |
| Runtime dependency cycles | 0 |
| Cross-domain runtime import edges | 1180 |
| Runtime hotspots >= 400 lines | 84 |
| Candidate migration-map entries | 606 |

## Largest runtime source hotspots

| File | Lines | Bytes | Domain candidate |
|---|---:|---:|---|
| `pages/Reports.tsx` | 2587 | 186155 | reports |
| `server/src/routes/content.routes.ts` | 2560 | 97959 | content |
| `pages/QuizPage.tsx` | 2413 | 132726 | quizzes |
| `dashboards/admin/PathsManager.tsx` | 2366 | 133357 | paths |
| `server/src/routes/quiz.routes.ts` | 2350 | 95287 | quizzes |
| `pages/Dashboard.tsx` | 2323 | 142077 | shared |
| `dashboards/admin/PlatformIntegrationsManagerLegacy.tsx` | 2317 | 130369 | operations |
| `dashboards/admin/SchoolsManager.tsx` | 2197 | 112700 | schools |
| `pages/Results.tsx` | 2185 | 108197 | reports |
| `dashboards/admin/FinancialManager.tsx` | 2135 | 144154 | payments |
| `dashboards/admin/AdminDashboard.tsx` | 2084 | 126101 | shared |
| `server/src/scripts/backendIntegrationGate.ts` | 2049 | 118872 | operations |
| `dashboards/admin/QuestionBankManager.tsx` | 1943 | 93968 | questions |
| `dashboards/admin/QuizzesManager.tsx` | 1911 | 106763 | quizzes |
| `server/src/routes/payment.routes.ts` | 1886 | 71269 | payments |
| `dashboards/admin/SupervisorDashboard.tsx` | 1782 | 114730 | schools |
| `store/useStore.ts` | 1772 | 88949 | shared |
| `server/src/routes/auth.routes.ts` | 1768 | 66018 | auth |
| `pages/Plan.tsx` | 1732 | 79122 | shared |
| `server/src/scripts/seedOperationalScenario.ts` | 1725 | 60632 | operations |
| `App.tsx` | 1679 | 75998 | shared |
| `dashboards/admin/AdvancedCourseBuilder.tsx` | 1654 | 99692 | courses |
| `server/src/routes/ai.routes.ts` | 1648 | 65293 | ai |
| `server/src/scripts/seedOperationalScenarioApi.ts` | 1609 | 57436 | operations |
| `dashboards/admin/MockExamManager.tsx` | 1550 | 82630 | exams |
| `dashboards/admin/HomepageManager.tsx` | 1541 | 98147 | content |
| `pages/Landing.tsx` | 1497 | 101672 | shared |
| `dashboards/admin/QuizBuilder.tsx` | 1494 | 82025 | quizzes |
| `pages/GenericPathPage.tsx` | 1473 | 90688 | paths |
| `components/Header.tsx` | 1437 | 76070 | shared |
| `pages/Quiz.tsx` | 1428 | 65611 | quizzes |
| `components/LearningSection.tsx` | 1372 | 88061 | learning |
| `dashboards/admin/LessonsManager.tsx` | 1316 | 65343 | learning |
| `server/src/scripts/smokeOperationalJourneysApi.ts` | 1293 | 51179 | operations |
| `dashboards/admin/PublicBarcodeTestsManager.tsx` | 1250 | 66200 | exams |

## Baseline safety evidence

- `BASELINE_CONTRACT_MANIFEST.json` captures current frontend route literals, backend HTTP route entries, router mount points, environment-key usage, and hashes of route sources.
- `MIGRATION_MAP_V2_CANDIDATE.json` is deliberately a **candidate** map; ambiguous ownership is marked for review and must not be treated as an automatic move instruction.
- Runtime imports are parsed with the TypeScript compiler AST and Node/TypeScript ESM `.js` specifiers are resolved back to tracked TypeScript source files.
- Cycles and cross-domain edges are measured only on runtime source, so test/audit scripts do not pollute architecture gates.

## Architectural interpretation

The target remains a modular monolith. The audit is intended to reduce file size, clarify domain ownership, and create enforceable boundaries without changing the product's URL/API contracts or database behavior during the structural phase.
