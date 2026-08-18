import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const write = (file, content) => writeFileSync(path.join(root, file), content, 'utf8');

function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Duplicate ${label}`);
  return `${source.slice(0, index)}${after}${source.slice(index + before.length)}`;
}

function replaceRange(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing ${label} start marker`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Missing ${label} end marker`);
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

const reportsPath = 'pages/Reports.tsx';
const roleContractPath = 'scripts/smoke-reports-role-contract.mjs';
const globalJourneyPath = 'scripts/smoke-global-student-journey-contract.mjs';

let reports = read(reportsPath);
let roleContract = read(roleContractPath);
let globalJourney = read(globalJourneyPath);
const appliedPhases = [];

const scopedSkillImport = "import { buildScopedSkillReportCards } from './Reports/scopedSkillReportViewModel';";
const scopedSkillDelegation = 'buildScopedSkillReportCards(scopedAnalytics, {';
const scopedRoleOwnership = "../pages/Reports/scopedSkillReportViewModel.ts";
const scopedGlobalOwnership = "../pages/Reports/scopedSkillReportViewModel.ts";

const scopedSkillAlreadyApplied =
  reports.includes(scopedSkillImport) &&
  reports.includes(scopedSkillDelegation) &&
  roleContract.includes(scopedRoleOwnership) &&
  globalJourney.includes(scopedGlobalOwnership);

if (!scopedSkillAlreadyApplied) {
  reports = replaceOnce(
    reports,
    "import { buildScopedStudentFocusCards } from './Reports/scopedStudentFocusViewModel';\n",
    "import { buildScopedStudentFocusCards } from './Reports/scopedStudentFocusViewModel';\nimport { buildScopedSkillReportCards } from './Reports/scopedSkillReportViewModel';\n",
    'student focus import anchor',
  );
  reports = replaceRange(
    reports,
    '    const scopedSkillReportCards = useMemo(() => {',
    '    const scopedStudentFocusCards = useMemo(',
    "    const scopedSkillReportCards = useMemo(\n        () => buildScopedSkillReportCards(scopedAnalytics, {\n            allSkills: skills,\n            lessons,\n            quizzes,\n            libraryItems,\n            questions,\n            topics,\n            subjects,\n            sections,\n        }),\n        [lessons, libraryItems, questions, quizzes, scopedAnalytics, sections, skills, subjects, topics],\n    );\n",
    'scoped skill report card derivation block',
  );
  roleContract = replaceOnce(
    roleContract,
    "  await readFile(new URL('../pages/Reports/scopedStudentFocusViewModel.ts', import.meta.url), 'utf8'),\n",
    "  await readFile(new URL('../pages/Reports/scopedStudentFocusViewModel.ts', import.meta.url), 'utf8'),\n  await readFile(new URL('../pages/Reports/scopedSkillReportViewModel.ts', import.meta.url), 'utf8'),\n",
    'reports role scoped skill ownership list',
  );
  roleContract = replaceOnce(
    roleContract,
    "check('staff scoped reports keep intervention plan, summary, and smart remediation', () => {\n",
    "check('staff scoped reports keep intervention plan, summary, and smart remediation', () => {\n  assertIncludes(reportsSource, 'buildScopedSkillReportCards(scopedAnalytics, {');\n",
    'reports role scoped skill assertion',
  );
  globalJourney = replaceOnce(
    globalJourney,
    "    await readFile(new URL('../pages/Reports/scopedStudentFocusViewModel.ts', import.meta.url), 'utf8'),\n",
    "    await readFile(new URL('../pages/Reports/scopedStudentFocusViewModel.ts', import.meta.url), 'utf8'),\n    await readFile(new URL('../pages/Reports/scopedSkillReportViewModel.ts', import.meta.url), 'utf8'),\n",
    'global journey scoped skill ownership list',
  );
  appliedPhases.push('scoped-skill-report');
}

const weeklyImport = "import { buildStudentWeeklyPlan } from './Reports/studentWeeklyPlanViewModel';";
const weeklyDelegation = 'buildStudentWeeklyPlan(focusedReportSkills, {';
const weeklyRoleOwnership = "../pages/Reports/studentWeeklyPlanViewModel.ts";
const weeklyGlobalOwnership = "../pages/Reports/studentWeeklyPlanViewModel.ts";

const weeklyAlreadyApplied =
  reports.includes(weeklyImport) &&
  reports.includes(weeklyDelegation) &&
  roleContract.includes(weeklyRoleOwnership) &&
  globalJourney.includes(weeklyGlobalOwnership) &&
  !roleContract.includes("assertIncludes(reportsSource, 'const studentWeeklyPlan = useMemo');");

if (!weeklyAlreadyApplied) {
  if (!reports.includes(weeklyImport)) {
    reports = replaceOnce(
      reports,
      "} from './Reports/studentAnalyticsViewModel';\n",
      "} from './Reports/studentAnalyticsViewModel';\nimport { buildStudentWeeklyPlan } from './Reports/studentWeeklyPlanViewModel';\n",
      'student analytics import anchor',
    );
  }

  if (!reports.includes(weeklyDelegation)) {
    reports = replaceRange(
      reports,
      '    const studentWeeklyPlan = useMemo(() => {',
      '    const studentTodayFocus = studentWeeklyPlan[0] || null;',
      "    const studentWeeklyPlan = useMemo(\n        () => buildStudentWeeklyPlan(focusedReportSkills, {\n            allSkills: skills,\n            lessons,\n            quizzes,\n            libraryItems,\n            questions,\n            topics,\n            subjects,\n            sections,\n        }),\n        [focusedReportSkills, lessons, libraryItems, questions, quizzes, sections, skills, subjects, topics],\n    );\n",
      'student weekly plan derivation block',
    );
  }

  if (!roleContract.includes(weeklyRoleOwnership)) {
    roleContract = replaceOnce(
      roleContract,
      "  await readFile(new URL('../pages/Reports/studentAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n",
      "  await readFile(new URL('../pages/Reports/studentAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n  await readFile(new URL('../pages/Reports/studentWeeklyPlanViewModel.ts', import.meta.url), 'utf8'),\n",
      'reports role weekly plan ownership list',
    );
  }
  if (roleContract.includes("assertIncludes(reportsSource, 'const studentWeeklyPlan = useMemo');")) {
    roleContract = replaceOnce(
      roleContract,
      "  assertIncludes(reportsSource, 'const studentWeeklyPlan = useMemo');\n",
      "  assertIncludes(reportsSource, 'buildStudentWeeklyPlan(focusedReportSkills, {');\n",
      'reports role weekly plan delegation assertion',
    );
  }

  if (!globalJourney.includes(weeklyGlobalOwnership)) {
    globalJourney = replaceOnce(
      globalJourney,
      "    await readFile(new URL('../pages/Reports/studentAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n",
      "    await readFile(new URL('../pages/Reports/studentAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n    await readFile(new URL('../pages/Reports/studentWeeklyPlanViewModel.ts', import.meta.url), 'utf8'),\n",
      'global journey weekly plan ownership list',
    );
  }
  appliedPhases.push('student-weekly-plan');
}

const studentActionsImport = "import { buildStudentAdaptiveLearningBridge, buildStudentFollowUpSummary, buildStudentReportNextAction } from './Reports/studentReportActionsViewModel';";
const studentActionsDelegation = 'buildStudentAdaptiveLearningBridge(studentTodayFocus)';
const studentActionsRoleOwnership = "../pages/Reports/studentReportActionsViewModel.ts";
const studentActionsGlobalOwnership = "../pages/Reports/studentReportActionsViewModel.ts";

const studentActionsAlreadyApplied =
  reports.includes(studentActionsImport) &&
  reports.includes(studentActionsDelegation) &&
  reports.includes('buildStudentReportNextAction(isStudentView, studentTodayFocus)') &&
  reports.includes('buildStudentFollowUpSummary({') &&
  roleContract.includes(studentActionsRoleOwnership) &&
  globalJourney.includes(studentActionsGlobalOwnership) &&
  !roleContract.includes("assertIncludes(reportsSource, 'const studentAdaptiveLearningBridge = useMemo');");

if (!studentActionsAlreadyApplied) {
  if (!reports.includes(studentActionsImport)) {
    reports = replaceOnce(
      reports,
      "import { buildStudentWeeklyPlan } from './Reports/studentWeeklyPlanViewModel';\n",
      "import { buildStudentWeeklyPlan } from './Reports/studentWeeklyPlanViewModel';\nimport { buildStudentAdaptiveLearningBridge, buildStudentFollowUpSummary, buildStudentReportNextAction } from './Reports/studentReportActionsViewModel';\n",
      'student weekly plan import anchor',
    );
  }

  if (!reports.includes(studentActionsDelegation)) {
    reports = replaceRange(
      reports,
      '    const studentAdaptiveLearningBridge = useMemo(() => {',
      '    const copyStudentSummary = async () => {',
      "    const studentAdaptiveLearningBridge = useMemo(\n        () => buildStudentAdaptiveLearningBridge(studentTodayFocus),\n        [studentTodayFocus],\n    );\n    const studentReportNextAction = useMemo(\n        () => buildStudentReportNextAction(isStudentView, studentTodayFocus),\n        [isStudentView, studentTodayFocus],\n    );\n    const studentFollowUpSummary = useMemo(\n        () => buildStudentFollowUpSummary({\n            isStudentView,\n            hasStudentAnalytics,\n            focusedReportSkills,\n            averageScore: stats?.averageScore || 0,\n            studentPeriodLabel,\n            studentTrackLabel,\n        }),\n        [focusedReportSkills, hasStudentAnalytics, isStudentView, stats?.averageScore, studentPeriodLabel, studentTrackLabel],\n    );\n",
      'student report action derivation block',
    );
  }

  if (!roleContract.includes(studentActionsRoleOwnership)) {
    roleContract = replaceOnce(
      roleContract,
      "  await readFile(new URL('../pages/Reports/studentWeeklyPlanViewModel.ts', import.meta.url), 'utf8'),\n",
      "  await readFile(new URL('../pages/Reports/studentWeeklyPlanViewModel.ts', import.meta.url), 'utf8'),\n  await readFile(new URL('../pages/Reports/studentReportActionsViewModel.ts', import.meta.url), 'utf8'),\n",
      'reports role student actions ownership list',
    );
  }
  if (roleContract.includes("assertIncludes(reportsSource, 'const studentAdaptiveLearningBridge = useMemo');")) {
    roleContract = replaceOnce(
      roleContract,
      "  assertIncludes(reportsSource, 'const studentAdaptiveLearningBridge = useMemo');\n",
      "  assertIncludes(reportsSource, 'buildStudentAdaptiveLearningBridge(studentTodayFocus)');\n",
      'reports role student actions delegation assertion',
    );
  }

  if (!globalJourney.includes(studentActionsGlobalOwnership)) {
    globalJourney = replaceOnce(
      globalJourney,
      "    await readFile(new URL('../pages/Reports/studentWeeklyPlanViewModel.ts', import.meta.url), 'utf8'),\n",
      "    await readFile(new URL('../pages/Reports/studentWeeklyPlanViewModel.ts', import.meta.url), 'utf8'),\n    await readFile(new URL('../pages/Reports/studentReportActionsViewModel.ts', import.meta.url), 'utf8'),\n",
      'global journey student actions ownership list',
    );
  }
  appliedPhases.push('student-report-actions');
}

if (appliedPhases.length > 0) {
  write(reportsPath, reports);
  write(roleContractPath, roleContract);
  write(globalJourneyPath, globalJourney);
}

console.log(JSON.stringify({
  status: appliedPhases.length > 0 ? 'APPLIED' : 'ALREADY_APPLIED',
  appliedPhases,
  files: [reportsPath, roleContractPath, globalJourneyPath],
}, null, 2));
