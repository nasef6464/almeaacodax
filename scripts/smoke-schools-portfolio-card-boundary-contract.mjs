import { readFile } from 'node:fs/promises';

const read = async (path) => (await readFile(new URL(`../${path}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');

const managerSource = await read('dashboards/admin/SchoolsManager.tsx');
const cardSource = await read('dashboards/admin/SchoolsManager/SchoolPortfolioCard.tsx');
const helperSource = await read('dashboards/admin/SchoolsManager/schoolCardReadinessViewModel.ts');
const managementContractSource = await read('scripts/smoke-school-management-contract.mjs');

const checks = [];
const check = (name, assertion) => {
    try {
        assertion();
        checks.push({ name, status: 'PASS' });
    } catch (error) {
        checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
    }
};
const includes = (source, fragment, message = `Missing fragment: ${fragment}`) => {
    if (!source.includes(fragment)) throw new Error(message);
};
const excludes = (source, fragment, message = `Unexpected fragment: ${fragment}`) => {
    if (source.includes(fragment)) throw new Error(message);
};

check('manager delegates portfolio-card presentation with explicit callbacks', () => {
    includes(managerSource, "import { SchoolPortfolioCard } from './SchoolsManager/SchoolPortfolioCard';");
    includes(managerSource, '<SchoolPortfolioCard');
    includes(managerSource, 'row={cardPortfolioRow}');
    includes(managerSource, 'actionsOpen={activeSchoolActionsId === cardPortfolioRow.school.id}');
    includes(managerSource, 'onOpenTab={(tab) => {');
    includes(managerSource, 'setSelectedSchool(cardPortfolioRow.school);');
    includes(managerSource, 'setActiveTab(tab);');
    excludes(managerSource, 'const cardReadinessActions = buildSchoolCardReadinessActions(cardPortfolioRow);');
});

check('portfolio card preserves readiness, action, cleanup and operating labels', () => {
    includes(cardSource, 'buildSchoolCardReadinessActions(row)');
    includes(cardSource, 'data-testid="school-card"');
    includes(cardSource, 'data-testid="school-card-readiness"');
    includes(cardSource, 'data-testid="school-card-readiness-progress"');
    includes(cardSource, 'data-testid="school-card-next-action-panel"');
    includes(cardSource, 'data-testid="school-card-next-action"');
    includes(cardSource, 'data-testid={`school-card-step-${action.id}`}');
    includes(cardSource, 'data-testid="school-card-open-management"');
    includes(cardSource, 'data-testid="school-card-review-delete"');
    includes(cardSource, 'مسار تشغيل المدرسة: فصول، طلاب، مشرفون، باقة/مسارات، أكواد، ثم تقرير تسليم.');
    includes(cardSource, 'مسودة/تجربة معزولة عن الأولوية التجارية');
});

check('portfolio card remains presentation-only while manager owns state and browser orchestration', () => {
    excludes(cardSource, 'useStore');
    excludes(cardSource, 'api.');
    excludes(cardSource, 'window.');
    excludes(cardSource, 'document.');
    excludes(cardSource, 'setTimeout');
    excludes(cardSource, 'setSelectedSchool');
    excludes(cardSource, 'setActiveTab');
    includes(managerSource, 'window.setTimeout(() => {');
    includes(managerSource, "document.querySelector('[data-testid=\"school-delete-confirm-panel\"]')?.scrollIntoView");
});

check('menu opening semantics remain distinct from direct card navigation', () => {
    includes(cardSource, "onClick={() => onOpenFromMenu('overview')}");
    includes(cardSource, "onClick={() => onOpenFromMenu('relations')}");
    includes(cardSource, "onClick={() => onOpenTab(nextCardAction?.tab || 'overview')}");
    includes(cardSource, 'onClick={() => onOpenTab(action.tab)}');
    includes(managerSource, 'onOpenFromMenu={(tab) => {');
    includes(managerSource, 'closeSchoolActions();');
});

check('school management contract follows the new card ownership instead of losing coverage', () => {
    includes(managementContractSource, 'SchoolPortfolioCard.tsx');
    includes(managementContractSource, 'schoolCardReadinessViewModel.ts');
    includes(managementContractSource, 'onOpenTab(action.tab)');
    excludes(managementContractSource, 'setActiveTab(action.tab)');
});

check('extraction reduces manager hotspot without creating a replacement hotspot', () => {
    const managerLines = managerSource.split('\n').length;
    const cardLines = cardSource.split('\n').length;
    const helperLines = helperSource.split('\n').length;
    if (managerLines >= 2950) throw new Error(`SchoolsManager remains too large after card extraction: ${managerLines}`);
    if (cardLines >= 240) throw new Error(`SchoolPortfolioCard is too large: ${cardLines}`);
    if (helperLines >= 100) throw new Error(`schoolCardReadinessViewModel is unexpectedly large: ${helperLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
    phase: 'schools-portfolio-card-presentation-boundary',
    status: failed.length === 0 ? 'PASS' : 'FAIL',
    managerLines: managerSource.split('\n').length,
    cardLines: cardSource.split('\n').length,
    helperLines: helperSource.split('\n').length,
    checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
