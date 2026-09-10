# Current Repository Architecture Audit

Generated from commit `4dc1f4f9125dd5e7e10897ed98f83b0cd8a516c7` using the TypeScript AST for imports and route extraction.

## Executive snapshot

| Metric | Value |
|---|---:|
| Tracked files | 1374 |
| Source files (including scripts/tooling) | 937 |
| Runtime source files | 566 |
| Source lines | 186,811 |
| Runtime source lines | 147,868 |
| Frontend route literals | 55 |
| Backend HTTP route entries | 287 |
| Router mount points | 30 |
| Runtime relative import edges | 1684 |
| Unresolved runtime relative imports | 1 |
| Unresolved non-runtime relative imports | 5 |
| Runtime dependency cycles | 0 |
| Cross-domain runtime import edges | 1058 |
| Runtime hotspots >= 400 lines | 83 |
| Candidate migration-map entries | 555 |

## Largest runtime source hotspots

| File | Lines | Bytes | Domain candidate |
|---|---:|---:|---|
| `pages/Reports.tsx` | 2587 | 186155 | reports |
| `server/src/routes/content.routes.ts` | 2560 | 97959 | content |
| `dashboards/admin/PathsManager.tsx` | 2366 | 133357 | paths |
| `server/src/routes/quiz.routes.ts` | 2350 | 95287 | quizzes |
| `dashboards/admin/PlatformIntegrationsManagerLegacy.tsx` | 2317 | 130369 | operations |
| `pages/Dashboard.tsx` | 2301 | 141211 | shared |
| `pages/Results.tsx` | 2185 | 108197 | reports |
| `dashboards/admin/SchoolsManager.tsx` | 2160 | 110364 | schools |
| `pages/QuizPage.tsx` | 2152 | 117168 | quizzes |
| `dashboards/admin/FinancialManager.tsx` | 2135 | 144154 | payments |
| `dashboards/admin/AdminDashboard.tsx` | 2084 | 126086 | shared |
| `server/src/scripts/backendIntegrationGate.ts` | 2046 | 118322 | operations |
| `dashboards/admin/QuizzesManager.tsx` | 1911 | 106763 | quizzes |
| `server/src/routes/payment.routes.ts` | 1886 | 71269 | payments |
| `dashboards/admin/SupervisorDashboard.tsx` | 1781 | 114547 | schools |
| `dashboards/admin/QuestionBankManager.tsx` | 1780 | 87160 | questions |
| `store/useStore.ts` | 1772 | 88949 | shared |
| `server/src/routes/auth.routes.ts` | 1768 | 65773 | auth |
| `pages/Plan.tsx` | 1732 | 79122 | shared |
| `server/src/scripts/seedOperationalScenario.ts` | 1725 | 60632 | operations |
| `App.tsx` | 1679 | 75998 | shared |
| `dashboards/admin/AdvancedCourseBuilder.tsx` | 1654 | 99562 | courses |
| `server/src/routes/ai.routes.ts` | 1648 | 65293 | ai |
| `server/src/scripts/seedOperationalScenarioApi.ts` | 1609 | 57436 | operations |
| `dashboards/admin/MockExamManager.tsx` | 1550 | 82630 | exams |
| `dashboards/admin/HomepageManager.tsx` | 1541 | 98147 | content |
| `pages/Landing.tsx` | 1497 | 101672 | shared |
| `dashboards/admin/QuizBuilder.tsx` | 1494 | 82025 | quizzes |
| `pages/GenericPathPage.tsx` | 1451 | 87864 | paths |
| `pages/Quiz.tsx` | 1428 | 65611 | quizzes |
| `components/LearningSection.tsx` | 1368 | 87623 | learning |
| `dashboards/admin/LessonsManager.tsx` | 1316 | 64028 | learning |
| `server/src/scripts/smokeOperationalJourneysApi.ts` | 1293 | 51179 | operations |
| `dashboards/admin/PublicBarcodeTestsManager.tsx` | 1250 | 66200 | exams |
| `components/Header.tsx` | 1219 | 63642 | shared |

## Baseline safety evidence

- `BASELINE_CONTRACT_MANIFEST.json` captures current frontend route literals, backend HTTP route entries, router mount points, environment-key usage, and hashes of route sources.
- `MIGRATION_MAP_V2_CANDIDATE.json` is deliberately a **candidate** map; ambiguous ownership is marked for review and must not be treated as an automatic move instruction.
- Runtime imports are parsed with the TypeScript compiler AST and Node/TypeScript ESM `.js` specifiers are resolved back to tracked TypeScript source files.
- Cycles and cross-domain edges are measured only on runtime source, so test/audit scripts do not pollute architecture gates.

## Architectural interpretation

The target remains a modular monolith. The audit is intended to reduce file size, clarify domain ownership, and create enforceable boundaries without changing the product's URL/API contracts or database behavior during the structural phase.
