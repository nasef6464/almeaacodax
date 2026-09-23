# ALMEAA — Master Production Closure Checkpoint

**Date:** 2026-09-23  
**Active master task:** `ALM-PRD-001 — Final Product & Production Closure`  
**Current main baseline:** `919acb01771abc88c7b89fe816153e10b178c7bd`  
**Current release label:** **NOT YET PRODUCTION CERTIFIED**

> This file is the fastest canonical handoff for any engineer, ChatGPT session, Codex session, or reviewer returning to the project. Read this first, then follow the linked detailed evidence.

## 1. What is already closed

### ALM-STD-002 — Sidebar Width & Single-Line Labels
**CLOSED.**

The student sidebar width/single-line-label work has been merged and shipped. Do not reopen unless a reproduced regression appears.

### Adaptive / Mastery Phases 0–11
**CLOSED.**

Do not reopen without a reproduced regression.

### Release Hardening Batches 0–14
Implementation is broadly complete. Remaining live release evidence is consolidated under **ALM-PRD-001 / Batch 15** rather than reopening older batches as parallel programs.

## 2. Current production closure state

Current `main` includes PR #254:

`ALM-PRD-001: Surface integrations and make DR scheduling truthful (#254)`

That merge:
- surfaces Sentry / R2 / Redis / Google / Email / WhatsApp readiness in Operations Command Center;
- removes the fake successful backup-scheduling UI;
- disables schedule controls until a real scheduler exists;
- protects both behaviors with monitoring / DR contracts;
- passed exact-head Safety, Production Readiness, Recovery, Backend Integration, Phase + Handover, and Deep Pre-Merge E2E before merge.

## 3. Production runtime facts already proven

### Deployment / smoke
- Vercel and Render have been brought back onto the same current release after one transient Render deployment timeout.
- Release identity/readiness has been proven green after synchronization.
- Production Operational Smoke has been proven green.
- Current remaining Post Deploy blocker is **Sentry live proof** when `SENTRY_DSN` is absent.

### Render migration / integrations
Safe non-secret values already configured on the new Render service:
- `SENTRY_ENVIRONMENT=production`
- `SENTRY_TRACES_SAMPLE_RATE=0.05`
- `R2_PUBLIC_BASE_URL=https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev`
- `R2_UPLOAD_MAX_BYTES=4194304`
- `R2_PRESIGN_EXPIRES_SECONDS=300`

Created Render Key Value:
- name: `almeaacodax-redis`
- id: `red-dapchhbm8hqs739aikhg`
- region: Frankfurt
- plan: Free
- status: available
- persistence: off
- maxmemory policy: noeviction

Still missing / unproven on the migrated runtime:
- `SENTRY_DSN`
- `REDIS_URL` connection from the new Render Key Value
- R2 account / bucket / access credentials before enabling `R2_UPLOAD_ENABLED=true`
- Google OAuth client ID / client secret / redirect URI

Do not invent or copy stale credentials. Historical R2 work explicitly required credential rotation before production use.

## 4. Disaster recovery truth

### What exists
Verified repository tooling exists for:
- MongoDB backup with checksum;
- isolated MongoDB restore;
- R2 media backup with checksum;
- isolated R2 restore.

### What does NOT yet exist
- no real scheduled full MongoDB backup;
- no real scheduled R2 backup;
- no proven independent/off-site copy;
- no isolated full Mongo restore drill evidence;
- no isolated R2 restore drill evidence;
- no measured achieved RPO/RTO.

The old admin UI previously implied automatic backup scheduling existed. PR #254 corrected this: the UI now truthfully reports scheduling as unavailable until a real scheduler exists.

### Live database baseline
Database `almeaa`:
- 65 collections
- 6,474 total documents
- ~12.95 MB data
- ~14.50 MB storage
- 490 indexes
- ~15.95 MB index size

Critical live counts:
- users 110
- questions 3,337
- quizzes 219
- courses 19
- quizresults 6
- assessmentattempts 10
- schoolcontracts 4
- schoolmemberships 11
- paymentrequests 17
- accessgrants 13
- skills 170
- lessons 51
- topics 210

### Snapshot recency gap
Latest 2026-09-22 snapshot is only a narrow learner-reference safety snapshot:
- 12 documents
- 10 quizzes
- 2 topics

Latest broad learning snapshot is from 2026-05-25:
- 251 total documents
- 63 questions
- 33 quizzes
- 13 courses
- 19 topics
- 40 lessons

This is far behind the live September dataset and is **not acceptable as current full recovery evidence**.

## 5. Performance truth

Observed production slow examples:
- `/api/quizzes` ~3.7s
- `/api/quizzes/questions` ~1.3–1.9s
- `/api/courses` up to ~2.6s
- `/api/taxonomy/bootstrap` ~1.5–2.1s

Mongo executionStats on representative queries were much faster:
- courses ~1ms
- quizzes ~4ms
- questions ~10ms

Render sampling showed low CPU and modest memory, so the strongest current bottleneck evidence is infrastructure/network/application round trips rather than raw Mongo query execution.

Current topology:
- Render API: Frankfurt
- MongoDB Atlas Free: AWS `AP_SOUTHEAST_1` / Singapore

Current Atlas cluster:
- tier: FREE
- MongoDB: 8.0.32

A Free Atlas region move is not a zero-cost in-place action in the connected tooling; moving the database region requires an upgrade path or a controlled new-runtime migration. Do not trigger billing changes without explicit approval.

No 500/1000-user capacity claim is valid yet.

## 6. Governance truth

MongoDB Atlas access list currently includes:
- `74.220.48.0/24`
- `74.220.56.0/24`
- `0.0.0.0/0`
- one historical /32 entry

Do not remove `0.0.0.0/0` until current Render outbound CIDRs are confirmed from Render and connectivity rollback is prepared.

The connected GitHub App cannot read repository branch-protection state because the branch-protection endpoint returns 403 for this integration. Therefore protection status must not be guessed; verify from a repository-admin account.

## 7. Canonical tracked blockers

- **#234 — ALM-OPS-002:** restore runtime integrations after Render migration
- **#235 — ALM-DR-002:** real scheduled MongoDB + R2 DR
- **#236 — ALM-PERF-002:** co-locate API/Mongo and certify production-like scale
- **#237 — ALM-GOV-001:** repository/network governance

These issues are part of **ALM-PRD-001**, not separate competing roadmaps.

## 8. Exact next-action order

1. **Restore Render runtime integrations**
   - copy the Internal Redis URL from Render Key Value into `REDIS_URL`;
   - restore Sentry DSN;
   - create/rotate R2 production credentials and configure account/bucket/access values;
   - restore Google OAuth values;
   - enable R2 upload only after all required values are present.

2. **Re-run live proof**
   - Sentry test event;
   - Redis health / scale-ready checks;
   - R2 presign → upload → readable stable URL;
   - Google OAuth start/callback;
   - full Post Deploy Smoke.

3. **Close real DR evidence**
   - scheduled full Mongo backup;
   - scheduled R2 backup;
   - independent/off-site copy;
   - isolated restore drills;
   - measured RPO/RTO and failure alerting.

4. **Close performance evidence**
   - reduce cross-region latency by co-locating API and MongoDB or equivalent migration;
   - link Redis and prove coordination;
   - run current-release staged load tests;
   - record p50/p95/p99/error-rate;
   - only then assess 500/1000 concurrency.

5. **Close governance**
   - verify/protect `main` from repository admin;
   - confirm Render outbound CIDRs;
   - remove Atlas `0.0.0.0/0` only after safe allowlist verification;
   - rerun production smoke.

6. **Final Batch 15 certification**
   - produce final PASS/FAIL evidence table;
   - assign only one evidence-backed label:
     `NOT READY`, `CONTROLLED PILOT READY`, or `PRODUCTION READY`.

## 9. Do not do

- Do not reopen Adaptive 0–11 without regression.
- Do not claim Production Ready yet.
- Do not claim 500/1000-user capacity yet.
- Do not use stale R2 credentials.
- Do not treat application learning snapshots as full DR.
- Do not remove Atlas public access blindly.
- Do not create parallel implementation PRs for the same blocker.
- Do not overwrite production secrets with placeholders.

## Detailed references

- `docs/architecture/ALM_PRD_001_PRODUCTION_CLOSURE_2026-09-22_AR.md`
- `docs/architecture/RELEASE_HARDENING_CURRENT_STATE.md`
- `docs/architecture/RELEASE_HARDENING_EXECUTION_PLAN.md`
- `docs/architecture/DISASTER_RECOVERY_RUNBOOK.md`
- `docs/BACKUP_RESTORE_PRODUCTION.md`
