# ALMEAA delivery invariants

## Product boundary

ALMEAA is a reusable white-label, single-deployment modular source platform. One deployment serves one buyer/customer and may host multiple schools; a school is not a tenant. Do not introduce global `tenantId`, SaaS multi-tenancy, customer-specific core conditionals, or microservices without an explicit product decision. Use ProductConfig, branding, feature flags, policies, provider adapters, and school settings when justified.

The canonical learning flow is: Path → optional Level/Stage → Subject → Subject Learning Space → Courses, Foundation, Practice, Assessments, Library. Creation centers own definitions; Learning Space owns contextual placement and presentation.

Assessment boundaries remain distinct: Definition, Assignment, Targeting, Placement, Access, Session, Attempt, and Result. A result is one attempt outcome; a report is historical or aggregate analysis. Preserve the existing Question → Skill → Answer → Result → Skill Analysis → Weak Skill → Recommendation → Learning Content → Reassessment loop when it works.

## Safety and data

Do not implicitly change API contracts, RBAC/auth semantics, scoring, payments, historical compatibility, production data, or production cutover. No destructive migrations, cleanup, or historical reconstruction without an explicit owner decision. Prefer additive/backward-compatible evolution when a data change is authorized.

## Evidence and closeout

Use the current Git branch and current execution state as truth. Update `MODULE_CATALOG.md` only when module ownership changes, `CHANGE_MAP.md` only when the responsibility location changes, `DATA_ACCESS_MAP.md` only when data access ownership/query shape changes, and `MIGRATION_REGISTRY.md` only for a real data evolution.

The completion report format is:

```text
GOAL:
STATUS: CLOSED / PARTIAL / BLOCKED
DELIVERED:
VERIFIED:
DEFERRED:
KNOWN RISKS:
TESTS / CI:
COMMITS:
NEXT GOAL:
```
