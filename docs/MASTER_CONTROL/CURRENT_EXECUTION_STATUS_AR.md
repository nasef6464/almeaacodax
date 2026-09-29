# ALMEAA — Current Execution Status

آخر تحديث: 2026-09-27

## الحالة المختصرة

| Plan | الحالة | التالي |
|---|---|---|
| 0 — Master Control & Safe Delivery | CLOSED ✅ | ابدأ Plan 1 |
| 1 — Repository Reconciliation | CLOSED ✅ | voice gap + R2 tooling reconciled |
| 2 — Production Closure | IN PROGRESS ⚠️ | runtime/performance/network green; DR runtime staging fix in #281 |
| 3 — Speed/Bandwidth | WAITING | #268 |
| 4 — Data Model/Storage | WAITING FOR DR | بعد Plan 2 baseline |
| 5 — Residual Architecture | WAITING | auth/App/quiz/store residuals |
| 6 — Student Journey Certification | MOSTLY MERGED | regression after structural/data changes |
| 7 — AI Live Certification | PROVIDER PENDING | real quota/cost/failover proof |
| 8 — Question Bank Integrity | DOMAIN ACTIVE | #264 + FND26/COL2627 |
| 9 — Market Readiness | BLOCKED | requires 1–8 exit gates |

## PLAN 0 evidence

### GitHub
Ruleset: `Protect main`
- enforcement: active.
- target: default branch/main.
- pull request required.
- force push blocked.
- deletion blocked.
- bypass list empty.
- required checks:
  1. `Auth + RBAC + assessments + courses + commerce on isolated Mongo`
  2. `Full-stack roles + CRUD + school + quiz flows on isolated Mongo`
  3. `Cross-phase + handover regression`

### Vercel
- Preview Branch Tracking disabled for unassigned/non-main work branches.
- Production Branch remains `main`.
- verification commit: `ab30963e0fd9e45e94bed31bd24499e107e609ad`.
- deployment records for that verification window: **0**.

## PLAN 1 closure

- PR #260 gap: minimal teacher voice playback reapplied inside `ReviewSession`; STT/TTS/Smart Tutor/session isolation preserved.
- R2 V2 audit tooling: clean-reapplied as manual reachability evidence; it does not authorize image linking and #264 remains visual truth.
- Reconciliation evidence: `docs/MASTER_CONTROL/PLAN_1_RECONCILIATION_EVIDENCE_AR.md`.
- No stale branch was merged wholesale.

**NEXT:** PLAN 2 — Production Closure / Runtime / DR / Governance.

## PLAN 2 current state

- Managed Redis: **LIVE PASS** — rate-limit + queue + realtime + scheduler; `scale-ready=200`.
- Google OAuth start: **LIVE PASS** — Google redirect + canonical Render callback.
- Sentry: **LIVE PASS** — latest event `a32f9e20f795473ea79116cbbc5b8176`.
- R2: **LIVE PASS** — presign/PUT/public-GET/SHA-256 proof completed.
- DR: **IN PROGRESS — RUNTIME NETWORK FIX** — the five source values are configured. Run `36320284837` proved a GitHub-hosted runner cannot reach Atlas after allowlist hardening; PR #281 moves only `mongodump` to a Frankfurt Render staging job while GitHub keeps the independent Artifact + isolated Mongo/MinIO restore certification. No runtime success is claimed yet.
- Frankfurt Atlas recovery: **NOT A FULL RESTORE** — do not cut over.
- Performance: **CLOSED ✅** — authenticated c=10/25/50, 340 GETs, 0% errors; material latency reduction satisfies #236 alternate exit path. Frankfurt↔Singapore remains optimization debt, not a PLAN 2 blocker.
- GitHub governance: closed.
- Atlas network: **CLOSED ✅** — `0.0.0.0/0` removed; current Render Frankfurt outbound `74.220.51.0/24` + `74.220.59.0/24` passed a fresh-process Mongo reconnect.
- Evidence: `docs/MASTER_CONTROL/PLAN_2_PRODUCTION_CLOSURE_EVIDENCE_AR.md`.

**PLAN 2 is not CLOSED yet. PLAN 3 must wait.**

## Open operational/domain issues

- #234 runtime integrations — CLOSED ✅.
- #235 disaster recovery.
- #236 topology/capacity — CLOSED ✅.
- #237 governance/network — CLOSED ✅.
- #264 question visual integrity.
- #268 residual performance/runtime footprint.

## Baseline at PLAN 0 creation

`main@e60a8f563dd406098378df70857423455739ef7a`

Git HEAD always overrides this historical baseline.


---

## 2026-09-29 — ACTIVE OVERRIDE: Deep Role Journey V2

> هذا القسم أحدث من الجداول التاريخية أعلاه فيما يخص فحص رحلات الأدوار.

- Active issue: **#304 — ALM-E2E-ROLE-002**
- Active PR: **#305**
- Branch: `chatgpt/deep-role-journey-v2`
- Detailed source of truth: `docs/MASTER_CONTROL/DEEP_ROLE_JOURNEY_V2_STATUS_AR.md`
- Baseline main at start: `cc359e5fb77e4a1fbb77e86d6fd986bf555878de`
- Goal: full Student / Teacher / Supervisor / Parent deep journeys on desktop + mobile, followed by live-safe Production verification.

### Important discovery
The standalone `Platform V3 Live Role Gate` was hard-coded to PR #26, so recent PRs showed it as **SKIPPED**. It also still pointed at the obsolete Render API `almeaacodax-k2ux`.

PR #305 changes this so that:
1. same-repository PRs run the Live Role Gate;
2. `main` pushes run the gate automatically against Production;
3. the API target is the current `https://almeaacodax-codex.onrender.com/api`;
4. Parent + Teacher Deep Journey V2 is part of the live-safe gate.

### Closure rule
Do not mark #304 closed until:
- exact-head isolated Deep E2E is green;
- role-specific negative RBAC scopes are green;
- live-safe Production run is green on the deployed `main` SHA;
- evidence totals + exact SHA are written back to the dedicated status file and Issue #304.
