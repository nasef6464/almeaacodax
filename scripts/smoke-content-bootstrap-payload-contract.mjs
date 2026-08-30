import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/content.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/content/application/contentBootstrapPayload.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('bootstrap payload is delegated while route retains data reads', () => {
  assert.ok(routeSource.includes('import { buildContentBootstrapPayload } from "../modules/content/application/contentBootstrapPayload.js";'));
  assert.ok(routeSource.includes('return buildContentBootstrapPayload({'));
  assert.ok(routeSource.includes('TopicModel.find(finalTopicFilter)'));
  assert.ok(routeSource.includes('getScopedOperationalData(req.authUser)'));
});

check('bootstrap response keys remain explicit', () => {
  for (const fragment of ['topics,', 'lessons,', 'libraryItems,', 'groups:', 'b2bPackages:', 'accessCodes:', 'announcementAds:', 'studyPlans,']) {
    assert.ok(moduleSource.includes(fragment), `bootstrap payload missing ${fragment}`);
  }
});

check('bootstrap payload module stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'Model', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `bootstrap payload must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 45, 'contentBootstrapPayload.ts exceeded 45 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'content-bootstrap-payload-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
