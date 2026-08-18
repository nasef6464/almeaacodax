import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const rows = read('pages/Reports/studentSkillRowsViewModel.ts');
const roleContract = read('scripts/smoke-reports-role-contract.mjs');
const globalJourney = read('scripts/smoke-global-student-journey-contract.mjs');
const performanceContract = read('scripts/smoke-performance-contract.mjs');

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

check('Reports delegates compact student skill rows to a focused view-model', () => {
  assertIncludes(reports, "from './Reports/studentSkillRowsViewModel';");
  assertIncludes(reports, 'buildStudentSkillReportRows(focusedReportSkills, {');
  assertNotIncludes(reports, 'const compactStudentSkillRows = useMemo(() => {');
});

check('student skill rows preserve recommendation, mastery tone, and direct learning links', () => {
  assertIncludes(rows, 'buildSkillRecommendation(skill, catalog)');
  assertIncludes(rows, 'getReportMasteryTone(skill.mastery)');
  assertIncludes(rows, "recommendation.lessonLink || recommendation.foundationTopicLink || '/courses'");
  assertIncludes(rows, "skill.skillId ? `/quiz?skillIds=${encodeURIComponent(skill.skillId)}` : '/dashboard?tab=saher'");
  assertIncludes(rows, 'retestLink: quizLink');
});

check('student skill rows preserve evidence labels and five-row compact default', () => {
  assertIncludes(rows, 'limit = 5');
  assertIncludes(rows, 'focusedReportSkills.slice(0, limit).map((skill) => {');
  assertIncludes(rows, 'evidenceLabel: skill.isReliable');
  assertIncludes(rows, '`${skill.correctAttempts}/${skill.totalEvidence} صحيح`');
  assertIncludes(rows, '`قراءة أولية ${skill.correctAttempts}/${skill.totalEvidence}`');
});

check('student skill row projection stays deterministic and side-effect free', () => {
  for (const forbidden of [
    "from 'react'",
    'useMemo',
    'useStore',
    "from '../../services/api'",
    'api.',
    'navigator.',
    'window.',
    'loadXlsx',
    'lucide-react',
  ]) {
    assertNotIncludes(rows, forbidden);
  }
});

check('role, journey, and performance contracts follow student skill-row ownership', () => {
  assertIncludes(roleContract, "../pages/Reports/studentSkillRowsViewModel.ts");
  assertIncludes(globalJourney, "../pages/Reports/studentSkillRowsViewModel.ts");
  assertIncludes(performanceContract, "assertIncludes('pages/Reports/studentSkillRowsViewModel.ts', 'evidenceLabel: skill.isReliable');");
  assertNotIncludes(performanceContract, "assertIncludes('pages/Reports.tsx', 'evidenceLabel: skill.isReliable');");
});

check('student skill row extraction reduces Reports without creating another hotspot', () => {
  const reportLines = reports.split('\n').length;
  const rowLines = rows.split('\n').length;
  if (reportLines >= 2950) throw new Error(`Reports.tsx exceeded the guarded size: ${reportLines}`);
  if (rowLines > 90) throw new Error(`studentSkillRowsViewModel.ts exceeded 90 lines: ${rowLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-student-skill-rows-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  rowLines: rows.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
