import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

const rootRoutes = read('server/src/routes/quiz.routes.ts');
const questionRoutes = read('server/src/modules/quizzes/http/questionBankRoutes.ts');
const queryHelpers = read('server/src/modules/quizzes/infrastructure/quizDocumentQuery.ts');

const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
};

check('quiz root composes dedicated question bank router', () => {
  assert.ok(rootRoutes.includes('import { clearQuestionBankSummaryCache, questionBankRouter }'));
  assert.ok(rootRoutes.includes('quizRouter.use(questionBankRouter);'));
  assert.ok(!rootRoutes.includes('quizRouter.get(\n  "/questions",'));
  assert.ok(!rootRoutes.includes('quizRouter.post(\n  "/questions",'));
});

check('question bank public HTTP surface is preserved', () => {
  for (const fragment of [
    'questionBankRouter.get(\n  "/questions",',
    'questionBankRouter.post(\n  "/questions",',
    'questionBankRouter.get(\n  "/questions/:id",',
    'questionBankRouter.patch(\n  "/questions/:id",',
    'questionBankRouter.delete(\n  "/questions/:id",',
  ]) assert.ok(questionRoutes.includes(fragment), `missing question bank route ${fragment}`);
});

check('question bank mutations remain scoped and workflow-safe', () => {
  for (const fragment of [
    'requireRole(["admin", "teacher"])',
    'assertManagedContentScope(req.authUser!',
    'buildOwnedDocumentQuery(req.params.id, req.authUser!)',
    'sanitizeWorkflowUpdate(payload as Record<string, unknown>, req.authUser!)',
    'QuizModel.updateMany(',
  ]) assert.ok(questionRoutes.includes(fragment), `question route lost ${fragment}`);
});

check('question summary coverage and cache remain full-bank aware', () => {
  for (const fragment of [
    'const QUESTION_SUMMARY_CACHE_TTL_MS = 30 * 1000',
    'export const clearQuestionBankSummaryCache',
    'questionListQuerySchema.parse(req.query)',
    'getQuestionBankCoverage(filter)',
    'query.includeCoverage',
    'query.noTotal ? Promise.resolve(null) : QuestionModel.countDocuments(filter)',
    'X-Question-Summary-Cache',
  ]) assert.ok(questionRoutes.includes(fragment), `question route lost ${fragment}`);
});

check('root still invalidates question summary cache for quiz-side mutations', () => {
  const clearCalls = rootRoutes.match(/clearQuestionBankSummaryCache\(\)/g) || [];
  assert.ok(clearCalls.length >= 2, `expected mutation + integrity cache invalidation, found ${clearCalls.length}`);
});

check('shared document query helpers remain centralized', () => {
  for (const fragment of [
    'export const buildDocumentQuery',
    'export const buildOwnedDocumentQuery',
    'export const buildDocumentsByIdsQuery',
    'export const uniqueStrings',
  ]) assert.ok(queryHelpers.includes(fragment), `query helper lost ${fragment}`);
  assert.ok(!rootRoutes.includes('const buildOwnedDocumentQuery ='));
  assert.ok(!questionRoutes.includes('const buildOwnedDocumentQuery ='));
});

check('question bank router stays bounded and does not absorb quiz lifecycle domains', () => {
  const lineCount = questionRoutes.split(/\r?\n/).length;
  assert.ok(lineCount <= 400, `questionBankRoutes.ts exceeded 400 lines (${lineCount})`);
  for (const forbidden of [
    '"/results"',
    '"/skill-progress"',
    '"/question-attempts"',
    '"/:id/submit"',
    'DIRECT_RESULT_DISABLED_MESSAGE',
    'QuizResultModel',
    'SkillProgressModel',
    'QuestionAttemptModel',
  ]) assert.ok(!questionRoutes.includes(forbidden), `question bank router absorbed unrelated owner ${forbidden}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'question-bank-http-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  rootLines: rootRoutes.split(/\r?\n/).length,
  questionRouteLines: questionRoutes.split(/\r?\n/).length,
  checks,
}, null, 2));

if (failed.length) process.exit(1);
