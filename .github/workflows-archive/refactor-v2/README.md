# Refactor V2 workflow archive

Owner-authorized repository cleanup, 2026-10-16. All 35 refactor-v2 YAML files were moved with git mv; their bytes are unchanged. GitHub Actions does not execute files from this archive.

The three protected-main required checks remain in the active V3 backend integration, deep pre-merge E2E, and phase/handover workflows. Active V3 Recovery retains typecheck/build/architecture/readiness checks; 62 otherwise unique non-mutating source contracts now run once through scripts/run-preserved-repo-contracts.mjs. Dependency security auditing continues at .github/workflows/dependency-security-audit.yml with its original severity gate. No branch-protection rule was removed or weakened.

Historical race/trigger smoke checks read these archived blueprints; they do not certify active scheduling. The global certification contract verifies active V3 coverage instead. Old phase apply/review tools are historical; restore and review the workflow before intentionally reactivating a phase. Never reactivate old automatic repair/commit steps merely to regenerate an audit.

Human UX PNGs are local evidence: 41 tracked images removed from the index while all local hashes remain unchanged. audit-evidence/**/*.png prevents future accidental additions. Historical Git objects and past workflow runs were not rewritten or removed.

## Archived files

- [refactor-v2-api-query-utilities.yml](refactor-v2-api-query-utilities.yml)
- [refactor-v2-audit.yml](refactor-v2-audit.yml)
- [refactor-v2-baseline-repair.yml](refactor-v2-baseline-repair.yml)
- [refactor-v2-content-platform-integration-defaults.yml](refactor-v2-content-platform-integration-defaults.yml)
- [refactor-v2-content-platform-presentation-defaults.yml](refactor-v2-content-platform-presentation-defaults.yml)
- [refactor-v2-content-study-plan-schemas.yml](refactor-v2-content-study-plan-schemas.yml)
- [refactor-v2-dashboard-path-progress.yml](refactor-v2-dashboard-path-progress.yml)
- [refactor-v2-dependency-audit.yml](refactor-v2-dependency-audit.yml)
- [refactor-v2-freeze-baseline.yml](refactor-v2-freeze-baseline.yml)
- [refactor-v2-guard.yml](refactor-v2-guard.yml)
- [refactor-v2-paths-display-presentation.yml](refactor-v2-paths-display-presentation.yml)
- [refactor-v2-production-readiness.yml](refactor-v2-production-readiness.yml)
- [refactor-v2-quiz-definition-schema.yml](refactor-v2-quiz-definition-schema.yml)
- [refactor-v2-quiz-query-utilities.yml](refactor-v2-quiz-query-utilities.yml)
- [refactor-v2-quiz-question-presentation.yml](refactor-v2-quiz-question-presentation.yml)
- [refactor-v2-quiz-question-query-schemas.yml](refactor-v2-quiz-question-query-schemas.yml)
- [refactor-v2-quiz-skill-analytics.yml](refactor-v2-quiz-skill-analytics.yml)
- [refactor-v2-quiz-submission-schemas.yml](refactor-v2-quiz-submission-schemas.yml)
- [refactor-v2-remediate-express-body-parser.yml](refactor-v2-remediate-express-body-parser.yml)
- [refactor-v2-remediate-express-rate-limit.yml](refactor-v2-remediate-express-rate-limit.yml)
- [refactor-v2-remediate-google-genai.yml](refactor-v2-remediate-google-genai.yml)
- [refactor-v2-remediate-mongoose.yml](refactor-v2-remediate-mongoose.yml)
- [refactor-v2-remediate-postcss.yml](refactor-v2-remediate-postcss.yml)
- [refactor-v2-remediate-react-router.yml](refactor-v2-remediate-react-router.yml)
- [refactor-v2-remediate-root-babel-core.yml](refactor-v2-remediate-root-babel-core.yml)
- [refactor-v2-remediate-root-brace-expansion.yml](refactor-v2-remediate-root-brace-expansion.yml)
- [refactor-v2-remediate-root-fast-uri.yml](refactor-v2-remediate-root-fast-uri.yml)
- [refactor-v2-remediate-sentry-brace-expansion.yml](refactor-v2-remediate-sentry-brace-expansion.yml)
- [refactor-v2-remediate-socket-io.yml](refactor-v2-remediate-socket-io.yml)
- [refactor-v2-remediate-vite.yml](refactor-v2-remediate-vite.yml)
- [refactor-v2-repair-handover-blockers.yml](refactor-v2-repair-handover-blockers.yml)
- [refactor-v2-reports-scoped-skill-report-executor.yml](refactor-v2-reports-scoped-skill-report-executor.yml)
- [refactor-v2-results-score-presentation.yml](refactor-v2-results-score-presentation.yml)
- [refactor-v2-store-domain-helpers.yml](refactor-v2-store-domain-helpers.yml)
- [refactor-v2-workflow-trigger-hygiene.yml](refactor-v2-workflow-trigger-hygiene.yml)
