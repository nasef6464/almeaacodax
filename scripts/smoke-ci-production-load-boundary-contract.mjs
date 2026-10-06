import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [roleGate, publicGate, lightSmoke, offlineAudit] = await Promise.all([
  readFile(new URL("../.github/workflows/platform-v3-live-role-gate.yml", import.meta.url), "utf8"),
  readFile(new URL("../.github/workflows/platform-v3-public-ui-gate.yml", import.meta.url), "utf8"),
  readFile(new URL("./smoke-production-role-auth-light.mjs", import.meta.url), "utf8"),
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

console.log("CI production-load boundary contract: PASS");
