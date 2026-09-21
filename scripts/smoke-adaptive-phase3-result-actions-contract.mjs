import assert from 'node:assert/strict';
import fs from 'node:fs';
const links=fs.readFileSync('utils/skillActionLinks.ts','utf8');
const results=fs.readFileSync('pages/Results.tsx','utf8');
const recommendations=fs.readFileSync('pages/Reports/recommendationViewModel.ts','utf8');
const learningSection=fs.readFileSync('components/LearningSection.tsx','utf8');
const foundationTarget=fs.readFileSync('utils/foundationSkillTarget.ts','utf8');
for (const fragment of ['pathId','subjectId','skillId','encodeURIComponent(context.pathId)','safeInternalReturn']) {
  assert.ok(links.includes(fragment), `missing canonical link contract: ${fragment}`);
}
assert.ok(results.includes('buildFoundationActionLink(actionContext'));
assert.ok(results.includes('buildSkillReportActionLink({ pathId: weakestSkill?.pathId'));
assert.ok(foundationTarget.includes("kind: 'sub'"));
assert.ok(foundationTarget.includes('item.subSkills?.find'));
assert.ok(foundationTarget.includes('topic.skillId'));
assert.ok(recommendations.includes("target.kind === 'sub'"));
assert.ok(recommendations.includes("buildFoundationActionLink(actionContext, 'quizzes')"));
assert.ok(recommendations.includes('Explanation deliberately opens the topic (not one lesson)'));
assert.ok(learningSection.includes("searchParams.get('skillId')"));
assert.ok(learningSection.includes('resolveFoundationSkillTarget'));
console.log(JSON.stringify({phase:'adaptive-phase3-result-actions',status:'PASS'},null,2));
