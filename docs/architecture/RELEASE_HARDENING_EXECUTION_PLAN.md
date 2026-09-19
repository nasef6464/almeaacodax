# ALMEAA — Release Hardening Execution Plan

> **Execution companion to:** `docs/architecture/ALMEAA_SYSTEM_MAP.md`
>
> This file is the ordered remediation program for the audited ALMEAA architecture. Any engineer, ChatGPT agent, or Codex session should sync from the repository, read the canonical system map, then read this plan before starting a remediation batch.

## Operating rule

Do not perform a giant repair commit. Use bounded batches:

`sync exact baseline → inspect domain + authority + structural debt → branch → repair → worthwhile modular extraction → focused tests → typecheck/build → integration/security tests → exact-head CI → PR/review → merge → update execution state/maps`

Do not merge a functional/security-sensitive batch to `main` while its required evidence is failing.

## Canonical references

1. `docs/architecture/ALMEAA_SYSTEM_MAP.md` — architecture, domains, source of truth, dependencies, findings, what not to touch.
2. `docs/architecture/CODEX_EXECUTION_STATE.md` — historical execution/evidence log. Future release-hardening batches must append/update explicit current state rather than relying on chat history.
3. `docs/architecture/CURRENT_DIRECTORY_AND_MODULE_MAP.md` — current filesystem/module ownership and hotspots; this is current state, not a target tree.
4. `docs/architecture/DEEP_MODULARITY_AND_RESOURCE_AUDIT.md` — repository-wide authority/modularity/data-access/bandwidth debt and batch ownership.
5. This file — ordered remediation plan.

## Local/Codex synchronization rule

Before Codex or any local agent begins work:

```bash
git status
git fetch origin
git checkout main
git pull --ff-only origin main
```

If the local worktree is not clean, **do not reset/delete local changes blindly**. Inspect/stash/commit intentional local work first.

Then create or switch to the dedicated batch branch from the freshly synchronized baseline. Never assume an old local branch contains the current architecture map or latest fixes.

## Batch program

### Batch 0 — Execution Control & Baseline
Goal: establish an exact, reproducible starting point and execution ledger.

Actions:
- confirm exact `main` SHA;
- read system map and existing execution state;
- record baseline CI/build state;
- re-run evidence for known P0 before modifying code;
- record current batch/status/branch/PR/test evidence in execution state.

Exit criteria:
- exact baseline identified;
- no unexplained local changes;
- known failures reproduced or explicitly disproved on exact head;
- execution ledger identifies the next action.

### Batch 1 — P0 TypeScript / Build Baseline
Goal: return repository baseline to clean typecheck/build state.

Primary known item:
- re-check the previously observed frontend TypeScript failure around `QuizzesManager.tsx:225`.

Required evidence:
- frontend typecheck;
- server TypeScript check;
- frontend production build;
- server build/check as defined by package scripts;
- focused regression test for any changed behavior.

Do not broaden this batch into architecture cleanup.

### Batch 2 — GitHub Governance & CI Gates
Goal: prevent known-bad changes from reaching `main`.

Actions:
- make release-critical typecheck/build/security/integration checks run for normal relevant PRs;
- remove inappropriate branch-name-only gating from required integration/E2E coverage;
- configure/propose protected `main` + required checks depending on available repository admin permissions;
- keep validation workflows read-only unless a workflow is explicitly intended to mutate code.

Exit: ordinary release PR cannot bypass required evidence.

### Batch 3 — Authentication & Security Lifecycle
Goal: close high-risk authentication lifecycle gaps without changing product UX unnecessarily.

Scope:
- token/session revocation/versioning;
- password reset invalidates existing sessions as designed;
- logout-all/security-event behavior;
- production bootstrap admin credential policy;
- `ensureAdminAccount` governance;
- audit sensitive `requireAuth`-only routes;
- differentiate rate-limit failure behavior for sensitive/auth endpoints.

Preserve CSRF, active-user refresh, lockout, OAuth state/email verification.

### Batch 4 — School Authority Consolidation
Goal: make school authorization consistently derive from canonical relations.

Canonical direction:
- `SchoolMembership` → school membership;
- `TeachingAssignment` → teacher class/subject authority;
- `SchoolContract` → enabled school modules.

Migrate readers/writers away from legacy `schoolId/groupIds/supervisorIds` where safe. Do not delete compatibility fields yet.

Negative tests must cover cross-school and inactive membership/assignment cases.

### Batch 5 — Smart Classroom Privacy & Indexes
Goal: preserve strong realtime design while closing privacy/production-index gaps.

Scope:
- decide/enforce strict projector default privacy;
- preserve separate student/staff socket rooms;
- preserve student question projection without solution leakage;
- formalize production Smart Classroom index migration as release evidence;
- verify live-session and response/participant invariants;
- re-run isolated classroom journeys.

Do not turn Smart Classroom into video/live streaming.

### Batch 6 — Assessment Concurrency & Migration Safety
Goal: harden formal assessment lifecycle without prematurely removing legacy authority.

Scope:
- make attempt creation concurrency-safe/idempotent;
- preserve `QuizResult` until verified assessment migration/cutover;
- verify attempt limits and submission integrity;
- document exact legacy/new assessment ownership.

### Batch 7 — Public Tests Authorization & Concurrency
Goal: make public/barcode test semantics explicit and safe.

Scope:
- decide whether `targeted` is true access control or only discovery targeting;
- if access control, enforce target user/group authorization on public fetch/submit;
- make attempt/max-submission enforcement concurrency-safe;
- add negative tests for unauthorized targets and simultaneous submissions.

### Batch 8 — Payments & AccessGrant
Goal: make entitlement/payment processing durable and unambiguous.

Scope:
- harden gateway event/transaction uniqueness where semantics allow;
- verify webhook idempotency under concurrency;
- formalize recovery/reconciliation across PaymentRequest → AccessGrant → legacy User mirrors;
- make AccessGrant the final entitlement authority;
- verify expiry/revocation behavior.

Do not remove legacy User purchase/enrollment mirrors until every reader is migrated and backfill/cutover evidence exists.

### Batch 9 — Parent & Notifications
Goal: remove legacy authority drift and prepare large-population delivery.

Scope:
- migrate parent/student authorization from `linkedStudentIds` toward explicit canonical relationship;
- migrate teacher/supervisor notification reachability to canonical school authority;
- optimize weekly parent-report N+1 behavior;
- add campaign batching/orchestration for large recipient populations where needed;
- preserve Redis realtime + BullMQ retry foundation.

### Batch 10 — Privacy & Data Lifecycle
Goal: define correct lifecycle for user-linked data instead of ad-hoc deletion.

Deliver a collection-level retention matrix covering at least:
- User;
- school relationships;
- results/assessments;
- classroom history;
- payments/grants;
- AI interactions;
- audit logs;
- client events;
- notification delivery;
- certificates/progress.

Implement safe delete/anonymize/retain behavior only after policy is explicit. No blanket cascade deletion.

### Batch 11 — Backup & Disaster Recovery
Goal: move from backup scripts to demonstrated recoverability.

Scope:
- full Mongo backup schedule;
- off-site destination;
- encryption/access controls;
- retention rotation;
- checksums/verification;
- restore drill;
- define RPO/RTO;
- distinguish application learning snapshot from full DR.

### Batch 12 — VPS / Deployment / Observability
Goal: make the real runtime reproducible and recoverable.

Scope:
- inspect actual VPS state before changing it;
- choose one canonical deployment path (PM2/Nginx or Compose-based design);
- TLS/Nginx/firewall/SSH hardening;
- correct liveness/readiness/scale-readiness use;
- atomic release and rollback;
- exact deployed SHA;
- production index migration gate;
- logs/rotation/monitoring/alerts;
- post-deploy smoke.

### Batch 13 — Performance & Staging Certification
Goal: replace assumptions with measured production-equivalent evidence.

Progressively test realistic concurrency, e.g. 30 → 100 → 250 → 500 → 1000 and increase only while healthy.

Measure:
- API P50/P95/P99;
- error rate;
- CPU/RAM/event loop;
- Mongo latency/pool/query plans;
- Redis/Socket.IO behavior;
- queue lag;
- network/runtime bottlenecks;
- compressed API payload bytes and request counts per journey;
- Cloudflare/media origin egress and cache-hit behavior where live metrics are available;
- bootstrap/cache duplication and static/media transfer.

Optimize only measured bottlenecks. Do not claim 10k/50k capacity without evidence.

### Batch 14 — Frontend UX / Architecture Cleanup
Goal: improve usability and maintainability after authority/security/runtime are stable.

Scope:
- school/admin information architecture;
- mobile/RTL/accessibility review;
- incremental decomposition of large route/dashboard components;
- preserve all backend integrity/permission/entitlement behavior;
- no React rewrite.

### Batch 15 — Final Production Certification
Goal: produce a final evidence-backed release decision.

Final gate reports PASS/FAIL for:
- Security;
- RBAC/tenant isolation;
- Data integrity;
- Smart Classroom;
- Assessments;
- Payments/entitlements;
- Parent/notifications;
- Privacy/data lifecycle;
- Backup/restore;
- VPS/runtime;
- Monitoring;
- Performance;
- CI/CD.

Outcome must be one of:
- NOT READY;
- CONTROLLED PILOT READY;
- PRODUCTION READY.

No readiness label without supporting evidence.

## Deep modularity/resource execution overlay

The repository-wide modularity/resource audit is canonical at:
`docs/architecture/DEEP_MODULARITY_AND_RESOURCE_AUDIT.md`.

From Batch 9 onward, modular decomposition is no longer deferred wholesale to Batch 14. Each domain batch must complete worthwhile decomposition while its behavior and authority are already under inspection, then protect the new boundary with tests and exact-head CI. Batch 14 is a residual architecture sweep only.

Origin-bandwidth/resource efficiency is also an explicit release concern. Heavy images/media should use the configured Cloudflare-backed asset delivery layer rather than repeated Node-origin streaming where the product/security contract permits it. Batch 13 must measure API payloads, repeated reads/polling/realtime traffic, media origin egress and cache behavior; live Cloudflare behavior requires live verification.

## Batch handoff template

Every completed or paused batch must leave this information in the repository execution state:

```text
Batch:
Status: NOT STARTED | IN PROGRESS | BLOCKED | READY FOR REVIEW | DONE
Baseline SHA:
Branch:
PR:
Commits:
Files changed:
Problem reproduced:
Implementation summary:
Tests run:
CI runs:
Live verification:
Known blockers:
Legacy compatibility retained:
Architecture/source-of-truth changes:
Next exact action:
```

If architecture/source-of-truth changes, update `ALMEAA_SYSTEM_MAP.md` in the same PR.

## Safety rules

- Never delete legacy authority before migration proof.
- Never bypass `schoolAdminIntegrity` to simplify UI work.
- Never expose learner correct answers through convenience serializers/projections.
- Never mix unrelated Auth/School/Payment migrations in one batch.
- Never use a failed production dependency as evidence of a code defect without tracing it.
- Never hide failing CI by merging around it.
- Never reset a Codex/local worktree blindly when synchronizing from GitHub.
- Never optimize scale from intuition when a load test can identify the actual bottleneck.
