import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const weekly = read('pages/Reports/studentWeeklyPlanViewModel.ts');
const recommendation = read('pages/Reports/recommendationViewModel.ts');
const roleContract = read('scripts/smoke-reports-role-contract.mjs');
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

check('Reports delegates the three-day learner plan to a focused view-model', () => {
  assertIncludes(reports, "import { buildStudentWeeklyPlan } from './Reports/studentWeeklyPlanViewModel';");
  assertIncludes(reports, 'buildStudentWeeklyPlan(focusedReportSkills, {');
  assertIncludes(reports, 'allSkills: skills');
  assertIncludes(reports, 'subjects,');
  assertIncludes(reports, 'sections,');
  assertNotIncludes(reports, "const dayLabels = ['اليوم 1', 'اليوم 2', 'اليوم 3'];");
  assertNotIncludes(reports, "? 'راجع شرحًا قصيرًا ثم حل تدريبًا بسيطًا.'");
});

check('weekly plan preserves the exact learner cadence and fallback actions', () => {
  assertIncludes(weekly, "const dayLabels = ['اليوم 1', 'اليوم 2', 'اليوم 3'] as const;");
  assertIncludes(weekly, 'focusedReportSkills.slice(0, 3).map');
  assertIncludes(weekly, 'buildSkillRecommendation(skill, catalog)');
  assertIncludes(weekly, "? 'راجع شرحًا قصيرًا ثم حل تدريبًا بسيطًا.'");
  assertIncludes(weekly, ": 'حل تدريبًا قصيرًا للتأكد من ثبات المستوى.'");
  for (const field of [
    'skillId: skill.skillId',
    'skill: displayText(skill.skill)',
    'subjectName: displayText(skill.subjectName)',
    'sectionName: displayText(skill.sectionName)',
    'mastery: skill.mastery',
    'attempts: skill.attempts',
    'isReliable: skill.isReliable',
    'lessonTitle: recommendation.lessonTitle',
    'lessonLink: recommendation.lessonLink',
    'lessonTopicTitle: recommendation.lessonTopicTitle',
    'foundationTopicLink: recommendation.foundationTopicLink',
    'quizTitle: recommendation.quizTitle',
    'quizLink: recommendation.quizLink',
  ]) {
    assertIncludes(weekly, field);
  }
});

check('weekly plan reuses the established recommendation engine instead of cloning ranking logic', () => {
  assertIncludes(weekly, "from './recommendationViewModel';");
  assertIncludes(weekly, 'type SkillRecommendationCatalog');
  assertIncludes(recommendation, 'export const buildSkillRecommendation = (');
  assertNotIncludes(weekly, 'topicScores');
  assertNotIncludes(weekly, 'matchesEntityId');
  assertNotIncludes(weekly, 'learningPlacements');
});

check('weekly plan is deterministic and free of React, store, API, and browser side effects', () => {
  for (const forbidden of [
    "from 'react'",
    'useMemo',
    'useStore',
    "from '../../services/api'",
    'api.',
    'navigator.',
    'window.',
    'loadXlsx',
  ]) {
    assertNotIncludes(weekly, forbidden);
  }
});

check('role and global journey contracts follow weekly-plan ownership', () => {
  assertIncludes(roleContract, "../pages/Reports/studentWeeklyPlanViewModel.ts");
  assertIncludes(globalJourney, "../pages/Reports/studentWeeklyPlanViewModel.ts");
  assertIncludes(roleContract, "assertIncludes(reportsSource, 'buildStudentWeeklyPlan(focusedReportSkills, {');");
  assertNotIncludes(roleContract, "assertIncludes(reportsSource, 'const studentWeeklyPlan = useMemo');");
});

check('weekly-plan extraction stays small and does not create a replacement hotspot', () => {
  const reportLines = reports.split('\n').length;
  const weeklyLines = weekly.split('\n').length;
  if (reportLines >= 3350) throw new Error(`Reports.tsx exceeded the guarded size: ${reportLines}`);
  if (weeklyLines > 100) throw new Error(`studentWeeklyPlanViewModel.ts exceeded 100 lines: ${weeklyLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-student-weekly-plan-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  weeklyLines: weekly.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
