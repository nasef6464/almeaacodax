import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

const [liveWorkflow, publicWorkflow, plan7Workflow, roleAudit, deepAudit, publicAudit] = await Promise.all([
  read(".github/workflows/platform-v3-live-role-gate.yml"),
  read(".github/workflows/platform-v3-public-ui-gate.yml"),
  read(".github/workflows/plan7-live-ai-certification.yml"),
  read("scripts/live-role-pages-audit.mjs"),
  read("scripts/live-parent-teacher-deep-audit.mjs"),
  read("scripts/live-public-ui-audit.mjs"),
]);

const exactHeadMutex = /platform-production-live-audit-\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/;
assert.match(liveWorkflow, exactHeadMutex);
assert.match(publicWorkflow, exactHeadMutex);
assert.match(liveWorkflow, /cancel-in-progress:\s*false/);
assert.match(publicWorkflow, /cancel-in-progress:\s*false/);

assert.match(plan7Workflow, /plan7-pr-/);
assert.match(plan7Workflow, /platform-production-live-audit-/);
assert.match(plan7Workflow, /github\.event_name == 'pull_request'/);

for (const source of [roleAudit, deepAudit]) {
  assert.match(source, /const responseCache = new Map\(\)/);
  assert.match(source, /notifications\/stream/);
  assert.match(source, /status:\s*204/);
  assert.match(source, /responseBody\.byteLength <= 5 \* 1024 \* 1024/);
  assert.match(source, /responseCache\.size < 128/);
}

assert.match(publicAudit, /const publicApiGetCache = new Map\(\)/);
assert.match(publicAudit, /notifications\/stream/);
assert.match(publicAudit, /status:\s*204/);
assert.match(publicAudit, /publicApiGetCache\.size < 128/);

console.log("Production live audit load-safety contract: PASS");
