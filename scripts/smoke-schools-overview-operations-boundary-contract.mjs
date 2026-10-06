import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const manager = read('dashboards/admin/SchoolsManager.tsx');
const panel = read('dashboards/admin/SchoolsManager/SchoolOverviewOperationsPanel.tsx');

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

check('manager delegates rich overview operations presentation', () => {
  assertIncludes(manager, "import { SchoolOverviewOperationsPanel } from './SchoolsManager/SchoolOverviewOperationsPanel';");
  assertIncludes(manager, '<SchoolOverviewOperationsPanel');
  assertIncludes(manager, 'overviewFocusActions={overviewFocusActions}');
  assertIncludes(manager, 'activePackageCount={activeSchoolPackages.length}');
  assertIncludes(manager, 'classOperatingRows={classOperatingRows}');
  assertIncludes(manager, "setActiveTab(action.tab || 'overview')");
  assertIncludes(manager, 'document.querySelector(`[data-testid="${action.target}"]`)');
  assertIncludes(manager, 'document.querySelector(`[data-school-class-id="${classroomId}"]`)');
});

check('overview child preserves focus, metrics, capacity and class operating brief', () => {
  assertIncludes(panel, 'data-testid="school-overview-focus-strip"');
  assertIncludes(panel, 'data-testid="school-overview-metrics-grid"');
  assertIncludes(panel, 'data-testid="school-class-operating-brief"');
  assertIncludes(panel, 'data-testid="school-class-operating-row"');
  assertIncludes(panel, 'data-testid="school-class-operating-open"');
  assertIncludes(panel, 'لوحة تشغيل المدرسة');
  assertIncludes(panel, 'إجمالي الطلاب');
  assertIncludes(panel, 'الفصول الدراسية');
  assertIncludes(panel, 'الباقات النشطة');
  assertIncludes(panel, 'المقاعد المتاحة');
  assertIncludes(panel, 'أكواد فعالة');
  assertIncludes(panel, 'كل فصل واضح قبل التسليم');
});

check('overview child remains presentation-only and receives explicit navigation callbacks', () => {
  assertNotIncludes(panel, 'useStore');
  assertNotIncludes(panel, "from '../../../services/api'");
  assertNotIncludes(panel, 'api.');
  assertNotIncludes(panel, 'setActiveTab');
  assertNotIncludes(panel, 'document.querySelector');
  assertIncludes(panel, 'onFocusAction(action)');
  assertIncludes(panel, 'onOpenClass(row.classroom.id)');
});

check('extraction reduces manager hotspot without creating a new hotspot', () => {
  const managerLines = manager.split('\n').length;
  const panelLines = panel.split('\n').length;
  if (managerLines >= 3440) throw new Error(`SchoolsManager remained too large after overview summary extraction: ${managerLines}`);
  if (panelLines > 250) throw new Error(`SchoolOverviewOperationsPanel exceeded 250 lines: ${panelLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'schools-overview-operations-presentation-boundary',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  managerLines: manager.split('\n').length,
  panelLines: panel.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
