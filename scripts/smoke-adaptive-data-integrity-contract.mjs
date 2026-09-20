import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

const questionModel = read('server/src/models/Question.ts');
const questionSchemas = read('server/src/modules/quizzes/http/questionQuerySchemas.ts');
const topicModel = read('server/src/models/Topic.ts');
const contentSchemas = read('server/src/modules/content/http/learningContentSchemas.ts');
const store = read('store/useStore.ts');
const audit = read('server/src/scripts/auditFoundationSkillMapping.ts');
const env = read('server/src/config/env.ts');
const approved = JSON.parse(read('docs/architecture/APPROVED_CONTRACT_EXTENSIONS.json'));

const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({
      name,
      status: 'FAIL',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

check('question persistence preserves canonical taxonomy fields alongside legacy subject compatibility', () => {
  for (const fragment of [
    'skillId: { type: String, default: null }',
    'subSkillId: { type: String, default: null }',
    'subjectId: { type: String, default: null, index: true }',
    'pathId: 1, subjectId: 1, sectionId: 1, approvalStatus: 1',
  ]) {
    assert.ok(questionModel.includes(fragment), `Question model lost ${fragment}`);
  }
  for (const fragment of [
    'skillId: z.string().min(1).nullable().optional()',
    'subSkillId: z.string().min(1).nullable().optional()',
    'subjectId: z.string().min(1).nullable().optional()',
  ]) {
    assert.ok(questionSchemas.includes(fragment), `Question write schema lost ${fragment}`);
  }
});

check('foundation topic persistence supports explicit skill mapping without replacing legacy ids', () => {
  assert.ok(topicModel.includes('skillId: { type: String, default: null }'));
  assert.ok(topicModel.includes('{ pathId: 1, subjectId: 1, skillId: 1 }, { sparse: true }'));
  assert.ok(contentSchemas.includes('skillId: z.string().min(1).nullable().optional()'));
  assert.ok(store.includes("skillId: topic?.skillId ? String(topic.skillId) : undefined"));
});

check('foundation mapping audit is dry-run by default and refuses unsafe writes', () => {
  for (const fragment of [
    'env.ALMEAA_APPLY_FOUNDATION_SKILL_MAPPING',
    'mode: applyRequested ? "APPLY" : "DRY_RUN"',
    'if (!canApply)',
    'Foundation skill mapping write refused because integrity preconditions did not pass',
    'bulkWrite(operations, { ordered: false })',
  ]) {
    assert.ok(audit.includes(fragment), `mapping audit lost ${fragment}`);
  }
  assert.ok(env.includes('ALMEAA_APPLY_FOUNDATION_SKILL_MAPPING'));
  assert.ok(approved.envKeys.includes('ALMEAA_APPLY_FOUNDATION_SKILL_MAPPING'));
});

check('mapping identity is scope-aware and title fallback cannot cross sections or subjects', () => {
  for (const fragment of [
    'stringId(topic.pathId)',
    'stringId(topic.subjectId)',
    'stringId(topic.sectionId)',
    'normalizeTitle(topic.title)',
    'normalizeTitle(subSkill.name)',
  ]) {
    assert.ok(audit.includes(fragment), `scope-aware mapping lost ${fragment}`);
  }
});

check('question integrity uses subjectId with legacy subject fallback and the full skill inventory', () => {
  assert.ok(audit.includes('question.subjectId || question.subject'));
  assert.ok(audit.includes('for (const skill of allSkills)'));
  assert.ok(audit.includes('orphanQuestionSkillReferences'));
  assert.ok(audit.includes('scopeMismatchQuestionSkillReferences'));
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'adaptive-data-integrity',
  status: failed.length ? 'FAIL' : 'PASS',
  checks,
}, null, 2));

if (failed.length) process.exit(1);
