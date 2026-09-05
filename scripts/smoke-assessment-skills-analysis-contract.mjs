import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizSubmissionSkillsAnalysis.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('submission skills analysis is delegated', () => {
  assert.ok(routeSource.includes('import { buildQuizSubmissionSkillsAnalysis } from "../modules/quizzes/application/quizSubmissionSkillsAnalysis.js";'));
  assert.ok(routeSource.includes('const skillsAnalysis = buildQuizSubmissionSkillsAnalysis({'));
  assert.ok(!routeSource.includes('const skillsAnalysis = Array.from(skillStats.entries()).map'));
});

check('skill analytics fields and policy remain explicit', () => {
  for (const fragment of ['buildResultSkillStatus', 'buildSkillRecommendation', 'skillId,', 'pathId:', 'subjectId,', 'sectionId,', 'mastery,', 'status,', 'recommendation:', 'section:']) {
    assert.ok(moduleSource.includes(fragment), `skills analysis missing ${fragment}`);
  }
});

check('skills analysis stays bounded and has no transport or persistence dependency', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'QuizModel', 'QuestionModel', 'QuizResultModel', 'requireRole', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `skills analysis must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 55, 'quizSubmissionSkillsAnalysis.ts exceeded 55 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-skills-analysis-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
