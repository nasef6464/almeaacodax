import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const manager = read('dashboards/admin/SchoolsManager.tsx');
const panel = read('dashboards/admin/SchoolsManager/SchoolPortfolioFilterPanel.tsx');

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
}

function assertIncludes(source, fragment) {
  if (!source.includes(fragment)) throw new Error(`Missing fragment: ${fragment}`);
}

function assertNotIncludes(source, fragment) {
  if (source.includes(fragment)) throw new Error(`Unexpected fragment: ${fragment}`);
}

check('manager delegates portfolio filtering presentation', () => {
  assertIncludes(manager, "import { SchoolPortfolioFilterPanel } from './SchoolsManager/SchoolPortfolioFilterPanel';");
  assertIncludes(manager, '<SchoolPortfolioFilterPanel');
  assertIncludes(manager, 'filteredSchoolsCount={filteredSchools.length}');
  assertIncludes(manager, 'hiddenDraftSchoolsCount={hiddenDraftSchoolsCount}');
  assertIncludes(manager, 'onSearchChange={setSchoolSearch}');
  assertIncludes(manager, 'onModeChange={setSchoolListMode}');
  assertNotIncludes(manager, 'data-testid="school-list-mode-filter"');
  assertNotIncludes(manager, 'data-testid="school-cleanup-review-panel"');
});

check('portfolio panel preserves search and cleanup controls', () => {
  assertIncludes(panel, 'data-testid="school-portfolio-filter-panel"');
  assertIncludes(panel, 'data-testid="school-list-mode-filter"');
  assertIncludes(panel, 'data-testid="school-hidden-drafts-note"');
  assertIncludes(panel, 'data-testid="school-open-cleanup-mode"');
  assertIncludes(panel, 'data-testid="school-cleanup-review-panel"');
  assertIncludes(panel, 'ابحث باسم المدرسة أو الجهة...');
  assertIncludes(panel, 'الأولوية التجارية');
  assertIncludes(panel, 'عرض الكل/التنظيف');
});

check('portfolio panel remains presentation-only', () => {
  assertNotIncludes(panel, 'useStore');
  assertNotIncludes(panel, 'services/api');
  assertNotIncludes(panel, 'api.');
  assertNotIncludes(panel, 'setSchoolSearch');
  assertNotIncludes(panel, 'setSchoolListMode');
  assertIncludes(panel, 'onSearchChange(event.target.value)');
  assertIncludes(panel, "onModeChange('all')");
});

check('extraction reduces manager hotspot without oversized child', () => {
  const managerLines = manager.split('\n').length;
  const panelLines = panel.split('\n').length;
  if (managerLines >= 3200) throw new Error(`SchoolsManager remains too large: ${managerLines}`);
  if (panelLines > 180) throw new Error(`SchoolPortfolioFilterPanel exceeded 180 lines: ${panelLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'schools-portfolio-filter-presentation-boundary',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  managerLines: manager.split('\n').length,
  panelLines: panel.split('\n').length,
  checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
