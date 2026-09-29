import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const readModel = read('server/src/modules/quizzes/application/quizSubmissionReadModelContext.ts');
const answerReview = read('server/src/modules/quizzes/application/quizSubmissionAnswerReview.ts');
const skillAnalysis = read('server/src/modules/quizzes/application/quizSubmissionSkillsAnalysis.ts');
const quizRoute = read('server/src/routes/quiz.routes.ts');
const results = read('pages/Results.tsx');
const quizPage = read('pages/QuizPage.tsx');
const selfQuiz = read('pages/Quiz.tsx');
const detailedModal = read('components/DetailedAnalysisModal.tsx');

const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('canonical question fields override legacy skillIds when available', () => {
  assert.ok(readModel.includes('question?.skillId'));
  assert.ok(readModel.includes('question?.subSkillId'));
  assert.ok(readModel.includes('canonical.length > 0'));
  assert.ok(answerReview.includes('getCanonicalQuestionSkillIds(question)'));
  assert.ok(!answerReview.includes('(question.skillIds || []).map(String)'));
});

check('nested subskills are loaded and flattened with parent context', () => {
  assert.ok(quizRoute.includes('{ "subSkills.id": { $in: skillIds } }'));
  assert.ok(readModel.includes('for (const subSkill of Array.isArray(skill?.subSkills) ? skill.subSkills : [])'));
  assert.ok(readModel.includes('level: "sub"'));
  assert.ok(readModel.includes('parentSkillId'));
  assert.ok(readModel.includes('parentSkill: String(skill.name || "")'));
});

check('result analysis persists only resolved taxonomy skills and hierarchy', () => {
  assert.ok(skillAnalysis.includes('if (!skill) return []'));
  assert.ok(skillAnalysis.includes('level: skill.level === "sub" ? "sub" : "main"'));
  assert.ok(skillAnalysis.includes('parentSkillId:'));
  assert.ok(skillAnalysis.includes('parentSkill:'));
  assert.ok(!skillAnalysis.includes('skill?.name || "مهارة غير مسماة"'));
});

check('explicit result attempt never silently falls back to another attempt', () => {
  const blockStart = results.indexOf('const listedResult = React.useMemo');
  const blockEnd = results.indexOf('const listedResultId', blockStart);
  assert.ok(blockStart >= 0 && blockEnd > blockStart);
  const block = results.slice(blockStart, blockEnd);
  assert.ok(block.includes('result.date'));
  assert.ok(!block.includes('||\n      examResults[0]'));
  assert.ok(!block.includes('String(result.quizId) === decodedAttempt'));
});

check('historical nested subskill names are recovered from taxonomy', () => {
  assert.ok(results.includes('resolveResultSkillTaxonomy'));
  assert.ok(results.includes('taxonomyEntry?.name'));
  assert.ok(results.includes("storedName === 'مهارة غير مسماة'"));
});

check('result review cannot invent questions outside exact quiz questionIds', () => {
  assert.ok(!results.includes('supplementMissingReviewQuestions'));
  assert.ok(results.includes('return rebuiltQuestions;'));
  assert.ok(!quizPage.includes('supplementMissingQuizQuestions'));
  assert.ok(quizPage.includes('const loadedQuestions = resolvedQuestions;'));
});

check('detailed skill modal has a truthful empty state and no fake defaults', () => {
  assert.ok(!detailedModal.includes('const defaultSkills'));
  assert.ok(detailedModal.includes('لا توجد مهارات موثقة لهذه المحاولة'));
  assert.ok(detailedModal.includes('(skills || []).map'));
});

check('self and prepared quiz clients use canonical main/subskill evidence', () => {
  assert.ok(quizPage.includes('getCanonicalQuestionSkillIds(question).forEach'));
  assert.ok(quizPage.includes('resolveQuizSkillTaxonomy'));
  assert.ok(selfQuiz.includes('getCanonicalQuestionSkillIds(question).forEach'));
  assert.ok(selfQuiz.includes('resolveQuizSkillTaxonomy'));
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'student-result-skill-integrity',
  status: failed.length ? 'FAIL' : 'PASS',
  total: checks.length,
  passed: checks.length - failed.length,
  failed,
  checks,
}, null, 2));
if (failed.length) process.exit(1);
