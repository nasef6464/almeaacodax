# ALMEAA — Release Hardening Current State

## 2026-09-17 — Batch 1 complete; Batch 2 in progress

- Canonical references: `ALMEAA_SYSTEM_MAP.md` first, then `RELEASE_HARDENING_EXECUTION_PLAN.md`.
- Batch 1 baseline: `main @ ce04cad01efce8c13647b426218ff99ec842730a`.
- Batch 1 PR: `#161` (`chatgpt/batch01-typecheck-current`).
- Batch 1 merged commit: `9bd891da215e87ce8474bfa7909c2ede6c4ca2af`.
- Batch 1 status: **DONE**.
- Reproduced Batch 1 failures:
  - `components/MainLayout.tsx`: course-list options passed `kind` through an adapter signature that did not expose it.
  - `dashboards/admin/QuizzesManager.tsx`: repeated `URLSearchParams.get('quizView')` calls widened the initializer to `string`.
- Batch 1 implementation:
  - homepage hydration requests the existing course list and locally excludes package-backed courses before hydrating public learning courses;
  - `URLSearchParams.get('quizView')` is typed to the three supported view literals so existing manager routing remains unchanged.
- Batch 1 evidence on PR #161:
  - frontend typecheck: PASS;
  - API typecheck: PASS;
  - frontend production build: PASS;
  - API production build: PASS;
  - homepage/admin UX regression: PASS;
  - auth/security, content/product, data-integrity and production-readiness contract groups observed PASS; separate pre-existing supervisor and transient student-journey failures remain outside Batch 1 scope.
- No API/RBAC/schema/payment/assessment-authority change was made in Batch 1.

## Batch 2 — GitHub Governance & CI Gates

- Baseline: `main @ 9bd891da215e87ce8474bfa7909c2ede6c4ca2af`.
- Branch: `chatgpt/batch02-ci-governance-current`.
- Status: **IN PROGRESS**.
- Confirmed governance gaps on current main:
  - the backend integration workflow is triggered for PRs to `main` but its job is skipped unless the PR head matches a hard-coded branch allowlist;
  - the deep pre-merge E2E workflow is triggered for PRs to `main` but its job is skipped unless the PR head matches a small hard-coded branch allowlist;
  - `main` currently reports `protected: false` with no required status checks through the repository branch API.
- Bounded implementation in this batch:
  - remove only the job-level branch-name allowlist from Backend Integration;
  - remove only the job-level branch-name allowlist from Deep Pre-Merge E2E;
  - retain the existing isolated Mongo, ephemeral-secret and no-production-write behavior of both workflows.
- Repository-admin limitation: the connected GitHub integration does not expose a branch-protection mutation action. Required-check enforcement on `main` therefore still needs repository-owner/admin configuration after the workflow evidence is green.
- Next exact action: open the Batch 2 PR, prove Backend Integration and Deep Pre-Merge E2E actually execute on that ordinary PR, then record the exact passing/failing evidence before merge. Do not hide product failures exposed by the newly-unskipped gates.
