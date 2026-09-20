import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

const courseRoutes = read('server/src/routes/course.routes.ts');
const quizRoutes = read('server/src/routes/quiz.routes.ts');
const courseModel = read('server/src/models/Course.ts');
const quizModel = read('server/src/models/Quiz.ts');
const coursesApi = read('services/apiGroups/coursesApi.ts');
const quizzesApi = read('services/apiGroups/quizzesApi.ts');
const taxonomyRoutes = read('server/src/routes/taxonomy.routes.ts');

const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
};

check('course bootstrap skips unused total count', () => {
  assert.ok(coursesApi.includes("const query = { limit: 200, noTotal: true"));
  for (const fragment of [
    'noTotal: z.coerce.boolean().default(false)',
    '.limit(query.noTotal ? pagination.limit + 1 : pagination.limit)',
    ': await CourseModel.countDocuments(filter)',
    'res.setHeader("X-Has-More", String(hasMore))',
  ]) assert.ok(courseRoutes.includes(fragment), `course route lost ${fragment}`);
});

check('quiz bootstrap skips unused total count', () => {
  assert.ok(quizzesApi.includes('withQuery("/quizzes", { limit: 200, noTotal: true'));
  for (const fragment of [
    'const noTotal = ["true", "1", "yes", "on"].includes',
    '.limit(noTotal ? pagination.limit + 1 : pagination.limit)',
    ': await QuizModel.countDocuments(filter)',
    'res.setHeader("X-Has-More", String(hasMore))',
  ]) assert.ok(quizRoutes.includes(fragment), `quiz route lost ${fragment}`);
});

check('catalog ordering is index-backed', () => {
  assert.ok(courseModel.includes('courseSchema.index({ createdAt: -1 });'));
  assert.ok(courseModel.includes('courseSchema.index({ isPublished: 1, showOnPlatform: 1, createdAt: -1 });'));
  assert.ok(quizModel.includes('quizSchema.index({ createdAt: -1 });'));
  assert.ok(quizModel.includes('quizSchema.index({ isPublished: 1, showOnPlatform: 1, createdAt: -1 });'));
});

check('staff taxonomy bootstrap has bounded invalidated cache', () => {
  for (const fragment of [
    'TAXONOMY_STAFF_BOOTSTRAP_CACHE_TTL_MS = 60 * 1000',
    'staffTaxonomyBootstrapCache = null',
    'staffTaxonomyBootstrapPromise = null',
    'getStaffTaxonomyBootstrapPayload',
    'X-Taxonomy-Cache',
  ]) assert.ok(taxonomyRoutes.includes(fragment), `taxonomy staff cache lost ${fragment}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'catalog-bootstrap-performance',
  status: failed.length ? 'FAIL' : 'PASS',
  checks,
}, null, 2));
if (failed.length) process.exit(1);
