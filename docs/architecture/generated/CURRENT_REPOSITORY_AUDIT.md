# Current Repository Architecture Audit

Generated from commit `8dca10591fe21f6ed208762d0127194b6ea18c88` using the TypeScript AST for imports and route extraction.

## Executive snapshot

| Metric | Value |
|---|---:|
| Tracked files | 1468 |
| Source files (including scripts/tooling) | 1024 |
| Runtime source files | 629 |
| Source lines | 203,087 |
| Runtime source lines | 163,020 |
| Frontend route literals | 55 |
| Backend HTTP route entries | 313 |
| Router mount points | 32 |
| Runtime relative import edges | 1942 |
| Unresolved runtime relative imports | 0 |
| Unresolved non-runtime relative imports | 6 |
| Runtime dependency cycles | 0 |
| Cross-domain runtime import edges | 1209 |
| Runtime hotspots >= 400 lines | 84 |
| Candidate migration-map entries | 617 |

## Largest runtime source hotspots

| File | Lines | Bytes | Domain candidate |
|---|---:|---:|---|
| `server/src/routes/content.routes.ts` | 2640 | 101741 | content |
| `pages/Reports.tsx` | 2587 | 186155 | reports |
| `pages/QuizPage.tsx` | 2413 | 132726 | quizzes |
| `dashboards/admin/PathsManager.tsx` | 2366 | 133357 | paths |
| `server/src/routes/quiz.routes.ts` | 2350 | 95287 | quizzes |
| `pages/Dashboard.tsx` | 2323 | 142077 | shared |
| `dashboards/admin/PlatformIntegrationsManagerLegacy.tsx` | 2317 | 130369 | operations |
| `server/src/scripts/backendIntegrationGate.ts` | 2264 | 130806 | operations |
| `dashboards/admin/SchoolsManager.tsx` | 2197 | 112700 | schools |
| `pages/Results.tsx` | 2185 | 108197 | reports |
| `dashboards/admin/FinancialManager.tsx` | 2135 | 144154 | payments |
| `dashboards/admin/AdminDashboard.tsx` | 2093 | 126923 | shared |
| `dashboards/admin/QuizzesManager.tsx` | 1981 | 110236 | quizzes |
| `dashboards/admin/QuestionBankManager.tsx` | 1943 | 93968 | questions |
| `server/src/routes/payment.routes.ts` | 1886 | 71269 | payments |
| `server/src/routes/auth.routes.ts` | 1868 | 71117 | auth |
| `dashboards/admin/SupervisorDashboard.tsx` | 1782 | 114730 | schools |
| `store/useStore.ts` | 1772 | 88949 | shared |
| `pages/Plan.tsx` | 1732 | 79122 | shared |
| `server/src/scripts/seedOperationalScenario.ts` | 1725 | 60632 | operations |
| `App.tsx` | 1706 | 77124 | shared |
| `dashboards/admin/AdvancedCourseBuilder.tsx` | 1656 | 99872 | courses |
| `server/src/routes/ai.routes.ts` | 1648 | 65293 | ai |
| `server/src/scripts/seedOperationalScenarioApi.ts` | 1609 | 57436 | operations |
| `dashboards/admin/MockExamManager.tsx` | 1550 | 82630 | exams |
| `dashboards/admin/HomepageManager.tsx` | 1541 | 98147 | content |
| `pages/Landing.tsx` | 1502 | 102082 | shared |
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
