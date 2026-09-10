# Current Repository Architecture Audit

Generated from commit `ba0efee19b0fc19b0a5f7b9c3cd6580018ed6e7f` using the TypeScript AST for imports and route extraction.

## Executive snapshot

| Metric | Value |
|---|---:|
| Tracked files | 1354 |
| Source files (including scripts/tooling) | 932 |
| Runtime source files | 562 |
| Source lines | 185,332 |
| Runtime source lines | 145,909 |
| Frontend route literals | 54 |
| Backend HTTP route entries | 266 |
| Router mount points | 30 |
| Runtime relative import edges | 1658 |
| Unresolved runtime relative imports | 0 |
| Unresolved non-runtime relative imports | 5 |
| Runtime dependency cycles | 0 |
| Cross-domain runtime import edges | 1043 |
| Runtime hotspots >= 400 lines | 83 |
| Candidate migration-map entries | 551 |

## Largest runtime source hotspots

| File | Lines | Bytes | Domain candidate |
|---|---:|---:|---|
| `pages/Reports.tsx` | 2587 | 186155 | reports |
| `server/src/routes/content.routes.ts` | 2560 | 97959 | content |
| `server/src/routes/quiz.routes.ts` | 2350 | 95287 | quizzes |
| `pages/Dashboard.tsx` | 2301 | 141211 | shared |
| `dashboards/admin/PathsManager.tsx` | 2245 | 126376 | paths |
| `pages/Results.tsx` | 2185 | 108197 | reports |
| `dashboards/admin/SchoolsManager.tsx` | 2153 | 109863 | schools |
| `pages/QuizPage.tsx` | 2152 | 117168 | quizzes |
| `dashboards/admin/FinancialManager.tsx` | 2135 | 144154 | payments |
| `dashboards/admin/AdminDashboard.tsx` | 2084 | 126040 | shared |
| `dashboards/admin/QuizzesManager.tsx` | 1911 | 106739 | quizzes |
| `server/src/routes/payment.routes.ts` | 1886 | 71269 | payments |
| `dashboards/admin/PlatformIntegrationsManagerLegacy.tsx` | 1845 | 101223 | operations |
| `dashboards/admin/SupervisorDashboard.tsx` | 1782 | 114630 | schools |
| `store/useStore.ts` | 1772 | 88949 | shared |
| `server/src/scripts/backendIntegrationGate.ts` | 1749 | 92319 | operations |
| `dashboards/admin/SchoolPortalManager.tsx` | 1736 | 101813 | schools |
| `pages/Plan.tsx` | 1732 | 79122 | shared |
| `server/src/scripts/seedOperationalScenario.ts` | 1725 | 62356 | operations |
| `App.tsx` | 1665 | 75319 | shared |
| `server/src/routes/ai.routes.ts` | 1648 | 65293 | ai |
| `server/src/scripts/seedOperationalScenarioApi.ts` | 1609 | 59044 | operations |
| `dashboards/admin/QuestionBankManager.tsx` | 1603 | 77062 | questions |
| `dashboards/admin/AdvancedCourseBuilder.tsx` | 1567 | 94724 | courses |
| `dashboards/admin/MockExamManager.tsx` | 1550 | 82630 | exams |
| `server/src/routes/auth.routes.ts` | 1545 | 55081 | auth |
| `dashboards/admin/QuizBuilder.tsx` | 1494 | 82025 | quizzes |
| `pages/GenericPathPage.tsx` | 1451 | 87864 | paths |
| `dashboards/admin/HomepageManager.tsx` | 1445 | 89804 | content |
| `pages/Quiz.tsx` | 1428 | 65611 | quizzes |
| `components/LearningSection.tsx` | 1368 | 87623 | learning |
| `server/src/scripts/smokeOperationalJourneysApi.ts` | 1293 | 51179 | operations |
| `dashboards/admin/LessonsManager.tsx` | 1263 | 62420 | learning |
| `dashboards/admin/PublicBarcodeTestsManager.tsx` | 1250 | 66200 | exams |
| `components/CourseOverview.tsx` | 1217 | 75239 | courses |

## Baseline safety evidence

- `BASELINE_CONTRACT_MANIFEST.json` captures current frontend route literals, backend HTTP route entries, router mount points, environment-key usage, and hashes of route sources.
- `MIGRATION_MAP_V2_CANDIDATE.json` is deliberately a **candidate** map; ambiguous ownership is marked for review and must not be treated as an automatic move instruction.
- Runtime imports are parsed with the TypeScript compiler AST and Node/TypeScript ESM `.js` specifiers are resolved back to tracked TypeScript source files.
- Cycles and cross-domain edges are measured only on runtime source, so test/audit scripts do not pollute architecture gates.

## Architectural interpretation

The target remains a modular monolith. The audit is intended to reduce file size, clarify domain ownership, and create enforceable boundaries without changing the product's URL/API contracts or database behavior during the structural phase.
