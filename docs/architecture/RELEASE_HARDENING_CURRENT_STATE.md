# ALMEAA — Release Hardening Current State

> Read with `ALMEAA_SYSTEM_MAP.md`. This file records only the current remediation program; `CODEX_EXECUTION_STATE.md` remains intact as historical execution evidence.

## Current state — 2026-09-15

- Program: Release Hardening.
- Status: `IN PROGRESS`.
- Baseline: `main @ 706f64f2d0c51c4f07b7df53781987a118de7fb2`.
- Active branch: `chatgpt/batch-01-build-baseline`.
- Active PR: `#154`.
- Batch 0: `DONE` for repository baseline/evidence classification.
- Batch 1: `BUILD EVIDENCE PASSED / PR NOT MERGE-READY`.
- Batch 2: `STARTED BY EVIDENCE TRIAGE` because CI policy defects are now directly reproduced.
- Batches 3–15: `NOT STARTED` in this remediation program.

## Batch 0 evidence

The latest main Post Deploy Smoke served the expected `706f64f` frontend version. Frontend shell, entry asset, pricing shell, and route shells passed. API health, learning taxonomy, and frontend API proxy checks returned HTTP 503 from the Render-backed API path.

Classification: `INFRA BLOCKER` pending runtime investigation. Do not treat those 503s as proof of a frontend defect.

## Batch 1 — exact-head evidence

The previously reported TypeScript failure around `QuizzesManager.tsx:225` was reproduced on the release-hardening PR baseline. Commit `70e13888cc2b4240b555468d21d78676b1ef4c5e` adds a narrow `URLSearchParams.get('quizView')` declaration so the existing runtime validation and the TypeScript type agree.

Recovery Gate run `34994036949`, job `Core build + architecture`, proves all four build gates now pass on that exact commit:
- Frontend typecheck: PASS.
- API typecheck: PASS.
- Frontend production build: PASS.
- API production build: PASS.

Therefore the original P0 build/typecheck blocker is cleared on the branch. Do not merge yet: the full Recovery Gate remains red for separate reasons below.

## Reproduced CI / regression blockers

### 1. Immutable architecture gate — FAIL

In Recovery Gate run `34994036949`, architecture snapshot generation passed, then `Immutable architecture contract` failed. This is not a TypeScript/build failure. It must be diagnosed from the architecture contract/baseline before any baseline file is updated; never bless architecture drift just to make CI green.

### 2. Student learning journey — FAIL / CI design defect suspected

`Student + assessment regression` passes `Global student journey` then fails `Student learning journey`, causing all later assessment checks in that job to be skipped.

The script `scripts/smoke-student-learning-journey.mjs` defaults `SMOKE_API_URL` to the production Render API (`https://almeaacodax-k2ux.onrender.com/api`). The current production API path is independently returning HTTP 503. A normal PR gate therefore depends on an external production runtime and can fail even when the PR code is valid.

Batch 2 must separate repository-contract PR tests from live/post-deploy smoke tests. Do not weaken the student journey; move/parameterize the live dependency so PR CI remains deterministic and keep live verification as a post-deploy/staging gate.

### 3. Supervisor dashboard contract — FAIL

`Admin + schools + reports + payments` passes school management/import/command-center checks, then fails `Supervisor dashboard`, causing later reports/payment checks in that job to be skipped.

This needs a contract-vs-current-implementation comparison before editing either test or runtime. Do not automatically change the test to match current code.

### 4. Advanced workflow coverage — SKIPPED

On exact commit `70e13888...`, Phase + Handover passed, but Deep Pre-Merge E2E, Assessment Platform V1, Live Role, Backend Integration, and Public Smoke Roles Preview were skipped by their workflow conditions. This confirms the Batch 2 governance finding that important coverage is not uniformly applied to ordinary release PRs.

## Recovery Gate successes on exact head

The same run records PASS for these independent jobs before the remaining blockers are addressed:
- Content + product + admin recovery.
- Admin + data integrity regression.
- Homepage + admin UX regression.
- Auth + security regression.
- Production readiness contracts.
- Phase + Handover Gate.

These successes are evidence only for the exact branch commit; they are not production certification.

## Next exact action

Continue CI triage without merging PR #154:
1. diagnose the immutable architecture contract failure and determine whether it is pre-existing drift or introduced by the narrow type declaration;
2. make Student Learning Journey deterministic for PR CI while preserving a separate live/post-deploy journey;
3. compare Supervisor Dashboard contract expectations with current implementation and fix the side that is actually wrong;
4. rerun Recovery Gate;
5. only after required gates are green, close Batch 1 and complete Batch 2 governance changes.

## Handoff rule

Any agent/Codex session must update from GitHub first, read `ALMEAA_SYSTEM_MAP.md`, this file, and the ordered execution plan if merged. Never reset uncommitted local work blindly. Never mark a batch DONE without recorded evidence.