import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

const rootRoutes = read('server/src/routes/quiz.routes.ts');
const telemetryRoutes = read('server/src/modules/quizzes/http/adaptiveTelemetryRoutes.ts');
const analyticsOverview = read('server/src/modules/quizzes/application/quizAnalyticsOverview.ts');

const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
};

check('quiz root composes dedicated adaptive telemetry router', () => {
  assert.ok(rootRoutes.includes('import { adaptiveTelemetryRouter }'));
  assert.ok(rootRoutes.includes('quizRouter.use(adaptiveTelemetryRouter);'));
  assert.ok(!rootRoutes.includes('quizRouter.get(\n  "/skill-progress",'));
  assert.ok(!rootRoutes.includes('quizRouter.get(\n  "/question-attempts",'));
  assert.ok(!rootRoutes.includes('quizRouter.post(\n  "/question-attempts",'));
});

check('adaptive telemetry HTTP surface remains stable and authenticated', () => {
  for (const fragment of [
    'adaptiveTelemetryRouter.get(\n  "/skill-progress",',
    'adaptiveTelemetryRouter.get(\n  "/question-attempts",',
    'adaptiveTelemetryRouter.post(\n  "/question-attempts",',
    'requireAuth',
  ]) assert.ok(telemetryRoutes.includes(fragment), `telemetry route lost ${fragment}`);
});

check('skill progress retains count-free optimized reads', () => {
  for (const fragment of [
    'const noTotal = ["true", "1", "yes", "on"].includes',
    '.limit(noTotal ? pagination.limit + 1 : pagination.limit)',
    '.lean()',
    ': await SkillProgressModel.countDocuments(filter)',
    'res.setHeader("X-Has-More", String(hasMore))',
  ]) assert.ok(telemetryRoutes.includes(fragment), `skill progress lost ${fragment}`);
});

check('question attempt write remains server-scored and updates adaptive progress', () => {
  for (const fragment of [
    'const payload = questionAttemptSchema.parse(req.body)',
    'QuestionModel.findOne(buildDocumentQuery(payload.questionId))',
    'const isCorrect =',
    'QuestionAttemptModel.create(buildQuestionAttemptDocument({',
    'await updateSkillProgressFromQuestionAttempt(created, req.authUser!.id)',
    'res.status(StatusCodes.CREATED).json(created)',
  ]) assert.ok(telemetryRoutes.includes(fragment), `attempt write lost ${fragment}`);
});

check('telemetry router stays learner-scoped and does not absorb quiz analytics or lifecycle', () => {
  const lineCount = telemetryRoutes.split(/\r?\n/).length;
  assert.ok(lineCount <= 140, `adaptiveTelemetryRoutes.ts exceeded 140 lines (${lineCount})`);
  for (const forbidden of [
    'QuestionAttemptModel.aggregate',
    'QuizResultModel',
    '"/results"',
    '"/analytics"',
    '"/:id/submit"',
    'QuizModel.create',
    'QuizModel.findOneAndUpdate',
  ]) assert.ok(!telemetryRoutes.includes(forbidden), `telemetry router absorbed unrelated owner ${forbidden}`);
});

check('analytics reads attempts while telemetry exclusively owns attempt writes', () => {
  assert.ok(analyticsOverview.includes('QuestionAttemptModel.find('));
  assert.ok(!analyticsOverview.includes('QuestionAttemptModel.create('));
  assert.ok(!rootRoutes.includes('QuestionAttemptModel.create('));
  assert.ok(!rootRoutes.includes('SkillProgressModel'));
  assert.ok(telemetryRoutes.includes('QuestionAttemptModel.create('));
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'adaptive-telemetry-http-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  rootLines: rootRoutes.split(/\r?\n/).length,
  telemetryLines: telemetryRoutes.split(/\r?\n/).length,
  checks,
}, null, 2));

if (failed.length) process.exit(1);
