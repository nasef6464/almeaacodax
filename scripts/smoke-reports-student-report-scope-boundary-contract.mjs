import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const scope = read('pages/Reports/studentReportScopeViewModel.ts');
const roleContract = read('scripts/smoke-reports-role-contract.mjs');
const globalJourney = read('scripts/smoke-global-student-journey-contract.mjs');

const checks = [];
function check(name, assertion) {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
}
function assertIncludes(source, fragment, message) {
  if (!source.includes(fragment)) throw new Error(message || `Missing fragment: ${fragment}`);
}
function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) throw new Error(message || `Unexpected fragment: ${fragment}`);
}

check('Reports delegates student track and skill focus policy to a focused view-model', () => {
  assertIncludes(reports, "from './Reports/studentReportScopeViewModel';");
  assertIncludes(reports, 'buildStudentReportScope({');
  assertIncludes(reports, 'role: user.role');
  assertNotIncludes(reports, 'const effectiveStudentPathIds = selectedStudentPathId');
  assertNotIncludes(reports, 'const reliableWeakSkills = reliableAggregatedSkills.filter');
});

check('student report scope preserves enrollment and role-aware path filtering', () => {
  assertIncludes(scope, 'Array.from(new Set(enrolledPaths || [])).filter(Boolean)');
  assertIncludes(scope, 'studentEnrolledPathIds.includes(path.id) || role !== Role.STUDENT');
  assertIncludes(scope, "selectedStudentPathId === 'all'");
  assertIncludes(scope, 'effectiveStudentPathIds.includes(skill.pathId)');
  assertIncludes(scope, 'studentPathScopedSkills.length > 0 ? studentPathScopedSkills : aggregatedSkills');
});

check('student report scope preserves evidence reliability and focus ordering', () => {
  assertIncludes(scope, 'reportBaseSkills.filter((skill) => skill.isReliable)');
  assertIncludes(scope, 'skill.mastery < 50');
  assertIncludes(scope, 'skill.mastery >= 50 && skill.mastery < 75');
  assertIncludes(scope, 'skill.mastery < 50 && !skill.isReliable');
  assertIncludes(scope, '[...reliableWeakSkills, ...reliableAverageSkills]');
  assertIncludes(scope, ').slice(0, 6);');
});

check('student report scope preserves selected skill and track labels', () => {
  assertIncludes(scope, 'getReportSkillKey(skill) === selectedSkillKey');
  assertIncludes(scope, 'focusedReportSkills[0] || weakestSkill');
  assertIncludes(scope, "studentEnrolledPathLabels.join('، ')");
  assertIncludes(scope, 'hasStudentTrackScope: studentEnrolledPathIds.length > 0');
});

check('student report scope stays deterministic and UI-framework independent', () => {
  for (const forbidden of ["from 'react'", 'useMemo', 'useStore', "from '../../services/api'", 'api.', 'navigator.', 'window.', 'lucide-react']) {
    assertNotIncludes(scope, forbidden);
  }
});

check('role and global journey contracts follow student report scope ownership', () => {
  assertIncludes(roleContract, "../pages/Reports/studentReportScopeViewModel.ts");
  assertIncludes(globalJourney, "../pages/Reports/studentReportScopeViewModel.ts");
});

check('student report scope extraction reduces Reports without creating another hotspot', () => {
  const reportLines = reports.split('\n').length;
  const scopeLines = scope.split('\n').length;
  if (reportLines >= 2795) throw new Error(`Reports.tsx exceeded the guarded size: ${reportLines}`);
  if (scopeLines > 120) throw new Error(`studentReportScopeViewModel.ts exceeded 120 lines: ${scopeLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'reports-student-report-scope-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  scopeLines: scope.split('\n').length,
  checks,
}, null, 2));
if (failed.length > 0) process.exit(1);
