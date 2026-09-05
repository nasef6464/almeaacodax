import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizDefinitionDocument.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('quiz create document builder is delegated', () => {
  assert.ok(routeSource.includes('import { buildQuizCreateDocument } from "../modules/quizzes/application/quizDefinitionDocument.js";'));
  assert.ok(routeSource.includes('QuizModel.create(buildQuizCreateDocument({'));
  assert.ok(!routeSource.includes('QuizModel.create({\n      ...payload'));
});

check('create document contract preserves field precedence', () => {
  for (const fragment of [
    '...payload,',
    'questionIds: uniqueQuestionIds(payload.questionIds),',
    'id: quizId,',
    '_id: quizId,',
    '...workflowDefaults,',
    'approvalStatus: isPowerRole ? payload.approvalStatus || "approved" : workflowDefaults.approvalStatus',
    'isPublished: willBePublished,',
    'skillIds: resolvedSkillIds,',
  ]) assert.ok(moduleSource.includes(fragment), `definition document missing ${fragment}`);
});

check('route retains validation, integrity, and persistence ownership', () => {
  for (const fragment of ['quizSchema.parse(req.body)', 'validateQuizQuestionIntegrity(payload)', 'QuizModel.create(buildQuizCreateDocument({', 'res.status(StatusCodes.CREATED).json(created)']) {
    assert.ok(routeSource.includes(fragment), `route lost ${fragment}`);
  }
});

check('definition document builder stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'QuizModel', 'QuestionModel', 'requireRole', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `definition document must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 35, 'quizDefinitionDocument.ts exceeded 35 lines');
});

check('create document normalizes duplicate question references before persistence', () => {
  assert.ok(moduleSource.includes('const uniqueQuestionIds'), 'definition document must own canonical question ids');
  assert.ok(moduleSource.includes('new Set(values.filter'), 'definition document must remove duplicate question ids');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-definition-document-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
