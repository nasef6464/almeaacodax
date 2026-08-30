import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/content.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/content/application/contentBootstrapVisibility.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('bootstrap visibility filters are delegated while active-path lookup stays in the route', () => {
  assert.ok(routeSource.includes('import { buildContentBootstrapVisibilityFilters } from "../modules/content/application/contentBootstrapVisibility.js";'));
  assert.ok(routeSource.includes('const activePathIds = canSeeAllContent ? [] : await getActivePathIds();'));
  assert.ok(routeSource.includes('buildContentBootstrapVisibilityFilters({ canSeeAllContent, activePathIds })'));
  assert.ok(!routeSource.includes('const scopeFilterToActivePaths ='));
});

check('learner visibility and active-path fallback semantics remain explicit', () => {
  for (const fragment of ['showOnPlatform: { $ne: false }', 'approvalStatus: "approved"', 'scopeFilterToActivePaths', '{ [pathField]: { $exists: false } }', '{ [pathField]: "" }', '{ [pathField]: null }']) {
    assert.ok(moduleSource.includes(fragment), `bootstrap visibility missing ${fragment}`);
  }
});

check('bootstrap visibility module stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'Model', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `bootstrap visibility must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 65, 'contentBootstrapVisibility.ts exceeded 65 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'content-bootstrap-visibility-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
