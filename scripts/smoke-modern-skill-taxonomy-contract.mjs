import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

const skillModel = read('server/src/models/Skill.ts');
const taxonomyRoutes = read('server/src/routes/taxonomy.routes.ts');
const types = read('types.ts');
const store = read('store/useStore.ts');

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

check('skill persistence preserves modern hierarchy fields without dropping legacy documents', () => {
  for (const fragment of [
    'const embeddedSubSkillSchema = new Schema(',
    'id: { type: String, required: true }',
    'order: { type: Number, default: 0 }',
    'subSkills: { type: [embeddedSubSkillSchema], default: [] }',
  ]) {
    assert.ok(skillModel.includes(fragment), `Skill model lost ${fragment}`);
  }
});

check('taxonomy write schema accepts modern hierarchy fields', () => {
  for (const fragment of [
    'const embeddedSubSkillSchema = z.object({',
    'order: z.number().int().nonnegative().optional()',
    'subSkills: z.array(embeddedSubSkillSchema).optional()',
  ]) {
    assert.ok(taxonomyRoutes.includes(fragment), `taxonomy write contract lost ${fragment}`);
  }
});

check('taxonomy bootstrap returns order and subskills for full and compact consumers', () => {
  assert.ok(
    taxonomyRoutes.includes('"id pathId subjectId sectionId name description order subSkills lessonIds questionIds createdAt"'),
    'full taxonomy bootstrap no longer projects modern hierarchy fields',
  );
  assert.ok(
    taxonomyRoutes.includes('"id pathId subjectId sectionId name description order subSkills createdAt"'),
    'compact taxonomy bootstrap no longer projects modern hierarchy fields',
  );
});

check('frontend types expose persisted hierarchy without requiring presentation-only nested skill fields', () => {
  assert.ok(types.includes('export interface SkillSubSkill {'));
  assert.ok(types.includes('subSkills?: SkillSubSkill[];'));
  assert.ok(types.includes('order?: number;'));
});

check('store normalizes nested skill identifiers at hydration boundary', () => {
  for (const fragment of [
    'subSkills: Array.isArray(skill?.subSkills)',
    "id: String(subSkill?.id || '')",
    "name: String(subSkill?.name || '')",
    '.filter((subSkill: any) => subSkill.id && subSkill.name)',
  ]) {
    assert.ok(store.includes(fragment), `taxonomy hydration lost ${fragment}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'modern-skill-taxonomy-contract',
  status: failed.length ? 'FAIL' : 'PASS',
  checks,
}, null, 2));

if (failed.length) process.exit(1);
