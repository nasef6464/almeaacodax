import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const links=read('utils/skillActionLinks.ts');
const policy=read('services/adaptiveTreatmentPolicy.ts');
const quiz=read('pages/Quiz.tsx');
const model=read('server/src/models/QuestionAttempt.ts');
const schema=read('server/src/modules/quizzes/http/submissionSchemas.ts');
const loop=read('pages/Reports/studentLearningLoopViewModel.ts');

for (const evidenceType of ['assessment','remediation','recheck','mastery_review']) {
  assert.ok(model.includes(evidenceType), `model missing ${evidenceType}`);
  assert.ok(schema.includes(evidenceType), `schema missing ${evidenceType}`);
}
assert.ok(links.includes("evidenceType: 'remediation'"));
assert.ok(links.includes("evidenceType: 'recheck'"));
assert.ok(links.includes("evidenceType: 'mastery_review'"));
assert.ok(policy.includes("state: 'measure'"));
assert.ok(policy.includes("state: 'mastered'"));
assert.ok(policy.includes("state: 'weak'"));
assert.ok(loop.includes('buildSkillRemediationActionLink'));
assert.ok(loop.includes('buildSkillRecheckActionLink'));
const answerHandler=quiz.slice(quiz.indexOf('const handleAnswerSelect'),quiz.indexOf('const handleFinish'));
assert.ok(!answerHandler.includes('recordQuestionAttempt('), 'answer changes must not persist evidence');
assert.ok(quiz.includes('Evidence is committed once per question at finish'));
assert.ok(quiz.includes('evidenceType,'));
console.log(JSON.stringify({phase:'adaptive-phase4-treatment-recheck',status:'PASS'},null,2));
