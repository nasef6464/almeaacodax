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
- PR: `#162`.
- Gate-enablement commit tested: `21987a5b5ac4a19826c77c83189d385e021265d5`.
- Status: **IN PROGRESS — gate enablement proven; exposed regressions must be repaired before merge**.
- Confirmed governance gaps on current main:
  - the backend integration workflow is triggered for PRs to `main` but its job is skipped unless the PR head matches a hard-coded branch allowlist;
  - the deep pre-merge E2E workflow is triggered for PRs to `main` but its job is skipped unless the PR head matches a small hard-coded branch allowlist;
  - `main` currently reports `protected: false` with no required status checks through the repository branch API.
- Bounded implementation in this batch:
  - remove only the job-level branch-name allowlist from Backend Integration;
  - remove only the job-level branch-name allowlist from Deep Pre-Merge E2E;
  - retain the existing isolated Mongo, ephemeral-secret and no-production-write behavior of both workflows.
- CI evidence on ordinary PR #162:
  - Backend Integration: PASS (run `35257525809`).
  - Deep Pre-Merge E2E executed instead of skipping (run `35257525764`).
  - frontend typecheck: PASS.
  - API typecheck: PASS.
  - frontend production build: PASS.
  - API production build: PASS.
  - operational multi-role API: PASS.
  - bounded isolated read-scale validation: PASS.
  - public full-stack journeys: PASS.
  - school-from-scratch CRUD/relations/cleanup: PASS.
  - final deep-suite aggregate: FAIL because several `continue-on-error` audits returned failure outcomes even though their individual Actions step conclusions display success.
- Downloaded deep-E2E evidence identifies real product/audit failures rather than a false aggregate failure:
  - role pages: FAIL outcome;
  - question editor: FAIL outcome;
  - Student Learning Space: FAIL (18 route checks failed; missing next-action/report selectors plus client/network errors);
  - results/report actions: FAIL (student report actions missing; staff intervention/export controls missing);
  - Learning Space manager: FAIL outcome;
  - assessment commercial: FAIL because `assessment-builder-path` never contained the requested path option within 30s;
  - assessment mock session: FAIL outcome;
  - supervisor school: FAIL outcome;
  - barcode public test: FAIL on anonymous desktop/mobile pages with five required selectors missing;
  - school-from-scratch: PASS (12/12 plus cleanup).
- Recovery Gate on the same head also exposed two earlier contract failures:
  - `smoke:supervisor-dashboard` FAIL;
  - `smoke:student-learning-journey` FAIL.
- Important test-design finding: `scripts/smoke-student-learning-journey.mjs` defaults to the deployed Render API and hard-coded legacy path/subject IDs when no smoke environment is supplied. Recovery Gate invokes it without an isolated API fixture, so this PR check is production-data-dependent and is not a deterministic repository contract. Do not silence it; move/parameterize it as part of the next bounded repair.
- Repository-admin limitation: the connected GitHub integration does not expose a branch-protection mutation action. Required-check enforcement on `main` therefore still needs repository-owner/admin configuration after the workflow evidence is green.
- Checkpoint commit: this document update follows the tested head above; use the commit containing this checkpoint as the next branch head.
- Next exact action: repair deterministic CI first (supervisor dashboard contract drift and production-dependent student-learning contract), then rerun PR #162. After those contract gates are green, repair the isolated deep-E2E failures in small product-focused batches, beginning with assessment path loading and the shared missing learner/staff action surfaces. Do not merge #162 while release-critical gates remain red.
