import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const managerFile = 'dashboards/admin/SchoolsManager.tsx';
const viewModelFile = 'dashboards/admin/SchoolsManager/readinessViewModel.ts';
const managerSource = fs.readFileSync(path.join(root, managerFile), 'utf8').replace(/\r\n/g, '\n');
const viewModelSource = fs.readFileSync(path.join(root, viewModelFile), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;

const checks = [];
const check = (name, assertion) => {
    try {
        assertion();
        checks.push({ name, status: 'PASS' });
    } catch (error) {
        checks.push({
            name,
            status: 'FAIL',
            details: error instanceof Error ? error.message : String(error),
        });
    }
};

const transpiled = ts.transpileModule(viewModelSource, {
    compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
});
const diagnostics = (transpiled.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
assert.equal(diagnostics.length, 0, 'readiness view-model must transpile without TypeScript diagnostics.');
const viewModel = await import(`data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString('base64')}`);

const makeRow = ({ id, name, readinessScore, hidden = false }) => ({
    school: { id, name },
    readinessScore,
    readinessTotal: 5,
    isCommerciallyHiddenDraft: hidden,
});
const rows = [
    makeRow({ id: 'ready', name: 'مدرسة الرياض', readinessScore: 5 }),
    makeRow({ id: 'needs', name: 'مدرسة جدة', readinessScore: 3 }),
    makeRow({ id: 'demo', name: 'Demo School', readinessScore: 1, hidden: true }),
];

check('manager delegates school portfolio filtering to one readiness projection', () => {
    assert.ok(managerSource.includes('filterSchoolPortfolioRows,'));
    assert.ok(managerSource.includes('filterSchoolPortfolioRows(schoolPortfolioRows, schoolSearch, schoolListMode)'));
    assert.ok(managerSource.includes('const { filteredSchools, hiddenDraftSchoolsCount, visibleDraftSchoolsCount } = useMemo('));
    assert.ok(!managerSource.includes('const filteredSchools = useMemo(() => {'));
});

check('active, setup, ready, and all modes preserve existing school visibility semantics', () => {
    assert.deepEqual(
        viewModel.filterSchoolPortfolioRows(rows, '', 'active').filteredSchools.map((school) => school.id),
        ['ready', 'needs'],
    );
    assert.deepEqual(
        viewModel.filterSchoolPortfolioRows(rows, '', 'needs_setup').filteredSchools.map((school) => school.id),
        ['needs'],
    );
    assert.deepEqual(
        viewModel.filterSchoolPortfolioRows(rows, '', 'ready').filteredSchools.map((school) => school.id),
        ['ready'],
    );
    assert.deepEqual(
        viewModel.filterSchoolPortfolioRows(rows, '', 'all').filteredSchools.map((school) => school.id),
        ['ready', 'needs', 'demo'],
    );
});

check('explicit search still reveals matching hidden drafts exactly like the previous manager behavior', () => {
    const result = viewModel.filterSchoolPortfolioRows(rows, 'demo', 'active');
    assert.deepEqual(result.filteredRows.map((row) => row.school.id), ['demo']);
    assert.deepEqual(result.filteredSchools.map((school) => school.id), ['demo']);
    assert.equal(result.hiddenDraftSchoolsCount, 1);
    assert.equal(result.visibleDraftSchoolsCount, 1);
});

check('portfolio rows carry the hidden-draft decision so snapshots are not recomputed for filtering', () => {
    assert.ok(viewModelSource.includes('isCommerciallyHiddenDraft: snapshot.isCommerciallyHiddenDraft'));
    assert.ok(viewModelSource.includes('filteredSchools: filteredRows.map((row) => row.school)'));
    assert.ok(!managerSource.includes('schools.filter((school) => getOperationalSnapshotForSchool(school).isCommerciallyHiddenDraft'));
    assert.ok(!managerSource.includes('filteredSchools.filter((school) => getOperationalSnapshotForSchool(school).isCommerciallyHiddenDraft'));
});

check('projection remains pure and bounded', () => {
    assert.ok(!viewModelSource.includes('useState('));
    assert.ok(!viewModelSource.includes('useEffect('));
    assert.ok(!viewModelSource.includes('useMemo('));
    assert.ok(!viewModelSource.includes("from '../../services/api'"));
    assert.ok(lineCount(viewModelSource) <= 280, `readinessViewModel.ts exceeded 280 lines (${lineCount(viewModelSource)}).`);
    assert.ok(lineCount(managerSource) <= 3090, `SchoolsManager.tsx did not shrink below the phase budget (${lineCount(managerSource)} lines).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
    phase: 'schools-portfolio-projection-boundary',
    status: failed.length === 0 ? 'PASS' : 'FAIL',
    managerLines: lineCount(managerSource),
    viewModelLines: lineCount(viewModelSource),
    checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
