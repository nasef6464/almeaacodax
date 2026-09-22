# ALM-PRD-001 — Final Product & Production Closure

**Date:** 2026-09-22  
**Status:** IN PROGRESS — NOT PRODUCTION CERTIFIED  
**Baseline:** `main@71da69db7ef95ff8fe6312848c555ae7a3f01c94`  
**Working branch:** `chatgpt/alm-prd-001-production-closure`

## Purpose

This work closes the remaining evidence gap between a green pull-request test suite and an evidence-backed production certification. It does not reopen Adaptive/Mastery Phases 0–11, which have their own completed certification evidence.

No `PRODUCTION READY` label is valid until the live blockers below are either closed or explicitly downgraded by evidence.

## Current deployment identity

At the start of ALM-PRD-001:

- GitHub `main`: `71da69db7ef95ff8fe6312848c555ae7a3f01c94`.
- Vercel production: READY on the same SHA.
- Render service `almeaacodax-codex`: LIVE on the same SHA.
- The latest Post Deploy Smoke passed its release-identity/readiness step for this exact SHA before later failing an operational content-integrity check.

This supersedes the old SHA-mismatch observation in the 2026-09-08 launch audit.

## Live operational blocker discovered

Latest inspected Post Deploy Smoke:

- Run: `35702822111`
- SHA: `71da69db7ef95ff8fe6312848c555ae7a3f01c94`
- Release identity/readiness: PASS
- Operational smoke: FAIL

The failure is not an authentication failure. The smoke authenticated and completed many role/payment/scope checks before reporting learner-content reference debt.

### Broken topic → quiz references

Two visible topics reference drills that currently resolve to zero question documents in production:

- `top_quant_sub_quant_01_1 → drill_sub_quant_01_1`
- `top_quant_sub_quant_01_2 → drill_sub_quant_01_2`

Read-only Atlas evidence:

- `drill_sub_quant_01_1`: 10 referenced question IDs, 0 resolved.
- `drill_sub_quant_01_2`: 10 referenced question IDs, 0 resolved.

### Partially stale mock-exam references

`exam_quant_mock_05` currently stores 60 question references. Read-only Atlas aggregation resolved 48 and found 12 missing references.

The learner catalog previously considered a quiz eligible when at least one referenced question was usable, but returned the raw quiz object with all stored question IDs. That could expose stale IDs to the learner runner even when enough valid questions existed to keep the quiz visible.

## Code-side hardening in this branch

### Learner-safe reference projection

`server/src/modules/quizzes/application/learnerQuizCatalog.ts` now:

- resolves learner-safe question aliases exactly as before;
- removes missing/unusable question IDs from the learner-facing `questionIds`;
- sanitizes mock-exam section `questionIds`;
- removes learner-facing mock sections that end with zero usable questions;
- excludes a quiz entirely when it has zero usable learner questions;
- preserves staff/source data and does not mutate MongoDB.

### Isolated integration proof

`server/src/scripts/learnerQuizCatalogPaginationGate.ts` now deliberately creates:

- valid quizzes carrying one valid and one stale question reference;
- a mock exam with valid and stale top-level references;
- a valid mock section with a stale reference;
- a section containing only a stale reference.

The gate asserts stale references are removed from the learner response and an empty sanitized section is omitted.

### Read-only production audit command

Added:

`npm --prefix server run audit:learner-references`

The command audits published learner quiz/question/topic links and exits non-zero when integrity debt exists. It is intentionally read-only.

A repository smoke contract rejects the audit implementation if write/delete/create operations are introduced into it.

## Production data safety decision

This branch does **not** silently rewrite production MongoDB data.

The two zero-usable drills require a separate evidence-backed content repair decision: either restore their intended question mappings from a trusted source or remove/hide the dead learner link. A destructive or guess-based repair is not acceptable.

## Remaining production-certification blockers

### CI / governance

- `main` is currently reported by GitHub as unprotected.
- Required status-check enforcement is off.
- The connected GitHub tooling available to this execution can inspect this state but does not expose a branch-protection mutation action.

### Post-deploy evidence

- Post Deploy Smoke is not green because of the learner-content reference issue described above.
- Sentry live-proof step is skipped after the operational smoke failure and therefore remains unproven for this release.

### Backup / disaster recovery

Repository tooling exists for verified MongoDB and R2 backup/restore, but full live recoverability remains unproven:

- live scheduled full-database backup evidence;
- independent/off-site copy evidence;
- encryption and least-privilege access review;
- isolated Mongo restore drill with measured duration;
- R2/media recovery drill preserving stable learner URLs;
- achieved RPO/RTO.

The current Atlas cluster is a FREE AWS cluster in `AP_SOUTHEAST_1`, MongoDB 8.0.32. Provider-native backup/PITR must not be assumed without separate control-plane evidence.

### Performance

CI proves only bounded isolated read-path validation. It does not certify 500/1000-user production capacity.

Live Render sampling showed low current CPU and modest memory, but the metrics query did not return sufficient request/latency series for a capacity claim.

### Vercel

ALM-STD-002 remains separately blocked by Vercel preview build rate limiting. This is not evidence of a code defect in ALM-STD-002.

## Current release decision

**NOT YET PRODUCTION CERTIFIED.**

The exact deployed SHA and core PR gates are strong, but Batch 15 remains open until post-deploy operational evidence, live DR proof, governance, and measured performance evidence are closed.

## Next exact actions

1. Make the learner-reference hardening exact-head CI green.
2. Re-run the production reference audit after deployment.
3. Repair the two zero-usable topic/drill links from a trusted source or explicitly remove their learner exposure.
4. Re-run Post Deploy Smoke until operational + Sentry proof are green.
5. Close live Mongo/R2 recovery evidence and measured RPO/RTO.
6. Establish required `main` protection/checks through repository administration.
7. Run production-like staged performance certification before any 500/1000-user capacity claim.
8. Produce the final Batch 15 evidence table and only then assign the release label.

## 2026-09-22 production closure update after PR #226

- `main`, Vercel Production and Render are aligned on `6f1fab225216368333c30e225bc9b250a01851aa`.
- Production Operational Smoke is now **GREEN** on that exact release.
- The previous learner question-reference false positives were fixed by resolving both logical question IDs and Mongo `_id` aliases in the production smoke.
- Sentry live proof remains **BLOCKED** with HTTP 412 because production has no `SENTRY_DSN` configured.
- Verified MongoDB/R2 backup and isolated-restore tooling exists, but repository tooling is not equivalent to a live scheduled backup, off-site copy, restore drill or measured RPO/RTO.
- The top-level production backup guide has been hardened to point only to the verified backup/restore path.
