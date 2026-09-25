import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const speed = read("scripts/smoke-production-speed.mjs");
const latency = read("scripts/measure-production-latency.mjs");
const drWorkflow = read(".github/workflows/production-dr-backup.yml");
const drContract = read("scripts/smoke-disaster-recovery-contract.mjs");
const closureDoc = read("docs/architecture/ALM_PRD_001_234_237_EXECUTION_2026-09-25_AR.md");

assert.ok(
  speed.includes('${FRONTEND_URL}/api'),
  "production speed smoke must use the canonical same-origin API"
);
assert.ok(
  !speed.includes("almeaacodax-k2ux.onrender.com"),
  "retired Render hostname must not return to production speed smoke"
);

for (const evidence of [
  "p50DurationMs",
  "p95DurationMs",
  "p99DurationMs",
  "errorRate",
  "p50ResponseBytes",
]) {
  assert.ok(latency.includes(evidence), `production latency evidence must include ${evidence}`);
}
assert.ok(latency.includes("https://almeaacodax.vercel.app/api"));
assert.ok(latency.includes("does not certify 500/1000 concurrent-user capacity"));

assert.ok(drWorkflow.includes("schedule:"));
assert.ok(drWorkflow.includes('cron: "17 1 * * *"'));
assert.ok(drWorkflow.includes("PRODUCTION_BACKUP_MONGODB_URI"));
assert.ok(drWorkflow.includes("DR_OFFSITE_ENDPOINT"));
assert.ok(drWorkflow.includes("DR_OFFSITE_BUCKET"));
assert.ok(drWorkflow.includes("Fail closed when DR secrets are incomplete"));
assert.ok(!drWorkflow.includes("upload-artifact"));

assert.ok(drContract.includes("production-dr-backup.yml"));
assert.ok(closureDoc.includes("redis_not_configured_for_multi_instance_scale"));
assert.ok(closureDoc.includes("almeaa-eu-recovery"));
assert.ok(closureDoc.includes("protected=false"));
assert.ok(closureDoc.includes("0.0.0.0/0"));
assert.ok(closureDoc.includes("NOT PRODUCTION CERTIFIED"));

console.log(JSON.stringify({
  phase: "alm-prd-001-234-237-repository-closure",
  status: "PASS",
}, null, 2));
