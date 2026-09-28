# DB-6 — Final Database Scale Certification

Date: 2026-09-28
Plan: #300
PR: #301

## Certification layers

### 1. Isolated database row-scale
`db6ScaleCertificationGate.ts` grows the real `questionattempts` collection shape through:
- 1,000 rows;
- 10,000 rows;
- 100,000 rows.

At each checkpoint it measures:
- recent learner history by `userId + createdAt`;
- learner skill evidence by `userId + skillIds + createdAt`;
- scoped reporting evidence by `pathId + subjectId + sectionId + createdAt`.

Required at every checkpoint:
- winning query plan contains IXSCAN;
- <=55 documents examined for a 50-row page;
- <=60 keys examined for a 50-row page;
- isolated p95 query latency <500ms;
- p50/p95/p99 recorded;
- write batch p50/p95/p99 recorded.

This is deliberately a **100K-row data-scale certification**, not a claim that the free production infrastructure supports 100K concurrent users.

### 2. API read-scale
Existing Deep Pre-Merge E2E executes bounded isolated API read scale with 25 workers against health, compact taxonomy and scoped learning bootstrap, requiring <2% errors and p95 <2s.

### 3. Product journeys
The same exact-head Deep E2E covers role journeys, assessments, results/reports, school operations, Student Learning, Smart Classroom contracts and public surfaces. Backend Integration covers auth/RBAC/commerce plus DB-5 concurrency races.

## Database guardrail matrix
- DB-1: collection ownership/growth baseline.
- DB-2: reference validation, orphan audit, dry-run school membership migration.
- DB-3: production executionStats, measured indexes only, exact duplicate cleanup guard.
- DB-4: document/array growth budgets and retention-policy boundary.
- DB-5: race-safe transfer, pending purchase uniqueness, retry-safe grants/privacy/submissions.
- DB-6: 1K/10K/100K row scale + exact-head global regressions.

## Production claims
Production remains a Free Atlas/Render-class environment. This database certification proves schema/query/data-growth correctness and bounded behavior. It does not replace provider-sized concurrent-user load testing or DR #235.

## Final closure rule
The six-batch database plan closes only after:
1. exact PR head passes typecheck/build;
2. Backend Integration including DB-5/DB-6 executable gates is green;
3. Phase/Handover + Safety + Recovery + Production Readiness + Deep E2E are green;
4. PR is merged once as a controlled release;
5. production health identifies the merged SHA;
6. post-deploy read-only Atlas audit verifies no new duplicate/orphan regression and confirms the expected index state.
