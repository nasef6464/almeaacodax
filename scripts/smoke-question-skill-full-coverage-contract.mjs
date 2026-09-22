import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

const questionBank = read('dashboards/admin/QuestionBankManager.tsx');
const questionBankCatalogData = read('dashboards/admin/questionBank/useQuestionBankCatalogData.ts');
const skillsTree = read('dashboards/admin/SkillsTreeManager.tsx');
const coverage = read('server/src/modules/quizzes/application/questionBankCoverage.ts');

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

check('question bank coverage is independent from the visible page', () => {
  assert.ok(questionBank.includes('useQuestionBankCatalogData({'));
  assert.ok(questionBankCatalogData.includes('const loadQuestionCoverage = async () =>'));
  assert.ok(questionBankCatalogData.includes('limit: 1,'));
  assert.ok(questionBankCatalogData.includes('summary: true,'));
  assert.ok(questionBankCatalogData.includes('noTotal: true,'));
  assert.equal((questionBankCatalogData.match(/includeCoverage: true/g) || []).length, 1);
});

check('question bank never presents current-page skill counts as full-bank coverage', () => {
  assert.ok(questionBank.includes('mainSkillCount: null'));
  assert.ok(questionBank.includes('subSkillCount: null'));
  assert.ok(questionBank.includes("questionCoverageSummary.mainSkillCount ?? '—'"));
  assert.ok(questionBank.includes("questionCoverageSummary.subSkillCount ?? '—'"));
  assert.ok(!questionBankCatalogData.includes('mainSkillCount:'));
  assert.ok(!questionBankCatalogData.includes('subSkillCount:'));
});

check('skills center counts only linked questions from full server coverage', () => {
  for (const fragment of [
    "skillLinkStatus: 'linked'",
    'summary: true',
    'noTotal: true',
    'setServerQuestionCount(response?.coverage?.total ?? null)',
    'setSubSkillCounts(response?.coverage?.skillQuestionCounts || {})',
    'setSectionQuestionCounts(response?.coverage?.sectionQuestionCounts || {})',
  ]) {
    assert.ok(skillsTree.includes(fragment), `SkillsTreeManager lost ${fragment}`);
  }
  assert.ok(!skillsTree.includes('serverQuestionCount ?? fallbackLocalQuestionsCount'));
  assert.ok(!skillsTree.includes('subSkillCounts[subSkill.id] ?? subSkillQuestions.length'));
  assert.ok(skillsTree.includes("subSkillCounts ? (subSkillCounts[subSkill.id] || 0) : '—'"));
  assert.ok(skillsTree.includes("sectionQuestionCounts ? (sectionQuestionCounts[mainSkill.id] || 0) : '—'"));
});

check('coverage exposes exact per-skill and per-section counts from the same full-bank aggregate', () => {
  for (const fragment of [
    '$facet',
    'skillCounts:',
    'sectionCounts:',
    'const skillQuestionCounts = toCountMap(result?.skillCounts)',
    'skillQuestionCounts,',
    'sectionQuestionCounts: toCountMap(result?.sectionCounts)',
  ]) {
    assert.ok(coverage.includes(fragment), `questionBankCoverage lost ${fragment}`);
  }
});

check('coverage aggregation excludes empty taxonomy ids', () => {
  for (const fragment of [
    '{ $ne: ["$$skillId", null] }',
    '{ $ne: ["$$skillId", ""] }',
    '{ $ne: ["$$sectionId", null] }',
    '{ $ne: ["$$sectionId", ""] }',
  ]) {
    assert.ok(coverage.includes(fragment), `questionBankCoverage lost ${fragment}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'question-skill-full-coverage',
  status: failed.length ? 'FAIL' : 'PASS',
  checks,
}, null, 2));

if (failed.length) process.exit(1);
