# Source Reference Audit

| Metric | Value |
|---|---:|
| Scripts/tool files scanned | 248 |
| Scripts coupled to current frontend source paths | 137 |
| Coupled source-path string references | 969 |
| Distinct coupled source targets | 218 |
| Relative `new URL(..., import.meta.url)` targets checked | 270 |
| Missing relative URL targets | 25 |

## Why this matters

Many existing smoke/audit scripts validate source text directly. Runtime source cannot be moved safely until these path-coupled checks are either updated atomically or made path-independent. This audit makes that hidden refactor cost visible before any file move.

## Most coupled source targets

| Target | References | Scripts |
|---|---:|---:|
| `App.tsx` | 71 | 14 |
| `services/api.ts` | 65 | 30 |
| `pages/Reports.tsx` | 57 | 38 |
| `dashboards/admin/SchoolsManager.tsx` | 39 | 32 |
| `components/LearningSection.tsx` | 25 | 14 |
| `from '../../../services/api'` | 19 | 16 |
| `pages/GenericPathPage.tsx` | 19 | 9 |
| `types.ts` | 18 | 16 |
| `dashboards/admin/AdminDashboard.tsx` | 18 | 12 |
| `dashboards/admin/HomepageManager.tsx` | 18 | 7 |
| `from '../../services/api'` | 17 | 16 |
| `store/useStore.ts` | 16 | 13 |
| `dashboards/admin/QuestionBankManager.tsx` | 16 | 5 |
| `dashboards/admin/QuizzesManager.tsx` | 14 | 6 |
| `components/CourseOverview.tsx` | 12 | 5 |
| `pages/Landing.tsx` | 12 | 5 |
| `components/CustomVideoPlayer.tsx` | 11 | 4 |
| `from '../../../store/useStore'` | 10 | 8 |
| `pages/QuizPage.tsx` | 9 | 8 |
| `contexts/AuthContext.tsx` | 9 | 5 |
| `pages/Reports/studentReportScopeViewModel.ts` | 9 | 5 |
| `components/Header.tsx` | 8 | 8 |
| `dashboards/admin/AdvancedCourseBuilder.tsx` | 8 | 6 |
| `pages/CourseView.tsx` | 8 | 6 |
| `pages/Reports/studentReportActionsViewModel.ts` | 8 | 5 |
| `pages/Reports/studentSkillRowsViewModel.ts` | 8 | 5 |
| `pages/Results.tsx` | 8 | 5 |
| `components/CoursePlayer.tsx` | 7 | 7 |
| `pages/Dashboard.tsx` | 7 | 7 |
| `components/PaymentModal.tsx` | 7 | 6 |
| `pages/SubjectLearningPage.tsx` | 7 | 6 |
| `pages/Reports/recommendationViewModel.ts` | 7 | 5 |
| `index.tsx` | 7 | 4 |
| `pages/Reports/scopedStudentFocusViewModel.ts` | 7 | 4 |
| `pages/Reports/studentLearningLoopViewModel.ts` | 7 | 4 |
| `pages/Reports/studentReadinessViewModel.ts` | 7 | 4 |
| `pages/Reports/studentWeeklyPlanViewModel.ts` | 7 | 4 |
| `components/MainLayout.tsx` | 7 | 2 |
| `dashboards/admin/UsersManager.tsx` | 6 | 5 |
| `pages/Reports/reportDomain.ts` | 6 | 4 |

## High-impact target -> script index

### `App.tsx`

- `scripts/smoke-performance-contract.mjs` — 39 reference(s)
- `scripts/smoke-seo-contract.mjs` — 9 reference(s)
- `scripts/smoke-public-open-items-contract.mjs` — 7 reference(s)
- `scripts/smoke-arabic-mojibake-guard.mjs` — 3 reference(s)
- `tools/refactor/repository-audit.mjs` — 3 reference(s)
- `scripts/smoke-real-usage-readiness-contract.mjs` — 2 reference(s)
- `scripts/smoke-announcement-ads-contract.mjs` — 1 reference(s)
- `scripts/smoke-auth-frontend-contract.mjs` — 1 reference(s)
- `scripts/smoke-barcode-public-tests-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100q-operational-admin-runtime-contract.mjs` — 1 reference(s)
- `scripts/smoke-my-quizzes-contract.mjs` — 1 reference(s)
- `scripts/smoke-production-audit-contract.mjs` — 1 reference(s)
- `scripts/smoke-route-loading-contract.mjs` — 1 reference(s)
- `scripts/smoke-runtime-source-contract.mjs` — 1 reference(s)

### `services/api.ts`

- `scripts/smoke-performance-contract.mjs` — 22 reference(s)
- `scripts/smoke-batch100p-question-bank-runtime-crud-contract.mjs` — 5 reference(s)
- `scripts/smoke-batch100o-admin-crud-course-linkage-contract.mjs` — 4 reference(s)
- `scripts/smoke-real-usage-readiness-contract.mjs` — 4 reference(s)
- `scripts/smoke-homepage-hero-contract.mjs` — 3 reference(s)
- `scripts/smoke-batch136-admin-users-schools-parent-payment-contract.mjs` — 2 reference(s)
- `scripts/smoke-frontend-phase5-contract.mjs` — 2 reference(s)
- `scripts/smoke-ai-config-bridge-contract.mjs` — 1 reference(s)
- `scripts/smoke-announcement-ads-contract.mjs` — 1 reference(s)
- `scripts/smoke-api-phase4-contract.mjs` — 1 reference(s)
- `scripts/smoke-auth-account-contract.mjs` — 1 reference(s)
- `scripts/smoke-auth-cookie-contract.mjs` — 1 reference(s)
- `scripts/smoke-auth-frontend-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100d-admin-course-flow.mjs` — 1 reference(s)
- `scripts/smoke-batch100f-relationship-audit-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100i-admin-dashboard-functional-qa-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100q-operational-admin-runtime-contract.mjs` — 1 reference(s)
- `scripts/smoke-csrf-contract.mjs` — 1 reference(s)
- `scripts/smoke-dashboards-phase11-contract.mjs` — 1 reference(s)
- `scripts/smoke-direct-unlock-cleanup-contract.mjs` — 1 reference(s)
- `scripts/smoke-integrations-runtime-contract.mjs` — 1 reference(s)
- `scripts/smoke-payment-package-contract.mjs` — 1 reference(s)
- `scripts/smoke-platform-fonts-contract.mjs` — 1 reference(s)
- `scripts/smoke-quiz-client-security-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-role-contract.mjs` — 1 reference(s)
- `scripts/smoke-school-management-contract.mjs` — 1 reference(s)
- `scripts/smoke-school-portal-command-center-contract.mjs` — 1 reference(s)
- `scripts/smoke-student-learning-progress-contract.mjs` — 1 reference(s)
- `scripts/smoke-student-session-booking-contract.mjs` — 1 reference(s)
- `tools/refactor/repository-audit.mjs` — 1 reference(s)

### `pages/Reports.tsx`

- `scripts/smoke-performance-contract.mjs` — 18 reference(s)
- `scripts/smoke-arabic-mojibake-guard.mjs` — 3 reference(s)
- `scripts/smoke-dashboards-phase11-contract.mjs` — 1 reference(s)
- `scripts/smoke-global-student-journey-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-directed-quiz-analytics-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-domain-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-institutional-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-recommendation-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-role-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-scoped-analytics-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-scoped-comparison-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-scoped-export-rows-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-scoped-remediation-fallback-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-scoped-skill-report-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-scoped-student-focus-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-analytics-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-learning-loop-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-readiness-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-remediation-fallback-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-report-actions-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-report-scope-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-selected-skill-presentation-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-skill-rows-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-smart-remediation-presentation-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-weekly-plan-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-weekly-plan-presentation-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-student-path-scope-contract.mjs` — 1 reference(s)
- `scripts/smoke-xlsx-safety-contract.mjs` — 1 reference(s)
- `tools/refactor/apply-reports-scoped-export-rows.mjs` — 1 reference(s)
- `tools/refactor/apply-reports-scoped-remediation-fallback.mjs` — 1 reference(s)
- `tools/refactor/apply-reports-scoped-skill-report.mjs` — 1 reference(s)
- `tools/refactor/apply-reports-student-learning-loop.mjs` — 1 reference(s)
- `tools/refactor/apply-reports-student-readiness.mjs` — 1 reference(s)
- `tools/refactor/apply-reports-student-remediation-fallback.mjs` — 1 reference(s)
- `tools/refactor/apply-reports-student-report-scope.mjs` — 1 reference(s)
- `tools/refactor/apply-reports-student-selected-skill-presentation.mjs` — 1 reference(s)
- `tools/refactor/apply-reports-student-smart-remediation-presentation.mjs` — 1 reference(s)
- `tools/refactor/apply-reports-student-weekly-plan-presentation.mjs` — 1 reference(s)

### `dashboards/admin/SchoolsManager.tsx`

- `scripts/smoke-arabic-mojibake-guard.mjs` — 2 reference(s)
- `scripts/smoke-batch136-admin-users-schools-parent-payment-contract.mjs` — 2 reference(s)
- `tools/refactor/apply-school-card-readiness-projection.mjs` — 2 reference(s)
- `tools/refactor/apply-school-launch-board-presentation.mjs` — 2 reference(s)
- `tools/refactor/apply-school-portfolio-card-presentation.mjs` — 2 reference(s)
- `tools/refactor/apply-school-portfolio-projection.mjs` — 2 reference(s)
- `tools/refactor/apply-school-workspace-controls-presentation.mjs` — 2 reference(s)
- `scripts/smoke-batch100f-relationship-audit-contract.mjs` — 1 reference(s)
- `scripts/smoke-package-revenue-contract.mjs` — 1 reference(s)
- `scripts/smoke-performance-contract.mjs` — 1 reference(s)
- `scripts/smoke-school-management-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-card-readiness-projection-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-class-card-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-command-center-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-import-parsing-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-launch-board-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-overview-operations-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-overview-operators-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-portfolio-card-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-portfolio-filter-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-portfolio-projection-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-readiness-viewmodel-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-relationship-viewmodel-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-reports-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-roster-viewmodel-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-student-roster-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-workspace-controls-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-workspace-sections-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-workspace-viewmodel-contract.mjs` — 1 reference(s)
- `scripts/smoke-xlsx-safety-contract.mjs` — 1 reference(s)
- `tools/refactor/module-boundary-gate.mjs` — 1 reference(s)
- `tools/refactor/phase-review-school-portfolio-projection.mjs` — 1 reference(s)

### `components/LearningSection.tsx`

- `scripts/smoke-performance-contract.mjs` — 8 reference(s)
- `scripts/smoke-batch100o-admin-crud-course-linkage-contract.mjs` — 4 reference(s)
- `scripts/smoke-foundation-course-details-contract.mjs` — 2 reference(s)
- `scripts/smoke-batch100d-admin-course-flow.mjs` — 1 reference(s)
- `scripts/smoke-course-file-access-contract.mjs` — 1 reference(s)
- `scripts/smoke-learning-placement-admin-contract.mjs` — 1 reference(s)
- `scripts/smoke-library-support-contract.mjs` — 1 reference(s)
- `scripts/smoke-package-course-split-contract.mjs` — 1 reference(s)
- `scripts/smoke-package-path-navigation-contract.mjs` — 1 reference(s)
- `scripts/smoke-payment-package-contract.mjs` — 1 reference(s)
- `scripts/smoke-production-audit-contract.mjs` — 1 reference(s)
- `scripts/smoke-quiz-access-contract.mjs` — 1 reference(s)
- `scripts/smoke-real-usage-readiness-contract.mjs` — 1 reference(s)
- `scripts/smoke-student-learning-progress-contract.mjs` — 1 reference(s)

### `from '../../../services/api'`

- `scripts/smoke-schools-reports-boundary-contract.mjs` — 3 reference(s)
- `scripts/smoke-schools-overview-operators-boundary-contract.mjs` — 2 reference(s)
- `scripts/smoke-schools-access-codes-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-class-card-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-command-center-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-overview-operations-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-package-access-viewmodel-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-package-card-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-quick-supervisor-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-relations-import-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-relations-report-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-relations-status-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-roster-viewmodel-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-student-roster-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-workspace-sections-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-workspace-viewmodel-contract.mjs` — 1 reference(s)

### `pages/GenericPathPage.tsx`

- `scripts/smoke-real-usage-readiness-contract.mjs` — 10 reference(s)
- `scripts/smoke-performance-contract.mjs` — 2 reference(s)
- `scripts/smoke-learning-placement-admin-contract.mjs` — 1 reference(s)
- `scripts/smoke-mock-exam-contract.mjs` — 1 reference(s)
- `scripts/smoke-package-course-split-contract.mjs` — 1 reference(s)
- `scripts/smoke-package-path-navigation-contract.mjs` — 1 reference(s)
- `scripts/smoke-payment-package-contract.mjs` — 1 reference(s)
- `scripts/smoke-quiz-access-contract.mjs` — 1 reference(s)
- `scripts/smoke-route-loading-contract.mjs` — 1 reference(s)

### `types.ts`

- `scripts/smoke-homepage-hero-contract.mjs` — 2 reference(s)
- `tools/refactor/repository-audit.mjs` — 2 reference(s)
- `scripts/smoke-announcement-ads-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100j-homepage-branding-course-icons-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100k-homepage-admin-functional-sweep-contract.mjs` — 1 reference(s)
- `scripts/smoke-course-builder-contract.mjs` — 1 reference(s)
- `scripts/smoke-course-file-access-contract.mjs` — 1 reference(s)
- `scripts/smoke-header-navigation-contract.mjs` — 1 reference(s)
- `scripts/smoke-library-support-contract.mjs` — 1 reference(s)
- `scripts/smoke-mock-exam-contract.mjs` — 1 reference(s)
- `scripts/smoke-package-revenue-contract.mjs` — 1 reference(s)
- `scripts/smoke-payment-package-contract.mjs` — 1 reference(s)
- `scripts/smoke-payment-provider-readiness-contract.mjs` — 1 reference(s)
- `scripts/smoke-platform-fonts-contract.mjs` — 1 reference(s)
- `scripts/smoke-quiz-access-contract.mjs` — 1 reference(s)
- `scripts/smoke-video-questions-contract.mjs` — 1 reference(s)

### `dashboards/admin/AdminDashboard.tsx`

- `scripts/smoke-performance-contract.mjs` — 5 reference(s)
- `scripts/smoke-arabic-mojibake-guard.mjs` — 2 reference(s)
- `scripts/smoke-homepage-hero-contract.mjs` — 2 reference(s)
- `scripts/fix-mojibake.mjs` — 1 reference(s)
- `scripts/smoke-admin-memberships-ai-closure-contract.mjs` — 1 reference(s)
- `scripts/smoke-admin-tabs-contract.mjs` — 1 reference(s)
- `scripts/smoke-announcement-ads-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100n-admin-tab-e2e-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch136-admin-users-schools-parent-payment-contract.mjs` — 1 reference(s)
- `scripts/smoke-global-student-journey-contract.mjs` — 1 reference(s)
- `scripts/smoke-platform-fonts-contract.mjs` — 1 reference(s)
- `scripts/smoke-school-portal-command-center-contract.mjs` — 1 reference(s)

### `dashboards/admin/HomepageManager.tsx`

- `scripts/smoke-homepage-hero-contract.mjs` — 12 reference(s)
- `scripts/smoke-batch100i-admin-dashboard-functional-qa-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100j-homepage-branding-course-icons-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100k-homepage-admin-functional-sweep-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100l-homepage-color-picker-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100m-homepage-live-preview-contract.mjs` — 1 reference(s)
- `scripts/smoke-header-navigation-contract.mjs` — 1 reference(s)

### `from '../../services/api'`

- `scripts/smoke-reports-domain-boundary-contract.mjs` — 2 reference(s)
- `scripts/smoke-reports-directed-quiz-analytics-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-institutional-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-recommendation-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-scoped-analytics-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-scoped-comparison-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-scoped-skill-report-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-scoped-student-focus-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-analytics-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-learning-loop-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-readiness-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-report-actions-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-report-scope-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-skill-rows-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-student-weekly-plan-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-portfolio-projection-boundary-contract.mjs` — 1 reference(s)

### `store/useStore.ts`

- `scripts/smoke-batch100p-question-bank-runtime-crud-contract.mjs` — 3 reference(s)
- `scripts/smoke-performance-contract.mjs` — 2 reference(s)
- `scripts/smoke-announcement-ads-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100f-relationship-audit-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100q-operational-admin-runtime-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch136-admin-users-schools-parent-payment-contract.mjs` — 1 reference(s)
- `scripts/smoke-direct-unlock-cleanup-contract.mjs` — 1 reference(s)
- `scripts/smoke-library-support-contract.mjs` — 1 reference(s)
- `scripts/smoke-quiz-client-security-contract.mjs` — 1 reference(s)
- `scripts/smoke-runtime-source-contract.mjs` — 1 reference(s)
- `scripts/smoke-school-management-contract.mjs` — 1 reference(s)
- `scripts/smoke-student-learning-progress-contract.mjs` — 1 reference(s)
- `tools/refactor/repository-audit.mjs` — 1 reference(s)

### `dashboards/admin/QuestionBankManager.tsx`

- `scripts/smoke-batch100p-question-bank-runtime-crud-contract.mjs` — 11 reference(s)
- `scripts/smoke-xlsx-safety-contract.mjs` — 2 reference(s)
- `scripts/smoke-batch100i-admin-dashboard-functional-qa-contract.mjs` — 1 reference(s)
- `scripts/smoke-performance-contract.mjs` — 1 reference(s)
- `scripts/smoke-question-html-security-contract.mjs` — 1 reference(s)

### `dashboards/admin/QuizzesManager.tsx`

- `scripts/smoke-performance-contract.mjs` — 8 reference(s)
- `scripts/smoke-foundation-course-details-contract.mjs` — 2 reference(s)
- `scripts/smoke-exam-question-source-contract.mjs` — 1 reference(s)
- `scripts/smoke-learning-placement-admin-contract.mjs` — 1 reference(s)
- `scripts/smoke-quiz-access-contract.mjs` — 1 reference(s)
- `scripts/smoke-xlsx-safety-contract.mjs` — 1 reference(s)

### `components/CourseOverview.tsx`

- `scripts/smoke-foundation-course-details-contract.mjs` — 8 reference(s)
- `scripts/smoke-batch100j-homepage-branding-course-icons-contract.mjs` — 1 reference(s)
- `scripts/smoke-course-file-access-contract.mjs` — 1 reference(s)
- `scripts/smoke-course-quiz-context-contract.mjs` — 1 reference(s)
- `scripts/smoke-student-path-scope-contract.mjs` — 1 reference(s)

### `pages/Landing.tsx`

- `scripts/smoke-homepage-hero-contract.mjs` — 8 reference(s)
- `scripts/smoke-batch100i-admin-dashboard-functional-qa-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100j-homepage-branding-course-icons-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100l-homepage-color-picker-contract.mjs` — 1 reference(s)
- `scripts/smoke-global-student-journey-contract.mjs` — 1 reference(s)

### `components/CustomVideoPlayer.tsx`

- `scripts/smoke-performance-contract.mjs` — 8 reference(s)
- `scripts/smoke-announcement-ads-contract.mjs` — 1 reference(s)
- `scripts/smoke-question-html-security-contract.mjs` — 1 reference(s)
- `scripts/smoke-video-questions-contract.mjs` — 1 reference(s)

### `from '../../../store/useStore'`

- `scripts/smoke-schools-reports-boundary-contract.mjs` — 3 reference(s)
- `scripts/smoke-schools-access-codes-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-package-card-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-quick-supervisor-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-relations-import-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-relations-report-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-relations-status-boundary-contract.mjs` — 1 reference(s)
- `scripts/smoke-schools-student-roster-boundary-contract.mjs` — 1 reference(s)

### `pages/QuizPage.tsx`

- `scripts/smoke-public-open-items-contract.mjs` — 2 reference(s)
- `scripts/smoke-batch100q-operational-admin-runtime-contract.mjs` — 1 reference(s)
- `scripts/smoke-course-quiz-context-contract.mjs` — 1 reference(s)
- `scripts/smoke-mock-exam-contract.mjs` — 1 reference(s)
- `scripts/smoke-question-html-security-contract.mjs` — 1 reference(s)
- `scripts/smoke-quiz-access-contract.mjs` — 1 reference(s)
- `scripts/smoke-quiz-answer-exposure-contract.mjs` — 1 reference(s)
- `scripts/smoke-quiz-client-security-contract.mjs` — 1 reference(s)

### `contexts/AuthContext.tsx`

- `scripts/smoke-performance-contract.mjs` — 5 reference(s)
- `scripts/smoke-auth-cookie-contract.mjs` — 1 reference(s)
- `scripts/smoke-frontend-phase5-contract.mjs` — 1 reference(s)
- `scripts/smoke-homepage-hero-contract.mjs` — 1 reference(s)
- `scripts/smoke-school-portal-command-center-contract.mjs` — 1 reference(s)

### `pages/Reports/studentReportScopeViewModel.ts`

- `scripts/smoke-reports-student-report-scope-boundary-contract.mjs` — 3 reference(s)
- `scripts/smoke-performance-contract.mjs` — 2 reference(s)
- `tools/refactor/apply-reports-student-report-scope.mjs` — 2 reference(s)
- `scripts/smoke-global-student-journey-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-role-contract.mjs` — 1 reference(s)

### `components/Header.tsx`

- `scripts/smoke-announcement-ads-contract.mjs` — 1 reference(s)
- `scripts/smoke-auth-frontend-contract.mjs` — 1 reference(s)
- `scripts/smoke-auth-login-security-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100k-homepage-admin-functional-sweep-contract.mjs` — 1 reference(s)
- `scripts/smoke-header-navigation-contract.mjs` — 1 reference(s)
- `scripts/smoke-mock-exam-contract.mjs` — 1 reference(s)
- `scripts/smoke-my-quizzes-contract.mjs` — 1 reference(s)
- `scripts/smoke-route-loading-contract.mjs` — 1 reference(s)

### `dashboards/admin/AdvancedCourseBuilder.tsx`

- `scripts/smoke-batch100o-admin-crud-course-linkage-contract.mjs` — 3 reference(s)
- `scripts/smoke-batch100d-admin-course-flow.mjs` — 1 reference(s)
- `scripts/smoke-batch100i-admin-dashboard-functional-qa-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100j-homepage-branding-course-icons-contract.mjs` — 1 reference(s)
- `scripts/smoke-course-builder-contract.mjs` — 1 reference(s)
- `scripts/smoke-course-file-access-contract.mjs` — 1 reference(s)

### `pages/CourseView.tsx`

- `scripts/smoke-arabic-mojibake-guard.mjs` — 3 reference(s)
- `scripts/smoke-batch100i-admin-dashboard-functional-qa-contract.mjs` — 1 reference(s)
- `scripts/smoke-course-file-access-contract.mjs` — 1 reference(s)
- `scripts/smoke-package-path-navigation-contract.mjs` — 1 reference(s)
- `scripts/smoke-real-usage-readiness-contract.mjs` — 1 reference(s)
- `scripts/smoke-student-path-scope-contract.mjs` — 1 reference(s)

### `pages/Reports/studentReportActionsViewModel.ts`

- `scripts/smoke-reports-student-report-actions-boundary-contract.mjs` — 3 reference(s)
- `tools/refactor/apply-reports-scoped-skill-report.mjs` — 2 reference(s)
- `scripts/smoke-global-student-journey-contract.mjs` — 1 reference(s)
- `scripts/smoke-performance-contract.mjs` — 1 reference(s)
- `scripts/smoke-reports-role-contract.mjs` — 1 reference(s)

## Coupled scripts

- `scripts/fix-mojibake.mjs` — 1 reference(s)
- `scripts/smoke-admin-memberships-ai-closure-contract.mjs` — 4 reference(s)
- `scripts/smoke-admin-tabs-contract.mjs` — 1 reference(s)
- `scripts/smoke-ai-config-bridge-contract.mjs` — 3 reference(s)
- `scripts/smoke-announcement-ads-contract.mjs` — 12 reference(s)
- `scripts/smoke-api-phase4-contract.mjs` — 1 reference(s)
- `scripts/smoke-arabic-mojibake-guard.mjs` — 22 reference(s)
- `scripts/smoke-auth-account-contract.mjs` — 1 reference(s)
- `scripts/smoke-auth-cookie-contract.mjs` — 2 reference(s)
- `scripts/smoke-auth-frontend-contract.mjs` — 6 reference(s)
- `scripts/smoke-auth-login-security-contract.mjs` — 2 reference(s)
- `scripts/smoke-barcode-public-tests-contract.mjs` — 2 reference(s)
- `scripts/smoke-batch100d-admin-course-flow.mjs` — 4 reference(s)
- `scripts/smoke-batch100f-relationship-audit-contract.mjs` — 14 reference(s)
- `scripts/smoke-batch100i-admin-dashboard-functional-qa-contract.mjs` — 8 reference(s)
- `scripts/smoke-batch100j-homepage-branding-course-icons-contract.mjs` — 7 reference(s)
- `scripts/smoke-batch100k-homepage-admin-functional-sweep-contract.mjs` — 3 reference(s)
- `scripts/smoke-batch100l-homepage-color-picker-contract.mjs` — 2 reference(s)
- `scripts/smoke-batch100m-homepage-live-preview-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100n-admin-tab-e2e-contract.mjs` — 1 reference(s)
- `scripts/smoke-batch100o-admin-crud-course-linkage-contract.mjs` — 11 reference(s)
- `scripts/smoke-batch100p-question-bank-runtime-crud-contract.mjs` — 19 reference(s)
- `scripts/smoke-batch100q-operational-admin-runtime-contract.mjs` — 8 reference(s)
- `scripts/smoke-batch136-admin-users-schools-parent-payment-contract.mjs` — 11 reference(s)
- `scripts/smoke-course-builder-contract.mjs` — 2 reference(s)
- `scripts/smoke-course-file-access-contract.mjs` — 8 reference(s)
- `scripts/smoke-course-quiz-context-contract.mjs` — 4 reference(s)
- `scripts/smoke-course-visibility-contract.mjs` — 1 reference(s)
- `scripts/smoke-csrf-contract.mjs` — 1 reference(s)
- `scripts/smoke-dashboards-phase11-contract.mjs` — 3 reference(s)
- `scripts/smoke-direct-unlock-cleanup-contract.mjs` — 2 reference(s)
- `scripts/smoke-exam-question-source-contract.mjs` — 5 reference(s)
- `scripts/smoke-foundation-course-details-contract.mjs` — 20 reference(s)
- `scripts/smoke-frontend-phase5-contract.mjs` — 4 reference(s)
- `scripts/smoke-global-student-journey-contract.mjs` — 34 reference(s)
- `scripts/smoke-header-navigation-contract.mjs` — 4 reference(s)
- `scripts/smoke-homepage-hero-contract.mjs` — 29 reference(s)
- `scripts/smoke-integrations-runtime-contract.mjs` — 3 reference(s)
- `scripts/smoke-learning-placement-admin-contract.mjs` — 6 reference(s)
- `scripts/smoke-library-support-contract.mjs` — 8 reference(s)
- `scripts/smoke-membership-pricing-contract.mjs` — 3 reference(s)
- `scripts/smoke-mock-exam-contract.mjs` — 7 reference(s)
- `scripts/smoke-my-quizzes-contract.mjs` — 7 reference(s)
- `scripts/smoke-package-course-split-contract.mjs` — 7 reference(s)
- `scripts/smoke-package-path-navigation-contract.mjs` — 4 reference(s)
- `scripts/smoke-package-revenue-contract.mjs` — 5 reference(s)
- `scripts/smoke-payment-package-contract.mjs` — 9 reference(s)
- `scripts/smoke-payment-provider-readiness-contract.mjs` — 3 reference(s)
- `scripts/smoke-performance-contract.mjs` — 159 reference(s)
- `scripts/smoke-platform-fonts-contract.mjs` — 6 reference(s)
- `scripts/smoke-production-audit-contract.mjs` — 2 reference(s)
- `scripts/smoke-public-open-items-contract.mjs` — 22 reference(s)
- `scripts/smoke-question-html-security-contract.mjs` — 13 reference(s)
- `scripts/smoke-quiz-access-contract.mjs` — 11 reference(s)
- `scripts/smoke-quiz-answer-exposure-contract.mjs` — 3 reference(s)
- `scripts/smoke-quiz-client-security-contract.mjs` — 3 reference(s)
- `scripts/smoke-real-usage-readiness-contract.mjs` — 19 reference(s)
- `scripts/smoke-reports-directed-quiz-analytics-boundary-contract.mjs` — 5 reference(s)
- `scripts/smoke-reports-domain-boundary-contract.mjs` — 7 reference(s)
- `scripts/smoke-reports-institutional-boundary-contract.mjs` — 5 reference(s)
- `scripts/smoke-reports-recommendation-boundary-contract.mjs` — 6 reference(s)
- `scripts/smoke-reports-role-contract.mjs` — 26 reference(s)
- `scripts/smoke-reports-scoped-analytics-boundary-contract.mjs` — 5 reference(s)
- `scripts/smoke-reports-scoped-comparison-boundary-contract.mjs` — 5 reference(s)
- `scripts/smoke-reports-scoped-export-rows-boundary-contract.mjs` — 3 reference(s)
- `scripts/smoke-reports-scoped-remediation-fallback-boundary-contract.mjs` — 2 reference(s)
- `scripts/smoke-reports-scoped-skill-report-boundary-contract.mjs` — 4 reference(s)
- `scripts/smoke-reports-scoped-student-focus-boundary-contract.mjs` — 5 reference(s)
- `scripts/smoke-reports-student-analytics-boundary-contract.mjs` — 6 reference(s)
- `scripts/smoke-reports-student-learning-loop-boundary-contract.mjs` — 5 reference(s)
- `scripts/smoke-reports-student-readiness-boundary-contract.mjs` — 5 reference(s)
- `scripts/smoke-reports-student-remediation-fallback-boundary-contract.mjs` — 2 reference(s)
- `scripts/smoke-reports-student-report-actions-boundary-contract.mjs` — 5 reference(s)
- `scripts/smoke-reports-student-report-scope-boundary-contract.mjs` — 5 reference(s)
- `scripts/smoke-reports-student-selected-skill-presentation-boundary-contract.mjs` — 4 reference(s)
- `scripts/smoke-reports-student-skill-rows-boundary-contract.mjs` — 5 reference(s)
- `scripts/smoke-reports-student-smart-remediation-presentation-boundary-contract.mjs` — 4 reference(s)
- `scripts/smoke-reports-student-weekly-plan-boundary-contract.mjs` — 6 reference(s)
- `scripts/smoke-reports-student-weekly-plan-presentation-boundary-contract.mjs` — 4 reference(s)
- `scripts/smoke-results-contract.mjs` — 1 reference(s)
- `scripts/smoke-route-loading-contract.mjs` — 3 reference(s)
- `scripts/smoke-runtime-source-contract.mjs` — 6 reference(s)
- `scripts/smoke-saher-skill-scope.mjs` — 2 reference(s)
- `scripts/smoke-school-management-contract.mjs` — 22 reference(s)
- `scripts/smoke-school-portal-command-center-contract.mjs` — 7 reference(s)
- `scripts/smoke-schools-access-codes-boundary-contract.mjs` — 5 reference(s)
- `scripts/smoke-schools-card-readiness-projection-boundary-contract.mjs` — 3 reference(s)
- `scripts/smoke-schools-class-card-boundary-contract.mjs` — 4 reference(s)
- `scripts/smoke-schools-command-center-boundary-contract.mjs` — 3 reference(s)
- `scripts/smoke-schools-import-parsing-contract.mjs` — 5 reference(s)
- `scripts/smoke-schools-launch-board-boundary-contract.mjs` — 2 reference(s)
- `scripts/smoke-schools-overview-operations-boundary-contract.mjs` — 3 reference(s)
- `scripts/smoke-schools-overview-operators-boundary-contract.mjs` — 5 reference(s)
- `scripts/smoke-schools-package-access-viewmodel-contract.mjs` — 3 reference(s)
- `scripts/smoke-schools-package-card-boundary-contract.mjs` — 5 reference(s)
- `scripts/smoke-schools-portfolio-card-boundary-contract.mjs` — 3 reference(s)
- `scripts/smoke-schools-portfolio-filter-boundary-contract.mjs` — 3 reference(s)
- `scripts/smoke-schools-portfolio-projection-boundary-contract.mjs` — 3 reference(s)
- `scripts/smoke-schools-quick-supervisor-boundary-contract.mjs` — 4 reference(s)
- `scripts/smoke-schools-readiness-viewmodel-contract.mjs` — 2 reference(s)
- `scripts/smoke-schools-relations-import-boundary-contract.mjs` — 4 reference(s)
- `scripts/smoke-schools-relations-report-boundary-contract.mjs` — 4 reference(s)
- `scripts/smoke-schools-relations-status-boundary-contract.mjs` — 4 reference(s)
- `scripts/smoke-schools-relationship-viewmodel-contract.mjs` — 2 reference(s)
- `scripts/smoke-schools-reports-boundary-contract.mjs` — 10 reference(s)
- `scripts/smoke-schools-roster-viewmodel-contract.mjs` — 3 reference(s)
- `scripts/smoke-schools-student-roster-boundary-contract.mjs` — 5 reference(s)
- `scripts/smoke-schools-workspace-controls-boundary-contract.mjs` — 2 reference(s)
- `scripts/smoke-schools-workspace-sections-boundary-contract.mjs` — 4 reference(s)
- `scripts/smoke-schools-workspace-viewmodel-contract.mjs` — 3 reference(s)
- `scripts/smoke-sentry-runtime-contract.mjs` — 1 reference(s)
- `scripts/smoke-seo-contract.mjs` — 9 reference(s)
- `scripts/smoke-student-learning-progress-contract.mjs` — 3 reference(s)
- `scripts/smoke-student-path-scope-contract.mjs` — 5 reference(s)
- `scripts/smoke-student-session-booking-contract.mjs` — 5 reference(s)
- `scripts/smoke-supervisor-dashboard-contract.mjs` — 1 reference(s)
- `scripts/smoke-video-questions-contract.mjs` — 6 reference(s)
- `scripts/smoke-xlsx-safety-contract.mjs` — 12 reference(s)
- `tools/refactor/apply-content-learning-schemas.mjs` — 1 reference(s)
- `tools/refactor/apply-reports-scoped-export-rows.mjs` — 4 reference(s)
- `tools/refactor/apply-reports-scoped-remediation-fallback.mjs` — 4 reference(s)
- `tools/refactor/apply-reports-scoped-skill-report.mjs` — 25 reference(s)
- `tools/refactor/apply-reports-student-learning-loop.mjs` — 7 reference(s)
- `tools/refactor/apply-reports-student-readiness.mjs` — 7 reference(s)
- `tools/refactor/apply-reports-student-remediation-fallback.mjs` — 4 reference(s)
- `tools/refactor/apply-reports-student-report-scope.mjs` — 7 reference(s)
- `tools/refactor/apply-reports-student-selected-skill-presentation.mjs` — 6 reference(s)
- `tools/refactor/apply-reports-student-smart-remediation-presentation.mjs` — 6 reference(s)
- `tools/refactor/apply-reports-student-weekly-plan-presentation.mjs` — 6 reference(s)
- `tools/refactor/apply-school-card-readiness-projection.mjs` — 2 reference(s)
- `tools/refactor/apply-school-launch-board-presentation.mjs` — 2 reference(s)
- `tools/refactor/apply-school-portfolio-card-presentation.mjs` — 2 reference(s)
- `tools/refactor/apply-school-portfolio-projection.mjs` — 2 reference(s)
- `tools/refactor/apply-school-workspace-controls-presentation.mjs` — 2 reference(s)
- `tools/refactor/module-boundary-gate.mjs` — 2 reference(s)
- `tools/refactor/phase-review-school-portfolio-projection.mjs` — 1 reference(s)
- `tools/refactor/repository-audit.mjs` — 15 reference(s)

## Missing relative targets

- `scripts/smoke-auth-account-contract.mjs` -> `../AUTH_ACCOUNT_SECURITY.md` (resolved: `AUTH_ACCOUNT_SECURITY.md`)
- `scripts/smoke-auth-account-contract.mjs` -> `../PRODUCTION_READINESS_REPORT.md` (resolved: `PRODUCTION_READINESS_REPORT.md`)
- `scripts/smoke-auth-frontend-contract.mjs` -> `../PRODUCTION_READINESS_REPORT.md` (resolved: `PRODUCTION_READINESS_REPORT.md`)
- `scripts/smoke-database-index-contract.mjs` -> `../DATABASE_REVIEW.md` (resolved: `DATABASE_REVIEW.md`)
- `scripts/smoke-database-index-contract.mjs` -> `../PRODUCTION_READINESS_REPORT.md` (resolved: `PRODUCTION_READINESS_REPORT.md`)
- `scripts/smoke-deployment-handover-phase19-contract.mjs` -> `../19_20_DEPLOYMENT_HANDOVER_REPORT.md` (resolved: `19_20_DEPLOYMENT_HANDOVER_REPORT.md`)
- `scripts/smoke-deployment-handover-phase19-contract.mjs` -> `../DEPLOYMENT_GUIDE.md` (resolved: `DEPLOYMENT_GUIDE.md`)
- `scripts/smoke-frontend-phase5-contract.mjs` -> `../05_FRONTEND_IMPLEMENTATION_REPORT.md` (resolved: `05_FRONTEND_IMPLEMENTATION_REPORT.md`)
- `scripts/smoke-load-test-contract.mjs` -> `../LOAD_TEST_REPORT.md` (resolved: `LOAD_TEST_REPORT.md`)
- `scripts/smoke-monitoring-contract.mjs` -> `../MONITORING_AND_LOGGING_GUIDE.md` (resolved: `MONITORING_AND_LOGGING_GUIDE.md`)
- `scripts/smoke-monitoring-contract.mjs` -> `../PRODUCTION_READINESS_REPORT.md` (resolved: `PRODUCTION_READINESS_REPORT.md`)
- `scripts/smoke-nosql-sanitizer-contract.mjs` -> `../SECURITY_CHECKLIST.md` (resolved: `SECURITY_CHECKLIST.md`)
- `scripts/smoke-nosql-sanitizer-contract.mjs` -> `../PRODUCTION_READINESS_REPORT.md` (resolved: `PRODUCTION_READINESS_REPORT.md`)
- `scripts/smoke-nosql-sanitizer-contract.mjs` -> `../DEPLOYMENT_GUIDE.md` (resolved: `DEPLOYMENT_GUIDE.md`)
- `scripts/smoke-notification-contract.mjs` -> `../NOTIFICATION_SYSTEM_GUIDE.md` (resolved: `NOTIFICATION_SYSTEM_GUIDE.md`)
- `scripts/smoke-notification-contract.mjs` -> `../WHATSAPP_INTEGRATION_GUIDE.md` (resolved: `WHATSAPP_INTEGRATION_GUIDE.md`)
- `scripts/smoke-notification-contract.mjs` -> `../PRODUCTION_READINESS_REPORT.md` (resolved: `PRODUCTION_READINESS_REPORT.md`)
- `scripts/smoke-production-ops-phase14-contract.mjs` -> `../14_15_16_PRODUCTION_OPS_REPORT.md` (resolved: `14_15_16_PRODUCTION_OPS_REPORT.md`)
- `scripts/smoke-qa-phase17-contract.mjs` -> `../17_18_TESTING_REPORT.md` (resolved: `17_18_TESTING_REPORT.md`)
- `scripts/smoke-qa-phase17-contract.mjs` -> `../TESTING_REPORT.md` (resolved: `TESTING_REPORT.md`)
- `scripts/smoke-runtime-source-contract.mjs` -> `../services/firebaseSync.ts` (resolved: `services/firebaseSync.ts`)
- `scripts/smoke-runtime-source-contract.mjs` -> `../services/firebase.ts` (resolved: `services/firebase.ts`)
- `scripts/smoke-security-rbac-phase6-contract.mjs` -> `../SECURITY_CHECKLIST.md` (resolved: `SECURITY_CHECKLIST.md`)
- `scripts/smoke-security-rbac-phase6-contract.mjs` -> `../RBAC_MATRIX.md` (resolved: `RBAC_MATRIX.md`)
- `scripts/smoke-security-rbac-phase6-contract.mjs` -> `../06_07_SECURITY_RBAC_REPORT.md` (resolved: `06_07_SECURITY_RBAC_REPORT.md`)
