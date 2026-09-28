import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [
  deepGate,
  safetyGate,
  recoveryGate,
  productionGate,
  phaseGate,
  health,
  privacy,
  privacySmoke,
  indexHtml,
  roleAudit,
  publicAudit,
  plan9Lab,
  plan7Evidence,
] = await Promise.all([
  read(".github/workflows/platform-v3-deep-premerge-e2e-gate.yml"),
  read(".github/workflows/refactor-v2-guard.yml"),
  read(".github/workflows/platform-v3-recovery-gate.yml"),
  read(".github/workflows/refactor-v2-production-readiness.yml"),
  read(".github/workflows/platform-v3-phase-handover-gate.yml"),
  read("server/src/routes/health.routes.ts"),
  read("server/src/modules/privacy/application/deleteUserLifecycle.ts"),
  read("scripts/smoke-privacy-lifecycle-contract.mjs"),
  read("index.html"),
  read("scripts/live-role-pages-audit.mjs"),
  read("scripts/live-public-ui-audit.mjs"),
  read("scripts/live-plan9-public-quality-audit.mjs"),
  read("docs/MASTER_CONTROL/PLAN7_AI_LIVE_CERTIFICATION_2026-09-28.md"),
]);

const assert = (ok, message) => { if (!ok) throw new Error(message); };

for (const marker of [
  "Frontend typecheck",
  "API typecheck",
  "Frontend production build against isolated API",
  "API production build",
  "Operational multi-role API journeys",
  "Public full-stack journeys on isolated API",
  "All role pages desktop + mobile on isolated stack",
  "Assessment normal and directed commercial journey",
  "Student Learning Space desktop + mobile journey",
  "Results and report actions desktop + mobile journey",
  "Supervisor school command UI journey",
  "School from scratch CRUD + relations + cleanup",
  "Bounded isolated read-scale validation",
]) assert(deepGate.includes(marker), `Deep E2E global suite lost: ${marker}`);

assert(safetyGate.includes("baseline-quality-gate"), "safety baseline gate missing");
assert(recoveryGate.includes("Core build + architecture") && recoveryGate.includes("Auth + security regression"), "recovery/security suites missing");
assert(productionGate.includes("readiness"), "production readiness suite missing");
assert(phaseGate.includes("PLAN 8 question bank integrity guard") && phaseGate.includes("PLAN 7 AI certification prerequisites"), "plan lineage guards missing");

for (const endpoint of ["/live", "/ready", "/scale-ready", "/scale-metrics"]) assert(health.includes(endpoint), `health/observability endpoint missing: ${endpoint}`);
assert(health.includes("failedCriticalChecks") && health.includes("warnings") && health.includes("resolveRuntimeCommit"), "health release/observability evidence missing");

for (const ownership of [
  "ParentStudentRelationshipModel.updateMany",
  "SchoolMembershipModel.updateMany",
  "TeachingAssignmentModel.updateMany",
  "AccessGrantModel.updateMany",
  "AiInteractionModel.updateMany",
  "ClientEventModel.updateMany",
  "NotificationDeliveryModel.updateMany",
  "UserModel.deleteOne",
]) assert(privacy.includes(ownership), `privacy lifecycle ownership missing: ${ownership}`);
assert(privacySmoke.includes("deleteUserLifecycle"), "privacy lifecycle regression guard missing");

assert(indexHtml.includes('lang="ar"') && indexHtml.includes('dir="rtl"'), "Arabic RTL document contract missing");
assert(roleAudit.includes('name: "mobile"') && roleAudit.includes("horizontalOverflow"), "role audit mobile overflow evidence missing");
assert(publicAudit.includes('name: "mobile"') && publicAudit.includes("network5xx"), "public mobile/server-error audit missing");
assert(plan9Lab.includes("largest-contentful-paint") && plan9Lab.includes("layout-shift") && plan9Lab.includes("first-contentful-paint"), "PLAN 9 CWV lab instrumentation missing");
assert(plan9Lab.includes("unlabeledButtons") && plan9Lab.includes("imagesMissingAlt") && plan9Lab.includes("direction"), "PLAN 9 accessibility/RTL probes missing");

assert(plan7Evidence.includes("BLOCKED — USER ACTION REQUIRED"), "PLAN 7 blocker must remain explicit");
assert(plan7Evidence.includes("paidAllowed=false") || plan7Evidence.includes("paidAllowed=false".replace("=", ": ")), "PLAN 7 paid-spend guard evidence missing");

console.log("PASS PLAN 9 independent global certification contract");
