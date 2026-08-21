import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const builder = await fs.readFile(new URL('../dashboards/admin/UnifiedQuizBuilder.tsx', import.meta.url), 'utf8');
const selector = await fs.readFile(new URL('../dashboards/admin/SmartQuestionSelector.tsx', import.meta.url), 'utf8');
const canonicalSource = await fs.readFile(new URL('../utils/exams/assessmentQuestionSource.ts', import.meta.url), 'utf8');

assert.ok(
  builder.includes('title.trim().length > 0 && pathId.length > 0 && subjectId.length > 0'),
  'step 1 must require a subject before entering question selection',
);
assert.ok(builder.includes('المادة *'), 'subject field must be visibly required');
assert.ok(builder.includes('<option value="">اختر المادة</option>'), 'subject picker must not advertise an all-subject assessment');

assert.ok(selector.includes('assessmentQuestionSource'), 'selector must use the canonical assessment question source');
assert.ok(selector.includes('.loadAll({'), 'selector must load through the canonical compatibility paginator');
assert.ok(selector.includes('subjectId,'), 'selector must send the selected subject to the canonical source');
assert.ok(selector.includes('if (subjectId) return new Set([subjectId]);'), 'selector metadata must scope sections/skills to the selected subject');
assert.ok(selector.includes('scopedSubjectIds.has(section.subjectId)'), 'section options must stay inside the selected subject');
assert.ok(selector.includes('scopedSubjectIds.has(skill.subjectId)'), 'skill options must stay inside the selected subject');
assert.ok(!selector.includes('limit: 300'), 'selector must never send the legacy invalid limit=300 request');
assert.ok(!selector.includes('api.getQuestions('), 'selector must not bypass the canonical source with the legacy question API');

assert.ok(canonicalSource.includes('const MAX_PAGE_LIMIT = 100'), 'canonical source must respect the API max page size of 100');
assert.ok(canonicalSource.includes('async loadAll'), 'canonical source must traverse pages without the legacy fixed bank cap');
assert.ok(!canonicalSource.includes('MAX_PAGES'), 'canonical source must not silently cap the bank at a fixed page count');

console.log(JSON.stringify({
  phase: 'assessment-builder-subject-scope',
  status: 'PASS',
}, null, 2));
