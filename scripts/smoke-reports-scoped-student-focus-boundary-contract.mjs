import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const focus = read('pages/Reports/scopedStudentFocusViewModel.ts');
const reportsRole = read('scripts/smoke-reports-role-contract.mjs');
const globalJourney = read('scripts/smoke-global-student-journey-contract.mjs');
const performance = read('scripts/smoke-performance-contract.mjs');

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

check('Reports delegates scoped student focus projection while keeping workbook side effects local', () => {
  assertIncludes(reports, "from './Reports/scopedStudentFocusViewModel';");
  assertIncludes(reports, 'buildScopedStudentFocusCards(scopedFilteredStudents, skills)');
  assertIncludes(reports, 'const downloadScopedStudentsWorkbook = async () =>');
  assertIncludes(reports, 'const XLSX = await loadXlsx();');
  assertNotIncludes(reports, 'const topSkills = (student.weakestSkills || []).slice(0, 2);');
  assertNotIncludes(reports, 'targetGroupId: student.groupIds?.[0],');
});

check('student focus view-model preserves card limits and skill resolution', () => {
  assertIncludes(focus, 'scopedFilteredStudents.slice(0, 4).map');
  assertIncludes(focus, 'const topSkills = (student.weakestSkills || []).slice(0, 2);');
  assertIncludes(focus, 'displayText(skill.name) === displayText(primarySkillName)');
});

check('student focus view-model preserves directed follow-up targeting', () => {
  assertIncludes(focus, 'buildDirectedQuizManagerLink({');
  assertIncludes(focus, 'pathId: resolvedSkill?.pathId');
  assertIncludes(focus, 'subjectId: resolvedSkill?.subjectId');
  assertIncludes(focus, 'sectionId: resolvedSkill?.sectionId');
  assertIncludes(focus, 'skillId: resolvedSkill?.id');
  assertIncludes(focus, 'targetUserId: student.id');
  assertIncludes(focus, 'targetGroupId: student.groupIds?.[0]');
});

check('student focus view-model preserves severity presentation threshold', () => {
  assertIncludes(focus, 'student.averageScore < 50');
  assertIncludes(focus, "'border-rose-100 bg-rose-50/70 text-rose-700'");
  assertIncludes(focus, "'border-amber-100 bg-amber-50/70 text-amber-700'");
});

check('student focus view-model remains deterministic and runtime-side-effect free', () => {
  assertNotIncludes(focus, 'useStore');
  assertNotIncludes(focus, "from 'react'");
  assertNotIncludes(focus, "from '../../services/api'");
  assertNotIncludes(focus, 'api.');
  assertNotIncludes(focus, 'navigator.');
  assertNotIncludes(focus, 'window.');
  assertNotIncludes(focus, 'loadXlsx');
});

check('Reports and performance contracts follow scoped student focus ownership', () => {
  assertIncludes(reportsRole, "../pages/Reports/scopedStudentFocusViewModel.ts");
  assertIncludes(globalJourney, "../pages/Reports/scopedStudentFocusViewModel.ts");
  assertIncludes(reportsRole, "assertIncludes(reportsSource, 'buildScopedStudentFocusCards(scopedFilteredStudents, skills)');");
  assertIncludes(performance, "assertIncludes('pages/Reports/scopedStudentFocusViewModel.ts', 'targetUserId: student.id');");
  assertIncludes(performance, "assertIncludes('pages/Reports/scopedStudentFocusViewModel.ts', 'targetGroupId: student.groupIds?.[0]');");
  assertIncludes(performance, "assertIncludes('pages/Reports.tsx', 'to={student.followUpLink}');");
});

check('student focus extraction does not create a replacement hotspot', () => {
  const reportLines = reports.split('\n').length;
  const focusLines = focus.split('\n').length;
  if (reportLines >= 3100) throw new Error(`Reports.tsx exceeded the guarded post-extraction size: ${reportLines}`);
  if (focusLines > 80) throw new Error(`scopedStudentFocusViewModel.ts exceeded 80 lines: ${focusLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-scoped-student-focus-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  focusLines: focus.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
