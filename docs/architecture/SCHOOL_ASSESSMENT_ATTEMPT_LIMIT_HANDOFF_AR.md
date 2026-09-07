# School Directed Assessment Attempt Limit — Closure Handoff

- Date: 2026-09-07
- Branch: `codex/school-assessment-attempt-limit`
- PR: `#59`
- Base: `main` at `173fb787aa6283a553544a68b25239dff1e2e88f`
- Runtime/test commit: `c3b2baf4283997feadc612df8b9e708a69089819`
- Status: `VERIFIED` for this bounded post-Gate-6 defect repair.

## Proven gap

The Supervisor assignment surfaces exposed an attempt-limit choice, but the selected `maxAttempts` value was not persisted when assigning or reassigning a directed school assessment. A supervisor could therefore choose a limit that the learner runtime never received, creating an operations/product-integrity mismatch between assignment UI and actual submission enforcement.

## Smallest coherent fix

- Preserve the existing quiz `settings` object while persisting the Supervisor-selected `maxAttempts` value.
- Seed the assignment widget from the current assessment attempt limit instead of silently falling back to a disconnected default.
- Keep the current API URLs, RBAC, scoring semantics, schema, payment behavior, school scope and public-catalogue boundary unchanged.
- Extend the directed-assessment contract and isolated HTTP proof so the selected two-attempt limit permits the second submission and rejects the third.

## Verification on exact runtime commit

- Platform V3 Phase + Handover Gate `34095616025`: `SUCCESS`.
- Platform V3 Recovery Gate `34095615968`: `SUCCESS`.
- Refactor V2 Production Readiness Gate `34095616134`: `SUCCESS`.
- Refactor V2 Safety Gate `34095616049`: `SUCCESS`.
- Vercel preview deployment `dpl_2efcEQgzytuMVKK4M2bbPmj1h55P`: `READY` on exact runtime commit `c3b2baf4283997feadc612df8b9e708a69089819`.
- Backend/Assessment/Deep/Live Role/role-preview workflows were path/condition skipped; this bounded slice changes only Supervisor assignment UI/runtime wiring plus focused contracts and the isolated integration assertion.

## Boundaries preserved

No global `tenantId`, SaaS multi-tenancy, microservices, buyer-specific core fork, production-data migration/cutover, new public route, new role, payment change, schema migration, or scoring-rule rewrite was introduced. Product Gates 1–6 remain closed and are not reopened by this repair.

`MODULE_CATALOG.md`, `CHANGE_MAP.md`, and `DATA_ACCESS_MAP.md` remain unchanged because module ownership, route ownership, persistence ownership and data-access responsibility did not move.

## Next run

After PR `#59` is merged and the resulting `main` deployment is healthy, inspect current Git/CI evidence for exactly one new independent product/commercial/security/operations gap. Do not continue changing directed-assessment attempt handling unless a separate defect is proved.
