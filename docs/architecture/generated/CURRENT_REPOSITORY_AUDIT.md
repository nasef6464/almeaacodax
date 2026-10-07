# Current Repository Architecture Audit

Generated from commit `266b9ceeeabffb5ee5dac58f4618edb262b23ed1` using the TypeScript AST for imports and route extraction.

## Executive snapshot

| Metric | Value |
|---|---:|
| Tracked files | 2072 |
| Source files (including scripts/tooling) | 1362 |
| Runtime source files | 861 |
| Source lines | 252,929 |
| Runtime source lines | 200,632 |
| Frontend route literals | 55 |
| Backend HTTP route entries | 360 |
| Router mount points | 35 |
| Runtime relative import edges | 2705 |
| Unresolved runtime relative imports | 0 |
| Unresolved non-runtime relative imports | 8 |
| Runtime dependency cycles | 0 |
| Cross-domain runtime import edges | 1686 |
| Runtime hotspots >= 400 lines | 84 |
| Candidate migration-map entries | 848 |

## Largest runtime source hotspots

| File | Lines | Bytes | Domain candidate |
|---|---:|---:|---|
| `pages/Reports.tsx` | 3017 | 210011 | reports |
| `server/src/routes/ai.routes.ts` | 2547 | 102857 | ai |
| `pages/Dashboard.tsx` | 2546 | 154372 | shared |
| `pages/QuizPage.tsx` | 2524 | 137835 | quizzes |
| `dashboards/admin/PathsManager.tsx` | 2383 | 134417 | paths |
| `dashboards/admin/PlatformIntegrationsManagerLegacy.tsx` | 2328 | 131046 | operations |
| `server/src/scripts/backendIntegrationGate.ts` | 2287 | 131707 | operations |
| `pages/Results.tsx` | 2282 | 114337 | reports |
| `dashboards/admin/SchoolsManager.tsx` | 2197 | 112700 | schools |
| `dashboards/admin/QuestionBankManager.tsx` | 2164 | 105978 | questions |
| `dashboards/admin/FinancialManager.tsx` | 2135 | 144154 | payments |
| `dashboards/admin/AdminDashboard.tsx` | 2101 | 127552 | shared |
| `dashboards/admin/QuizzesManager.tsx` | 1981 | 110347 | quizzes |
| `server/src/routes/payment.routes.ts` | 1973 | 74683 | payments |
| `dashboards/admin/SupervisorDashboard.tsx` | 1880 | 120630 | schools |
| `server/src/routes/auth.routes.ts` | 1791 | 68922 | auth |
| `server/src/scripts/seedOperationalScenario.ts` | 1788 | 65423 | operations |
| `pages/Plan.tsx` | 1732 | 79119 | shared |
| `dashboards/admin/AdvancedCourseBuilder.tsx` | 1656 | 99886 | courses |
| `pages/Quiz.tsx` | 1642 | 74300 | quizzes |
| `server/src/scripts/seedOperationalScenarioApi.ts` | 1622 | 60146 | operations |
| `pages/GenericPathPage.tsx` | 1558 | 93365 | paths |
| `dashboards/admin/MockExamManager.tsx` | 1550 | 82630 | exams |
| `dashboards/admin/HomepageManager.tsx` | 1542 | 98164 | content |
| `pages/Landing.tsx` | 1503 | 102179 | shared |
| `dashboards/admin/QuizBuilder.tsx` | 1494 | 82025 | quizzes |
| `components/LearningSection.tsx` | 1448 | 93309 | learning |
| `components/Header.tsx` | 1439 | 76342 | shared |
| `server/src/scripts/smokeOperationalJourneysApi.ts` | 1396 | 54290 | operations |
| `dashboards/admin/LessonsManager.tsx` | 1380 | 67280 | learning |
| `dashboards/admin/AiAssistantManager.tsx` | 1321 | 85330 | ai |
| `dashboards/admin/PublicBarcodeTestsManager.tsx` | 1250 | 66200 | exams |
| `dashboards/admin/UnifiedQuizBuilder.tsx` | 1233 | 71483 | quizzes |
| `pages/SubjectLearningPage.tsx` | 1227 | 68929 | learning |
| `components/CourseOverview.tsx` | 1217 | 75239 | courses |

## Baseline safety evidence

- `BASELINE_CONTRACT_MANIFEST.json` captures current frontend route literals, backend HTTP route entries, router mount points, environment-key usage, and hashes of route sources.
- `MIGRATION_MAP_V2_CANDIDATE.json` is deliberately a **candidate** map; ambiguous ownership is marked for review and must not be treated as an automatic move instruction.
- Runtime imports are parsed with the TypeScript compiler AST and Node/TypeScript ESM `.js` specifiers are resolved back to tracked TypeScript source files.
- Cycles and cross-domain edges are measured only on runtime source, so test/audit scripts do not pollute architecture gates.

## Architectural interpretation

The target remains a modular monolith. The audit is intended to reduce file size, clarify domain ownership, and create enforceable boundaries without changing the product's URL/API contracts or database behavior during the structural phase.
