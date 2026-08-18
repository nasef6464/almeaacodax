import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const skillCards = read('pages/Reports/scopedSkillReportViewModel.ts');
const recommendation = read('pages/Reports/recommendationViewModel.ts');
const reportsRole = read('scripts/smoke-reports-role-contract.mjs');
const globalJourney = read('scripts/smoke-global-student-journey-contract.mjs');

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
}

function assertIncludes(source, fragment, message) {
  if (!source.includes(fragment)) throw new Error(message || `Missing fragment: ${fragment}`);
}

function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) throw new Error(message || `Unexpected fragment: ${fragment}`);
}

check('Reports delegates scoped skill card projection while keeping workbook side effects local', () => {
  assertIncludes(reports, "from './Reports/scopedSkillReportViewModel';");
  assertIncludes(reports, 'buildScopedSkillReportCards(scopedAnalytics, {');
  assertIncludes(reports, 'const downloadScopedSkillsWorkbook = async () =>');
  assertIncludes(reports, 'const XLSX = await loadXlsx();');
  assertNotIncludes(reports, "label: 'دعم عاجل'");
  assertNotIncludes(reports, 'recommendation.lessonTopicTitle || recommendation.lessonTitle');
});

check('scoped skill view-model preserves card limits and severity threshold', () => {
  assertIncludes(skillCards, '(scopedAnalytics?.weakestSkills || []).slice(0, 4).map');
  assertIncludes(skillCards, 'skill.mastery < 50');
  assertIncludes(skillCards, "label: 'دعم عاجل'");
  assertIncludes(skillCards, "card: 'border-rose-100 bg-rose-50/70'");
  assertIncludes(skillCards, "text: 'text-rose-700'");
  assertIncludes(skillCards, "bar: 'bg-rose-500'");
  assertIncludes(skillCards, "label: 'دعم قريب'");
  assertIncludes(skillCards, "card: 'border-amber-100 bg-amber-50/70'");
  assertIncludes(skillCards, "text: 'text-amber-700'");
  assertIncludes(skillCards, "bar: 'bg-amber-500'");
});

check('scoped skill view-model reuses recommendation ownership without duplicating ranking logic', () => {
  assertIncludes(skillCards, 'buildSkillRecommendation(skill, catalog)');
  assertIncludes(skillCards, 'recommendation.lessonTopicTitle || recommendation.lessonTitle');
  assertIncludes(skillCards, 'quizLink: recommendation.quizLink');
  assertIncludes(skillCards, 'quizTitle: recommendation.quizTitle');
  assertNotIncludes(skillCards, 'topicHasLesson');
  assertNotIncludes(skillCards, 'linkedContentScore');
  assertIncludes(recommendation, 'export const buildSkillRecommendation = (');
});

check('scoped skill view-model remains deterministic and runtime-side-effect free', () => {
  assertNotIncludes(skillCards, 'useStore');
  assertNotIncludes(skillCards, "from 'react'");
  assertNotIncludes(skillCards, "from '../../services/api'");
  assertNotIncludes(skillCards, 'api.');
  assertNotIncludes(skillCards, 'navigator.');
  assertNotIncludes(skillCards, 'window.');
  assertNotIncludes(skillCards, 'loadXlsx');
});

check('Reports contracts follow scoped skill report ownership', () => {
  assertIncludes(reportsRole, "../pages/Reports/scopedSkillReportViewModel.ts");
  assertIncludes(globalJourney, "../pages/Reports/scopedSkillReportViewModel.ts");
  assertIncludes(reportsRole, "assertIncludes(reportsSource, 'buildScopedSkillReportCards(scopedAnalytics, {');");
});

check('scoped skill extraction reduces Reports without creating a replacement hotspot', () => {
  const reportLines = reports.split('\n').length;
  const skillCardLines = skillCards.split('\n').length;
  if (reportLines >= 3070) throw new Error(`Reports.tsx remained too large after scoped skill card extraction: ${reportLines}`);
  if (skillCardLines > 90) throw new Error(`scopedSkillReportViewModel.ts exceeded 90 lines: ${skillCardLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-scoped-skill-report-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  skillCardLines: skillCards.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
