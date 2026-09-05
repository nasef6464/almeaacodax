import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/content.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/content/application/contentBootstrapRequest.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('bootstrap request policy is delegated while route retains parsing and cache IO', () => {
  assert.ok(routeSource.includes('import { resolveContentBootstrapRequest } from "../modules/content/application/contentBootstrapRequest.js";'));
  assert.ok(routeSource.includes('const requestedScope = contentBootstrapScopeSchema.parse(req.query.scope);'));
  assert.ok(routeSource.includes('} = resolveContentBootstrapRequest({'));
  assert.ok(routeSource.includes('contentBootstrapCache.get(cacheKey)'));
  assert.ok(routeSource.includes('contentBootstrapPromises.get(cacheKey)'));
  assert.ok(!routeSource.includes('const isNonStaffAuthedLearning ='));
});

check('scope, phase, inclusion, and shared-cache policy remain explicit', () => {
  for (const fragment of ['requestedScope !== "learning" && !canUseFullScope', 'scope === "learning" ? requestedPhase : "full"', 'scope === "operations"', 'includeStudyPlans', 'isAuthenticated && !canUseFullScope && scope === "learning"', '`scope:${scope}:phase:${phase}:shared-learning`']) {
    assert.ok(moduleSource.includes(fragment), `bootstrap request policy missing ${fragment}`);
  }
});

check('bootstrap request policy stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'Model', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `bootstrap request policy must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 50, 'contentBootstrapRequest.ts exceeded 50 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'content-bootstrap-request-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
