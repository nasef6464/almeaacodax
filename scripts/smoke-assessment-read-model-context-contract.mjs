import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizSubmissionReadModelContext.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('submission read-model context is delegated while queries stay in the route', () => {
  assert.ok(routeSource.includes('import { buildQuizSubmissionReadModelContext, getQuizSubmissionSkillIds } from "../modules/quizzes/application/quizSubmissionReadModelContext.js";'));
  assert.ok(routeSource.includes('const skillIds = getQuizSubmissionSkillIds(orderedQuestions);'));
  assert.ok(routeSource.includes('const { skillById, subjectNameById, sectionNameById } = buildQuizSubmissionReadModelContext({'));
  assert.ok(routeSource.includes('SkillModel.find(buildDocumentsByIdsQuery(skillIds))'));
  assert.ok(routeSource.includes('SubjectModel.find()'));
  assert.ok(routeSource.includes('SectionModel.find()'));
});

check('skill identity and display-map semantics remain explicit', () => {
  for (const fragment of ['orderedQuestions.flatMap', 'question.skillIds || []', 'new Map<string, any>', 'skillById:', 'subjectNameById:', 'sectionNameById:']) {
    assert.ok(moduleSource.includes(fragment), `read-model context missing ${fragment}`);
  }
});

check('read-model context stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'SkillModel', 'SubjectModel', 'SectionModel', 'QuizModel', 'QuestionModel', 'QuizResultModel', 'requireRole', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `read-model context must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 45, 'quizSubmissionReadModelContext.ts exceeded 45 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-read-model-context-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
