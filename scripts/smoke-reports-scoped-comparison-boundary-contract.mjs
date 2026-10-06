import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const comparison = read('pages/Reports/scopedComparisonViewModel.ts');
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

check('Reports delegates scoped comparison derivation to a pure view-model', () => {
  assertIncludes(reports, "from './Reports/scopedComparisonViewModel';");
  assertIncludes(reports, 'buildScopedAvailableGroups(scopedAnalytics)');
  assertIncludes(reports, 'filterScopedStudentsByGroup(scopedAnalytics, scopedGroupFilter)');
  assertIncludes(reports, 'buildScopedLatestResults(scopedResults, scopedGroupFilter, scopedFilteredStudents)');
  assertIncludes(reports, 'buildScopedGroupPerformanceRows({');
  assertIncludes(reports, 'getStrongestScopedGroup(scopedGroupPerformanceRows)');
  assertIncludes(reports, 'buildScopedTeacherPerformanceRows({');
  assertNotIncludes(reports, 'const groupNameById = new Map(groups.map');
  assertNotIncludes(reports, 'const scopedGroupIds = new Set<string>([');
});

check('scoped comparison view-model preserves group filtering and latest-result semantics', () => {
  assertIncludes(comparison, 'export const buildScopedAvailableGroups = (');
  assertIncludes(comparison, 'if (groupFilter === \'all\') return scopedAnalytics.weakestStudents;');
  assertIncludes(comparison, 'displayText(name) === groupFilter');
  assertIncludes(comparison, "return filtered.slice(0, 6);");
});

check('scoped comparison view-model preserves group weakness ranking', () => {
  assertIncludes(comparison, 'export const buildScopedGroupPerformanceRows = ({');
  assertIncludes(comparison, "displayText(groupName) || 'مجموعة غير محددة'");
  assertIncludes(comparison, 'if (score < 75) row.weakAttempts += 1;');
  assertIncludes(comparison, 'const weaknessScoreA = a.weakStudentCount * 10 + a.weakAttempts - a.averageScore;');
  assertIncludes(comparison, 'const weaknessScoreB = b.weakStudentCount * 10 + b.weakAttempts - b.averageScore;');
  assertIncludes(comparison, '.slice(0, 8);');
  assertIncludes(comparison, 'export const getStrongestScopedGroup = (');
  assertIncludes(comparison, 'b.averageScore - a.averageScore || a.weakStudentCount - b.weakStudentCount');
});

check('scoped comparison view-model preserves teacher comparison semantics', () => {
  assertIncludes(comparison, 'export const buildScopedTeacherPerformanceRows = ({');
  assertIncludes(comparison, "candidate.role === 'teacher'");
  assertIncludes(comparison, 'group.supervisorIds.includes(teacher.id) || (teacher.groupIds || []).includes(group.id)');
  assertIncludes(comparison, 'Number(result.score || 0) < 70');
  assertIncludes(comparison, "displayText(teacher.name) || displayText(teacher.email) || 'معلم'");
  assertIncludes(comparison, 'a.averageScore - b.averageScore || b.weakStudentCount - a.weakStudentCount');
});

check('scoped comparison view-model remains deterministic and runtime-side-effect free', () => {
  assertNotIncludes(comparison, 'useStore');
  assertNotIncludes(comparison, "from 'react'");
  assertNotIncludes(comparison, "from '../../services/api'");
  assertNotIncludes(comparison, 'api.');
  assertNotIncludes(comparison, 'navigator.');
  assertNotIncludes(comparison, 'window.');
  assertNotIncludes(comparison, 'loadXlsx');
});

check('Reports contracts follow scoped comparison ownership', () => {
  assertIncludes(reportsRole, "../pages/Reports/scopedComparisonViewModel.ts");
  assertIncludes(globalJourney, "../pages/Reports/scopedComparisonViewModel.ts");
  assertIncludes(reportsRole, "assertIncludes(reportsSource, 'buildScopedGroupPerformanceRows({');");
  assertIncludes(reportsRole, "assertIncludes(reportsSource, 'buildScopedTeacherPerformanceRows({');");
});

check('scoped comparison extraction reduces Reports without creating a replacement hotspot', () => {
  const reportLines = reports.split('\n').length;
  const comparisonLines = comparison.split('\n').length;
  if (reportLines >= 3230) throw new Error(`Reports.tsx remained too large after scoped comparison extraction: ${reportLines}`);
  if (comparisonLines > 260) throw new Error(`scopedComparisonViewModel.ts exceeded 260 lines: ${comparisonLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-scoped-comparison-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  comparisonLines: comparison.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
