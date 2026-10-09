import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const links=read('utils/skillActionLinks.ts');
const policy=read('services/adaptiveTreatmentPolicy.ts');
const quiz=read('pages/Quiz.tsx');
const model=read('server/src/models/QuestionAttempt.ts');
const schema=read('server/src/modules/quizzes/http/submissionSchemas.ts');
const loop=read('pages/Reports/studentLearningLoopViewModel.ts');
const report=read('pages/Reports/studentAnalyticsViewModel.ts');
const questionSchema=read('server/src/modules/quizzes/http/questionQuerySchemas.ts');

for (const evidenceType of ['assessment','remediation','recheck','mastery_review']) {
  assert.ok(model.includes(evidenceType), `model missing ${evidenceType}`);
  assert.ok(schema.includes(evidenceType), `schema missing ${evidenceType}`);
}
// The three actions now delegate to one typed builder. Check the actual
// evidence-type wiring rather than obsolete per-link object-literal strings.
assert.ok(links.includes("evidenceType: 'remediation' | 'recheck' | 'mastery_review'"));
assert.ok(links.includes("    evidenceType,"));
assert.ok(links.includes("buildScopedSelfQuizActionLink(context, 'remediation', questionCount, 15)"));
assert.ok(links.includes("buildScopedSelfQuizActionLink(context, 'recheck', questionCount, 10)"));
assert.ok(links.includes("buildScopedSelfQuizActionLink(context, 'mastery_review', questionCount, 10)"));
assert.ok(policy.includes("state: 'measure'"));
assert.ok(policy.includes("state: 'mastered'"));
assert.ok(policy.includes("state: 'weak'"));
assert.ok(loop.includes('buildSkillRemediationActionLink'));
assert.ok(loop.includes('buildSkillRecheckActionLink'));
const answerHandler=quiz.slice(quiz.indexOf('const handleAnswerSelect'),quiz.indexOf('const handleFinish'));
assert.ok(!answerHandler.includes('recordQuestionAttempt('), 'answer changes must not persist evidence');
assert.ok(quiz.includes('Evidence is committed once per question at finish'));
assert.ok(quiz.includes('evidenceType,'));
assert.ok(quiz.includes("const isTargetedMeasurement ="));
assert.ok(quiz.includes("question.subjectId || question.subject || ''"));
assert.ok(quiz.includes("getCanonicalQuestionSkillIds(question).some"));
assert.ok(quiz.includes("run a shorter truthful measurement instead of contaminating the result"));
assert.ok(quiz.includes("startSelfQuiz({"));
assert.ok(quiz.includes("pathId: pathId || ''"));
assert.ok(quiz.includes("subjectId: subjectId || ''"));
assert.ok(report.includes("String(skill.pathId || '')"));
assert.ok(report.includes("String(skill.subjectId || '')"));
assert.ok(questionSchema.includes('Published or review-ready image questions require a written explanation'));
console.log(JSON.stringify({phase:'adaptive-phase4-treatment-recheck',status:'PASS'},null,2));
