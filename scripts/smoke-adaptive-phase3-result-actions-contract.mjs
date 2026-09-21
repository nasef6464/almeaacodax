import assert from 'node:assert/strict';
import fs from 'node:fs';
const links=fs.readFileSync('utils/skillActionLinks.ts','utf8');
const results=fs.readFileSync('pages/Results.tsx','utf8');
for (const fragment of ['pathId','subjectId','skillId','encodeURIComponent(context.pathId)','safeInternalReturn']) {
  assert.ok(links.includes(fragment), `missing canonical link contract: ${fragment}`);
}
assert.ok(results.includes('buildFoundationActionLink(actionContext'));
assert.ok(results.includes('buildSkillReportActionLink({ pathId: weakestSkill?.pathId'));
console.log(JSON.stringify({phase:'adaptive-phase3-result-actions',status:'PASS'},null,2));
