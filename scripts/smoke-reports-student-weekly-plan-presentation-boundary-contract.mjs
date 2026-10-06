import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const panel = read('pages/Reports/StudentWeeklyPlanPanel.tsx');
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

check('Reports delegates weekly-plan presentation to a focused child', () => {
  assertIncludes(reports, "import { StudentWeeklyPlanPanel } from './Reports/StudentWeeklyPlanPanel';");
  assertIncludes(reports, '<StudentWeeklyPlanPanel visible={isStudentReportFull} items={studentWeeklyPlan} />');
  assertNotIncludes(reports, '<h2 className="text-xl font-bold text-gray-900">خطة أسبوعية صغيرة</h2>');
  assertNotIncludes(reports, 'studentWeeklyPlan.map((item) =>');
});

check('weekly-plan panel preserves visibility, labels, mastery tone, and direct actions', () => {
  assertIncludes(panel, 'if (!visible || items.length === 0) return null;');
  assertIncludes(panel, 'خطة أسبوعية صغيرة');
  assertIncludes(panel, 'ثلاث خطوات خفيفة تبدأ من أضعف المهارات');
  assertIncludes(panel, 'to="/plan"');
  assertIncludes(panel, 'items.map((item) =>');
  assertIncludes(panel, "item.mastery < 50 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'");
  assertIncludes(panel, 'المادة: {displayText(item.subjectName)}');
  assertIncludes(panel, 'المهارة الرئيسية: {displayText(item.sectionName)}');
  assertIncludes(panel, 'شرح مقترح:');
  assertIncludes(panel, 'داخل موضوع:');
  assertIncludes(panel, 'تدريب مقترح:');
  assertIncludes(panel, 'to={item.lessonLink}');
  assertIncludes(panel, 'فتح شرح اليوم');
  assertIncludes(panel, 'to={item.quizLink}');
  assertIncludes(panel, 'فتح تدريب اليوم');
});

check('weekly-plan panel is presentation-only and cannot reach store, API, AI, or browser mutations', () => {
  for (const forbidden of [
    'useStore',
    'api.',
    'aiRemediationPlan',
    'useState',
    'useEffect',
    'navigator.',
    'window.',
    'loadXlsx',
    'setSmartRemediation',
  ]) {
    assertNotIncludes(panel, forbidden);
  }
  assertIncludes(panel, "import type { StudentWeeklyPlanItem } from './studentWeeklyPlanViewModel';");
});

check('role and global student journey contracts follow the presentation ownership', () => {
  assertIncludes(roleContract, "../pages/Reports/StudentWeeklyPlanPanel.tsx");
  assertIncludes(globalJourney, "../pages/Reports/StudentWeeklyPlanPanel.tsx");
});

check('weekly-plan presentation extraction stays bounded and reduces the Reports hotspot', () => {
  const reportLines = reports.split('\n').length;
  const panelLines = panel.split('\n').length;
  if (reportLines >= 2710) throw new Error(`Reports.tsx exceeded the guarded size: ${reportLines}`);
  if (panelLines > 90) throw new Error(`StudentWeeklyPlanPanel.tsx exceeded 90 lines: ${panelLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-student-weekly-plan-presentation',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  panelLines: panel.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
