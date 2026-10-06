import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const managerFile = 'dashboards/admin/SchoolsManager.tsx';
const helperFile = 'dashboards/admin/SchoolsManager/schoolCardReadinessViewModel.ts';
const cardFile = 'dashboards/admin/SchoolsManager/SchoolPortfolioCard.tsx';
const managerSource = fs.readFileSync(path.join(root, managerFile), 'utf8').replace(/\r\n/g, '\n');
const helperSource = fs.readFileSync(path.join(root, helperFile), 'utf8').replace(/\r\n/g, '\n');
const cardSource = fs.readFileSync(path.join(root, cardFile), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;
const delegatesCardPresentation = managerSource.includes("import { SchoolPortfolioCard } from './SchoolsManager/SchoolPortfolioCard';");

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

const transpiled = ts.transpileModule(helperSource, {
    compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
});
const diagnostics = (transpiled.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
assert.equal(diagnostics.length, 0, 'school card readiness helper must transpile without TypeScript diagnostics.');
const helper = await import(`data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString('base64')}`);

const readyRow = {
    classCount: 3,
    studentCount: 21,
    supervisorCount: 2,
    activePackageCount: 4,
    activeCodeCount: 7,
};
const emptyRow = {
    classCount: 0,
    studentCount: 0,
    supervisorCount: 0,
    activePackageCount: 0,
    activeCodeCount: 0,
};

check('school cards render from already projected portfolio rows instead of recomputing school snapshots', () => {
    assert.ok(managerSource.includes('filteredRows: filteredSchoolRows'));
    if (delegatesCardPresentation) {
        assert.ok(managerSource.includes('{filteredSchoolRows.map((cardPortfolioRow) => ('));
        assert.ok(managerSource.includes('<SchoolPortfolioCard'));
        assert.ok(managerSource.includes('row={cardPortfolioRow}'));
        assert.ok(cardSource.includes('buildSchoolCardReadinessActions(row)'));
    } else {
        assert.ok(managerSource.includes('{filteredSchoolRows.map((cardPortfolioRow) => {'));
        assert.ok(managerSource.includes('const { school } = cardPortfolioRow;'));
        assert.ok(managerSource.includes('buildSchoolCardReadinessActions(cardPortfolioRow)'));
    }
    assert.ok(!managerSource.includes('const cardOperationalSnapshot = getOperationalSnapshotForSchool(school);'));
    assert.ok(!managerSource.includes('const cardReadinessScore = ['));
});

check('school card counts and readiness state come from the single projected row', () => {
    const ownerSource = delegatesCardPresentation ? cardSource : managerSource;
    const rowName = delegatesCardPresentation ? 'row' : 'cardPortfolioRow';
    assert.ok(ownerSource.includes(`${rowName}.readinessScore`));
    assert.ok(ownerSource.includes(`${rowName}.readinessTotal`));
    assert.ok(ownerSource.includes(`${rowName}.studentCount`));
    assert.ok(ownerSource.includes(`${rowName}.activePackageCount`));
    assert.ok(ownerSource.includes(`${rowName}.activeCodeCount`));
    assert.ok(ownerSource.includes(`${rowName}.isCommerciallyHiddenDraft`));
});

check('card readiness actions preserve the exact existing dynamic labels and navigation targets', () => {
    const actions = helper.buildSchoolCardReadinessActions(readyRow);
    assert.deepEqual(actions.map((action) => [action.id, action.label, action.tab, action.hint]), [
        ['classes', 'الفصول', 'overview', '3 فصل'],
        ['students', 'الطلاب', 'overview', '21 طالب'],
        ['supervisors', 'المشرفون', 'relations', '2 مشرف'],
        ['packages', 'الباقة/المسارات', 'packages', '4 باقة'],
        ['codes', 'الأكواد', 'packages', '7 كود'],
    ]);
    assert.ok(actions.every((action) => action.isReady));
});

check('empty card actions preserve the exact setup copy used before extraction', () => {
    const actions = helper.buildSchoolCardReadinessActions(emptyRow);
    assert.deepEqual(actions.map((action) => action.hint), [
        'أضف فصولًا',
        'أضف الطلاب',
        'اربط مشرفًا',
        'فعّل باقة ومسارات',
        'ولّد كودًا',
    ]);
    assert.ok(actions.every((action) => !action.isReady));
});

check('portfolio expiration is evaluated once per render instead of being frozen behind dependency memoization', () => {
    assert.ok(managerSource.includes('classes, students, b2bPackages, accessCodes, now: Date.now(),'));
    assert.ok(!managerSource.includes('const schoolPortfolioRows = useMemo('));
    assert.ok(!managerSource.includes('() => filterSchoolPortfolioRows(schoolPortfolioRows, schoolSearch, schoolListMode)'));
});

check('card helper remains pure and manager keeps mutations and navigation ownership', () => {
    for (const forbidden of ['useState(', 'useEffect(', 'useMemo(', 'api.', 'window.', 'document.', 'setSelectedSchool(', 'setActiveTab(']) {
        assert.ok(!helperSource.includes(forbidden), `card helper must not include ${forbidden}`);
    }
    if (delegatesCardPresentation) {
        for (const forbidden of ['useStore', 'api.', 'window.', 'document.', 'setSelectedSchool(', 'setActiveTab(']) {
            assert.ok(!cardSource.includes(forbidden), `portfolio card presentation must not include ${forbidden}`);
        }
        assert.ok(managerSource.includes('setSelectedSchool(cardPortfolioRow.school);'));
        assert.ok(managerSource.includes('setActiveTab(tab);'));
        assert.ok(managerSource.includes("window.setTimeout(() => {"));
    } else {
        assert.ok(managerSource.includes('setSelectedSchool(school);'));
        assert.ok(managerSource.includes("setActiveTab(nextCardAction?.tab || 'overview');"));
    }
});

check('card projection meaningfully reduces the manager hotspot without creating another hotspot', () => {
    assert.ok(lineCount(helperSource) <= 75, `schoolCardReadinessViewModel.ts exceeded 75 lines (${lineCount(helperSource)}).`);
    assert.ok(lineCount(managerSource) <= 3050, `SchoolsManager.tsx did not shrink below 3050 lines (${lineCount(managerSource)}).`);
    if (delegatesCardPresentation) {
        assert.ok(lineCount(cardSource) < 240, `SchoolPortfolioCard.tsx is unexpectedly large (${lineCount(cardSource)}).`);
        assert.ok(lineCount(managerSource) < 2950, `SchoolsManager.tsx did not shrink below the presentation target (${lineCount(managerSource)}).`);
    }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
    phase: 'schools-card-readiness-projection-boundary',
    status: failed.length === 0 ? 'PASS' : 'FAIL',
    ownership: delegatesCardPresentation ? 'SchoolPortfolioCard' : 'SchoolsManager',
    managerLines: lineCount(managerSource),
    helperLines: lineCount(helperSource),
    cardLines: lineCount(cardSource),
    checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
