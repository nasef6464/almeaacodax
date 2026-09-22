# ALMEAA — Release Hardening Current State

## 2026-09-22 — Superseding production-closure checkpoint

> This checkpoint supersedes the older Batch 1/2 status below for **current execution state**. The historical entries are retained as evidence of how the hardening program progressed.

- Current production baseline: `main @ 71da69db7ef95ff8fe6312848c555ae7a3f01c94`.
- Adaptive/Mastery Phases 0–11: complete under their separate certification evidence; do not reopen without a reproduced regression.
- Release-hardening Batches 0–14: the implementation history has advanced far beyond the historical Batch 2 section below; current GitHub/main and live evidence are authoritative.
- Batch 15 — Final Production Certification: **IN PROGRESS / NOT CLOSED**.
- Active closure task: **ALM-PRD-001 — Final Product & Production Closure**.
- Active branch: `chatgpt/alm-prd-001-production-closure`.
- Detailed current evidence: `docs/architecture/ALM_PRD_001_PRODUCTION_CLOSURE_2026-09-22_AR.md`.

### Current verified facts

- Production Operational Smoke is now GREEN on `main@6f1fab225216368333c30e225bc9b250a01851aa`; the remaining Post Deploy failure is isolated to Sentry live proof because production has no `SENTRY_DSN`.
- Vercel Production and Render are aligned with the current main SHA.
- Full scheduled/off-site MongoDB + R2 backup and isolated restore-drill evidence remains open.

- GitHub `main`, Vercel production and Render production backend were verified on the same SHA `71da69db7ef95ff8fe6312848c555ae7a3f01c94`.
- Pull-request gates on the student-dashboard release were green, but the live Post Deploy Smoke still fails an operational learner-content reference check.
- Production read-only inspection found two visible topic-linked drills with zero resolvable question references and one 60-question mock exam with 12 missing references.
- ALM-PRD-001 hardens the learner catalog so stale/missing question IDs are not returned to learners and adds a read-only integrity audit. It does not silently mutate production data.
- `main` remains unprotected with required-check enforcement off.
- Full live Mongo/R2 restore evidence and measured RPO/RTO remain open.
- 500/1000-user production-equivalent performance remains unproven.

### Current release label

**NOT YET PRODUCTION CERTIFIED.**

Next exact action: complete exact-head CI for ALM-PRD-001, then deploy and re-run live operational evidence before repairing any production content references.

---

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
- 2026-09-18 deterministic-gate repair checkpoint:
  - validated implementation SHA: `336662887a85245ad7c86fedec46c4e8731f2beb`;
  - Recovery Gate run `35302909613`: **PASS**;
  - Refactor V2 Safety Gate run `35302909697`: **PASS**;
  - Backend Integration run `35302909635`: **PASS**;
  - Phase + Handover run `35302909656`: **PASS**;
  - frontend typecheck: PASS;
  - API typecheck: PASS;
  - frontend production build: PASS;
  - API production build: PASS;
  - immutable architecture contract: PASS without raising the hotspot budget;
  - supervisor dashboard contract: PASS;
  - admin/users/schools/parent/payment contract: PASS;
  - deployed-data student-learning and data-visibility smokes no longer gate pull-request source validation; they remain available outside PR events;
  - secured admin/trainer route additions and Smart Classroom E2E env knobs are recorded as approved contract extensions rather than rewriting the immutable baseline;
  - `server/src/scripts/backendIntegrationGate.ts` is classified as CI evidence, not shipped runtime, for the >400-line runtime hotspot budget.
- Deep Pre-Merge E2E run `35302909709` is still executing against isolated Mongo on this checkpoint; do not merge until its aggregate result is reviewed.
- Branch-protection blocker remains external: `main` has no required-check protection and the connected GitHub tool does not expose the repository-admin mutation.
- Checkpoint commit: this document update follows validated implementation SHA `336662887a85245ad7c86fedec46c4e8731f2beb`; use the commit containing this checkpoint as the next branch head.
- Next exact action: let the isolated Deep Pre-Merge E2E run finish and inspect its current artifact/logs. Repair only the still-reproducible deep-suite failures in small product-focused batches, beginning with the earliest common fixture/UI-loading cause; keep PR #162 unmerged until the deep aggregate is green. After CI evidence is green, record the external `main` branch-protection admin blocker and continue to Batch 3 without blocking unrelated work.
