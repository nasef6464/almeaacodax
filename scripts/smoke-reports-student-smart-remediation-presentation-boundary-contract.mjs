import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const panel = read('pages/Reports/StudentSmartRemediationPanel.tsx');
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

check('Reports delegates generated remediation presentation to a focused child', () => {
  assertIncludes(reports, "import { StudentSmartRemediationPanel } from './Reports/StudentSmartRemediationPanel';");
  assertIncludes(reports, '<StudentSmartRemediationPanel visible={isStudentReportFull} plan={smartRemediation} />');
  assertNotIncludes(reports, 'خطة علاجية مولدة من أدائك');
  assertNotIncludes(reports, '(smartRemediation.steps || []).slice(0, 3).map');
});

check('smart remediation panel preserves plan copy, three-step cap, fallbacks, and parent note', () => {
  assertIncludes(panel, 'if (!visible || !plan) return null;');
  assertIncludes(panel, 'خطة علاجية مولدة من أدائك');
  assertIncludes(panel, "displayText(plan.title) || 'خطة علاجية قصيرة'");
  assertIncludes(panel, 'ابدأ بأضعف مهارة، راجع شرحًا بسيطًا، ثم حل تدريبًا قصيرًا وأعد القياس.');
  assertIncludes(panel, 'to="/plan"');
  assertIncludes(panel, 'تحويلها لخطة مذاكرة');
  assertIncludes(panel, '(plan.steps || []).slice(0, 3).map');
  assertIncludes(panel, 'مهارة تحتاج متابعة');
  assertIncludes(panel, 'التحقق:');
  assertIncludes(panel, 'أعد القياس بسؤال أو اختبار قصير.');
  assertIncludes(panel, 'plan.parentNote ? (');
  assertIncludes(panel, 'ملاحظة لولي الأمر: {displayText(plan.parentNote)}');
});

check('smart remediation panel is presentation-only and cannot generate or mutate remediation state', () => {
  for (const forbidden of [
    'useStore',
    'api.',
    'aiRemediationPlan',
    'buildStudentRemediationFallback',
    'setSmartRemediation',
    'useState',
    'useEffect',
    'window.',
    'navigator.',
  ]) {
    assertNotIncludes(panel, forbidden);
  }
  assertIncludes(panel, "import type { SmartRemediationPlan } from './reportTypes';");
});

check('role and global journey contracts follow smart remediation presentation ownership', () => {
  assertIncludes(roleContract, "../pages/Reports/StudentSmartRemediationPanel.tsx");
  assertIncludes(globalJourney, "../pages/Reports/StudentSmartRemediationPanel.tsx");
});

check('smart remediation presentation extraction stays bounded and reduces Reports hotspot', () => {
  const reportLines = reports.split('\n').length;
  const panelLines = panel.split('\n').length;
  if (reportLines >= 2660) throw new Error(`Reports.tsx exceeded the guarded size: ${reportLines}`);
  if (panelLines > 80) throw new Error(`StudentSmartRemediationPanel.tsx exceeded 80 lines: ${panelLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'reports-student-smart-remediation-presentation',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  panelLines: panel.split('\n').length,
  checks,
}, null, 2));
if (failed.length > 0) process.exit(1);
