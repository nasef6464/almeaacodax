import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const manager = read('dashboards/admin/SchoolsManager.tsx');
const panel = read('dashboards/admin/SchoolsManager/SchoolCommandCenterPanel.tsx');

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

check('manager delegates command-center presentation with explicit orchestration callbacks', () => {
  assertIncludes(manager, "import { SchoolCommandCenterPanel } from './SchoolsManager/SchoolCommandCenterPanel';");
  assertIncludes(manager, '<SchoolCommandCenterPanel');
  assertIncludes(manager, 'readinessChecks={readinessChecks}');
  assertIncludes(manager, 'commercialDecisionCards={commercialDecisionCards}');
  assertIncludes(manager, 'commercialOperatingSteps={commercialOperatingSteps}');
  assertIncludes(manager, 'onDownloadHandover={downloadSchoolHandover}');
  assertIncludes(manager, "onSelectTab={(tab) => setActiveTab(tab)}");
  assertIncludes(manager, 'setExpandedSchoolStep(tab);');
  assertIncludes(manager, 'await handleCreateSingleClass();');
  assertIncludes(manager, 'setIsSingleStudentOpen(true);');
  assertIncludes(manager, "document.querySelector('[data-testid=\"school-relations-quick-supervisor-card\"]')");
  assertIncludes(manager, "url.searchParams.set('tab', 'school-portal')");
});

check('command-center child preserves readiness, delivery and primary-action contracts', () => {
  assertIncludes(panel, 'data-testid="school-command-center"');
  assertIncludes(panel, 'data-testid="school-next-action"');
  assertIncludes(panel, 'data-testid="school-commercial-summary-strip"');
  assertIncludes(panel, 'data-testid="school-handover-decision-board"');
  assertIncludes(panel, 'data-testid="school-handover-decision-items"');
  assertIncludes(panel, 'data-testid="school-delivery-journey"');
  assertIncludes(panel, 'data-testid="school-setup-progress"');
  assertIncludes(panel, 'data-testid="school-primary-actions"');
  assertIncludes(panel, 'data-testid="school-primary-add-class"');
  assertIncludes(panel, 'data-testid="school-primary-add-student"');
  assertIncludes(panel, 'data-testid="school-primary-add-supervisor"');
  assertIncludes(panel, 'data-testid="school-primary-open-packages"');
  assertIncludes(panel, 'data-testid="school-primary-open-reports"');
  assertIncludes(panel, 'data-testid="school-primary-open-portal"');
  assertIncludes(panel, 'مركز تشغيل المدرسة');
  assertIncludes(panel, 'مسار تسليم المدرسة');
  assertIncludes(panel, 'ملف التسليم');
});

check('command-center child remains presentation-only', () => {
  assertNotIncludes(panel, 'useStore');
  assertNotIncludes(panel, "from '../../../services/api'");
  assertNotIncludes(panel, 'api.');
  assertNotIncludes(panel, 'setActiveTab');
  assertNotIncludes(panel, 'setExpandedSchoolStep');
  assertNotIncludes(panel, 'handleCreateSingleClass');
  assertNotIncludes(panel, 'document.querySelector');
  assertNotIncludes(panel, 'window.history');
  assertIncludes(panel, 'onCommercialDecision(card)');
  assertIncludes(panel, 'onSelectJourneyStep(step.tab)');
  assertIncludes(panel, 'void onAddClass()');
  assertIncludes(panel, 'onOpenPortal');
});

check('extraction reduces manager hotspot without creating an oversized child', () => {
  const managerLines = manager.split('\n').length;
  const panelLines = panel.split('\n').length;
  if (managerLines >= 3200) throw new Error(`SchoolsManager remained too large after command-center extraction: ${managerLines}`);
  if (panelLines > 390) throw new Error(`SchoolCommandCenterPanel exceeded 390 lines: ${panelLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'schools-command-center-presentation-boundary',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  managerLines: manager.split('\n').length,
  panelLines: panel.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
