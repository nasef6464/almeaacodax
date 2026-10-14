import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizSubmissionReadModelContext.ts'), 'utf8').replace(/\r\n/g, '\n');
const taxonomySource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizSubmissionTaxonomyRead.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('submission context remains pure while related label reads are delegated', () => {
  assert.ok(routeSource.includes('import { buildQuizSubmissionReadModelContext, getQuizSubmissionSkillIds } from "../modules/quizzes/application/quizSubmissionReadModelContext.js";'));
  assert.ok(routeSource.includes('const skillIds = getQuizSubmissionSkillIds(orderedQuestions);'));
  assert.ok(routeSource.includes('const { skillById, subjectNameById, sectionNameById } = buildQuizSubmissionReadModelContext({'));
  assert.ok(routeSource.includes('{ "subSkills.id": { $in: skillIds } }'));
  assert.ok(routeSource.includes('const skillDocumentQuery = buildDocumentsByIdsQuery(skillIds);'));
  assert.ok(routeSource.includes('readQuizSubmissionTaxonomy(skills, quiz)'));
  assert.ok(taxonomySource.includes('SubjectModel.find({ _id: { $in: subjectIds } })'));
  assert.ok(taxonomySource.includes('SectionModel.find({ _id: { $in: sectionIds } })'));
  assert.ok(taxonomySource.includes('skill.subjectId || quiz.subjectId'));
  assert.ok(taxonomySource.includes('skill.sectionId || quiz.sectionId'));
  assert.ok(!routeSource.includes('SubjectModel.find()') && !routeSource.includes('SectionModel.find()'));
});

check('skill identity and display-map semantics remain explicit', () => {
  for (const fragment of ['orderedQuestions.flatMap', 'question?.skillId', 'question?.subSkillId', 'question?.subSkillIds', 'question?.skillIds', 'subSkills', 'level: "sub"', 'parentSkillId', 'new Map<string, any>', 'skillById:', 'subjectNameById:', 'sectionNameById:']) {
    assert.ok(moduleSource.includes(fragment), `read-model context missing ${fragment}`);
  }
});

check('read-model context stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'SkillModel', 'SubjectModel', 'SectionModel', 'QuizModel', 'QuestionModel', 'QuizResultModel', 'requireRole', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `read-model context must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 100, 'quizSubmissionReadModelContext.ts exceeded 100 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-read-model-context-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
