import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const speed = read("scripts/smoke-production-speed.mjs");
const latency = read("scripts/measure-production-latency.mjs");
const drWorkflow = read(".github/workflows/production-dr-backup.yml");
const postDeploy = read(".github/workflows/post-deploy-smoke.yml");
const drContract = read("scripts/smoke-disaster-recovery-contract.mjs");
const plan2Evidence = read("docs/MASTER_CONTROL/PLAN_2_PRODUCTION_CLOSURE_EVIDENCE_AR.md");
const frontendSmoke = read("scripts/smoke-frontend-routes.mjs");
const r2LiveProof = read("scripts/smoke-r2-live-proof.mjs");
const googleLiveProof = read("scripts/smoke-google-oauth-live-proof.mjs");

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
assert.ok(postDeploy.includes("Production bounded latency evidence"));
assert.ok(postDeploy.includes("npm run measure:production-latency"));
assert.ok(postDeploy.includes("audit-artifacts/production-latency/summary.json"));
assert.ok(postDeploy.includes("actions/upload-artifact@v4"));

assert.ok(drWorkflow.includes("schedule:"));
assert.ok(drWorkflow.includes('cron: "17 1 * * *"'));
assert.ok(drWorkflow.includes("PRODUCTION_BACKUP_MONGODB_URI"));
assert.ok(drWorkflow.includes("DR_OFFSITE_ENDPOINT"));
assert.ok(drWorkflow.includes("DR_OFFSITE_BUCKET"));
assert.ok(drWorkflow.includes("Fail closed when DR secrets are incomplete"));
assert.ok(!drWorkflow.includes("upload-artifact"));

assert.ok(drContract.includes("production-dr-backup.yml"));

assert.ok(frontendSmoke.includes("response.status === 429"));
assert.ok(frontendSmoke.includes("retry-after"));
assert.ok(postDeploy.includes("smoke:google-oauth-live-proof"));
assert.ok(postDeploy.includes("smoke:r2-live-proof"));
assert.ok(googleLiveProof.includes("accounts.google.com"));
assert.ok(googleLiveProof.includes("almeaacodax-codex.onrender.com/api/auth/google/callback"));
assert.ok(r2LiveProof.includes("/media/question-images/presign"));
assert.ok(r2LiveProof.includes("sha256"));
assert.ok(!r2LiveProof.includes("console.log(intent.uploadUrl"));

for (const evidence of [
  "scaleReady=true",
  "dep-daru6pjncjis73f4f0m0",
  "36222909358",
  "PRODUCTION_BACKUP_MONGODB_URI",
  "PRODUCTION_R2_BACKUP_ACCESS_KEY_ID",
  "DR_OFFSITE_ENDPOINT",
  "DR_OFFSITE_SECRET_ACCESS_KEY",
  "66 collections",
  "10 collections",
  "0.0.0.0/0",
  "No production cutover",
]) {
  assert.ok(plan2Evidence.includes(evidence), `Plan 2 evidence must include ${evidence}`);
}

console.log(JSON.stringify({
  phase: "alm-prd-001-234-237-repository-closure",
  status: "PASS",
}, null, 2));
