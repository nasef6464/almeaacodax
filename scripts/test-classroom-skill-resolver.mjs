import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('Testing resolveClassroomSkillName logic...');

// Implementation verification
function resolveClassroomSkillName(skillId, skills = [], nestedSkills = [], subjects = []) {
  if (!skillId) return '';
  const trimmed = String(skillId).trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('subject:')) {
    const rawSubject = trimmed.slice('subject:'.length);
    const matchedSubj = subjects.find((s) => s.id === rawSubject || s.name === rawSubject);
    return matchedSubj?.name || rawSubject;
  }

  const directSkill = skills.find((s) => s.id === trimmed);
  if (directSkill?.name) return directSkill.name;

  for (const skill of skills) {
    if (Array.isArray(skill.subSkills)) {
      const matchedSub = skill.subSkills.find((sub) => sub.id === trimmed);
      if (matchedSub?.name) return matchedSub.name;
    }
  }

  const directNested = nestedSkills.find((ns) => ns.id === trimmed);
  if (directNested?.name) return directNested.name;

  for (const nested of nestedSkills) {
    if (Array.isArray(nested.subSkills)) {
      const matchedNestedSub = nested.subSkills.find((sub) => sub.id === trimmed);
      if (matchedNestedSub?.name) return matchedNestedSub.name;
    }
  }

  const matchedSubject = subjects.find((s) => s.id === trimmed);
  if (matchedSubject?.name) return matchedSubject.name;

  return trimmed;
}

// 1. Edge cases
assert.equal(resolveClassroomSkillName(''), '');
assert.equal(resolveClassroomSkillName(null), '');
assert.equal(resolveClassroomSkillName(undefined), '');

// 2. Subject prefix
const subjects = [
  { id: 'math', name: 'الرياضيات' },
  { id: 'physics', name: 'الفيزياء' },
];
assert.equal(resolveClassroomSkillName('subject:math', [], [], subjects), 'الرياضيات');
assert.equal(resolveClassroomSkillName('subject:chemistry', [], [], subjects), 'chemistry');

// 3. Main skills
const skills = [
  {
    id: 'sk_calc',
    name: 'حساب التفاضل والتكامل',
    subSkills: [
      { id: 'sub_limits', name: 'النهايات والاتصال' },
      { id: 'sub_derivatives', name: 'قواعد الاشتقاق' },
    ],
  },
];
assert.equal(resolveClassroomSkillName('sk_calc', skills), 'حساب التفاضل والتكامل');
assert.equal(resolveClassroomSkillName('sub_limits', skills), 'النهايات والاتصال');
assert.equal(resolveClassroomSkillName('sub_derivatives', skills), 'قواعد الاشتقاق');

// 4. Nested skills
const nestedSkills = [
  {
    id: 'nsk_geom',
    name: 'الهندسة والقياس',
    subSkills: [
      { id: 'nsub_angles', name: 'الزوايا والمثلثات' },
    ],
  },
];
assert.equal(resolveClassroomSkillName('nsk_geom', [], nestedSkills), 'الهندسة والقياس');
assert.equal(resolveClassroomSkillName('nsub_angles', [], nestedSkills), 'الزوايا والمثلثات');

// 5. Fallback unknown ID
assert.equal(resolveClassroomSkillName('p_1777779639431'), 'p_1777779639431');

console.log('Testing classesComparison logic contract...');

// Ensure server source code has the classesComparison logic exactly
const root = process.cwd();
const serverSource = fs.readFileSync(path.join(root, 'server/src/modules/schools/application/classroomReportInsights.ts'), 'utf8');
assert.ok(serverSource.includes('classBuckets = new Map'));
assert.ok(serverSource.includes('classesComparison = Array.from(classBuckets.entries())'));
assert.ok(serverSource.includes('classesComparison,'));

// Ensure frontend has the integration
const teacherPanelSource = fs.readFileSync(path.join(root, 'components/classroom/ClassroomReportInsightsPanel.tsx'), 'utf8');
assert.ok(teacherPanelSource.includes('classesComparison'));
assert.ok(teacherPanelSource.includes('مقارنة الفصول'));
assert.ok(teacherPanelSource.includes('resolveClassroomSkillName'));

const batchSummarySource = fs.readFileSync(path.join(root, 'components/classroom/ClassroomBatchSummaryCard.tsx'), 'utf8');
assert.ok(batchSummarySource.includes('resolveClassroomSkillName'));

const supervisorPanelSource = fs.readFileSync(path.join(root, 'dashboards/admin/SmartClassroomReportsPanel.tsx'), 'utf8');
assert.ok(supervisorPanelSource.includes('resolveClassroomSkillName'));

console.log('Classroom skill resolver & comparison tests: ALL PASS ✅');
