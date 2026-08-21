import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const builder = await fs.readFile(new URL('../dashboards/admin/UnifiedQuizBuilder.tsx', import.meta.url), 'utf8');
const selector = await fs.readFile(new URL('../dashboards/admin/SmartQuestionSelector.tsx', import.meta.url), 'utf8');

assert.ok(
  builder.includes('title.trim().length > 0 && pathId.length > 0 && subjectId.length > 0'),
  'step 1 must require a subject before entering question selection',
);
assert.ok(builder.includes('المادة *'), 'subject field must be visibly required');
assert.ok(builder.includes('<option value="">اختر المادة</option>'), 'subject picker must not advertise an all-subject assessment');
assert.ok(selector.includes('if (subjectId) return new Set([subjectId]);'), 'selector metadata must scope sections/skills to the selected subject');
assert.ok(selector.includes('.searchPage({'), 'selector must use the canonical paginated source');
assert.ok(selector.includes('limit: SERVER_PAGE_SIZE'), 'selector must stay within the API page limit');
assert.ok(!selector.includes('limit: 300'), 'selector must never send the legacy invalid limit=300 request');

console.log(JSON.stringify({
  phase: 'assessment-builder-subject-scope',
  status: 'PASS',
}, null, 2));
