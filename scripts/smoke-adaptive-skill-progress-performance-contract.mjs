import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

const model = read('server/src/models/SkillProgress.ts');
const routes = read('server/src/modules/quizzes/http/adaptiveTelemetryRoutes.ts');
const api = read('services/apiGroups/quizzesApi.ts');
const app = read('App.tsx');

const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({
      name,
      status: 'FAIL',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

check('skill progress list has an index that matches learner mastery ordering', () => {
  assert.ok(
    model.includes('skillProgressSchema.index({ userId: 1, mastery: 1, lastAttemptAt: -1 });'),
    'missing compound index for userId/mastery/lastAttemptAt',
  );
});

check('skill progress route supports count-free reads', () => {
  for (const fragment of [
    'const noTotal = ["true", "1", "yes", "on"].includes',
    '.limit(noTotal ? pagination.limit + 1 : pagination.limit)',
    '.lean()',
    'const hasMore = noTotal && rawItems.length > pagination.limit',
    ': await SkillProgressModel.countDocuments(filter)',
    'res.setHeader("X-Has-More", String(hasMore))',
  ]) {
    assert.ok(routes.includes(fragment), `skill-progress route lost ${fragment}`);
  }
});

check('client API exposes noTotal for skill progress reads', () => {
  assert.ok(api.includes('PaginationOptions & { noTotal?: boolean; pathId?: string; subjectId?: string }'));
  assert.ok(api.includes('withQuery("/quizzes/skill-progress", { limit: 200, ...pagination })'));
});

check('application bootstrap never requires a skill progress total count', () => {
  const optimizedCalls = app.match(/api\.getSkillProgress\(\{ noTotal: true \}\)/g) || [];
  assert.equal(optimizedCalls.length, 2, `expected 2 optimized bootstrap calls, found ${optimizedCalls.length}`);
  assert.ok(!app.includes('api.getSkillProgress()'), 'found an unoptimized skill progress bootstrap call');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'adaptive-skill-progress-performance',
  status: failed.length ? 'FAIL' : 'PASS',
  checks,
}, null, 2));

if (failed.length) process.exit(1);
