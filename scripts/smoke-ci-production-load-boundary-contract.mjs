import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [
  roleGate,
  publicGate,
  plan7Gate,
  mcpGate,
  postDeploy,
  lightSmoke,
  aiLightSmoke,
  mcpBoundarySmoke,
  offlineAudit,
] = await Promise.all([
  readFile(new URL("../.github/workflows/platform-v3-live-role-gate.yml", import.meta.url), "utf8"),
  readFile(new URL("../.github/workflows/platform-v3-public-ui-gate.yml", import.meta.url), "utf8"),
  readFile(new URL("../.github/workflows/plan7-live-ai-certification.yml", import.meta.url), "utf8"),
  readFile(new URL("../.github/workflows/command-center-mcp-live-certification.yml", import.meta.url), "utf8"),
  readFile(new URL("../.github/workflows/post-deploy-smoke.yml", import.meta.url), "utf8"),
  readFile(new URL("./smoke-production-role-auth-light.mjs", import.meta.url), "utf8"),
  readFile(new URL("./smoke-ai-runtime-light.mjs", import.meta.url), "utf8"),
  readFile(new URL("./smoke-command-center-mcp-boundary.mjs", import.meta.url), "utf8"),
  readFile(new URL("./pr-public-ui-offline-audit.mjs", import.meta.url), "utf8"),
]);

assert.match(roleGate, /PR role and auth contracts — zero production traffic/);
assert.match(roleGate, /Production role auth smoke — paced and low-load/);
assert.doesNotMatch(roleGate, /smoke:role-pages-live/);
assert.doesNotMatch(roleGate, /live-parent-teacher-deep-audit/);

assert.match(publicGate, /Offline public and guarded UI audit — zero production API traffic/);
assert.match(publicGate, /pr-public-ui-offline-audit\.mjs/);
assert.doesNotMatch(publicGate, /live-public-ui-audit\.mjs/);
assert.doesNotMatch(publicGate, /almeaacodax-codex\.onrender\.com/);

assert.match(lightSmoke, /health\/live/);
assert.match(lightSmoke, /setTimeout\(resolve, 1200\)/);
assert.doesNotMatch(lightSmoke, /playwright|chromium/i);

assert.match(offlineAudit, /context\.route\("\*\*\/api\/\*\*"/);
assert.doesNotMatch(offlineAudit, /onrender\.com|vercel\.app\/api/);

assert.match(plan7Gate, /AI runtime status — no inference \/ no provider quota/);
assert.match(plan7Gate, /Live provider \+ tutor \+ token \+ fallback audit — manual only/);
assert.match(
  plan7Gate,
  /github\.event_name == 'workflow_dispatch' && inputs\.run_live_provider_certification == true/,
);
assert.doesNotMatch(aiLightSmoke, /\/ai\/providers\/test|\/ai\/chat/);
assert.match(aiLightSmoke, /providerCallPerformed:\s*false/);
assert.match(aiLightSmoke, /llmInferencePerformed:\s*false/);

assert.match(mcpGate, /Remote MCP fail-closed boundary — lightweight/);
assert.match(mcpGate, /Remote MCP metadata \+ discovery \+ tool scan — manual closure proof only/);
assert.match(
  mcpGate,
  /github\.event_name == 'workflow_dispatch' && inputs\.run_full_live_scan == true/,
);
assert.match(mcpBoundarySmoke, /metadataResponse\.status === 404/);
assert.match(mcpBoundarySmoke, /fullExternalProof:\s*false/);

assert.match(postDeploy, /Production role auth smoke — paced and low-load/);
assert.match(postDeploy, /Extended operational smoke — manual only/);
assert.match(postDeploy, /Google OAuth live start\/callback proof — manual only/);
assert.match(postDeploy, /Production bounded latency evidence — manual only/);
assert.match(postDeploy, /Sentry live proof smoke — manual only/);
assert.match(postDeploy, /Live counter integrity — manual only/);
assert.match(postDeploy, /R2 live presign\/write\/read proof — manual only/);
assert.match(postDeploy, /Bounded authenticated student read-load — manual only/);
assert.doesNotMatch(
  postDeploy,
  /if:\s*github\.event_name == 'push'.*?(smoke:operational|smoke:google-oauth-live-proof|measure:production-latency|smoke:sentry-live-proof)/s,
);

console.log("CI production-load boundary contract: PASS");
