import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const managerPath = path.join(root, 'dashboards/admin/SchoolsManager.tsx');
const managementContractPath = path.join(root, 'scripts/smoke-school-management-contract.mjs');
let managerSource = fs.readFileSync(managerPath, 'utf8').replace(/\r\n/g, '\n');
let managementContractSource = fs.readFileSync(managementContractPath, 'utf8').replace(/\r\n/g, '\n');

const oldImport = "import { buildSchoolCardReadinessActions } from './SchoolsManager/schoolCardReadinessViewModel';";
const newImport = "import { SchoolPortfolioCard } from './SchoolsManager/SchoolPortfolioCard';";
const cardStartMarker = `            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSchoolRows.map((cardPortfolioRow) => {`;
const cardEndMarker = `

            {filteredSchools.length === 0 && (`;
const cardReplacement = `            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSchoolRows.map((cardPortfolioRow) => (
                    <SchoolPortfolioCard
                        key={cardPortfolioRow.school.id}
                        row={cardPortfolioRow}
                        listMode={schoolListMode}
                        actionsOpen={activeSchoolActionsId === cardPortfolioRow.school.id}
                        onToggleActions={() => toggleSchoolActions(cardPortfolioRow.school.id)}
                        onOpenTab={(tab) => {
                            setSelectedSchool(cardPortfolioRow.school);
                            setActiveTab(tab);
                        }}
                        onOpenFromMenu={(tab) => {
                            closeSchoolActions();
                            setSelectedSchool(cardPortfolioRow.school);
                            setActiveTab(tab);
                        }}
                        onReviewDelete={() => {
                            setSelectedSchool(cardPortfolioRow.school);
                            setActiveTab('overview');
                            setIsDeleteSchoolConfirmOpen(true);
                            window.setTimeout(() => {
                                document.querySelector('[data-testid="school-delete-confirm-panel"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 80);
                        }}
                    />
                ))}
            </div>`;

const managementListAnchor = `  await read("dashboards/admin/SchoolsManager/readinessViewModel.ts"),
  await read("dashboards/admin/SchoolsManager/relationshipViewModel.ts"),`;
const managementListReplacement = `  await read("dashboards/admin/SchoolsManager/readinessViewModel.ts"),
  await read("dashboards/admin/SchoolsManager/schoolCardReadinessViewModel.ts"),
  await read("dashboards/admin/SchoolsManager/SchoolPortfolioCard.tsx"),
  await read("dashboards/admin/SchoolsManager/relationshipViewModel.ts"),`;
const oldActionOwnership = `  assertIncludes(files.schools, "setActiveTab(action.tab)");`;
const newActionOwnership = `  assertIncludes(files.schools, "onOpenTab(action.tab)");`;

const alreadyApplied = managerSource.includes(newImport)
    && managerSource.includes('<SchoolPortfolioCard')
    && !managerSource.includes(oldImport)
    && managementContractSource.includes('SchoolPortfolioCard.tsx')
    && managementContractSource.includes(newActionOwnership)
    && !managementContractSource.includes(oldActionOwnership);

if (alreadyApplied) {
    console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'school-portfolio-card-presentation' }, null, 2));
    process.exit(0);
}

if (!managerSource.includes(oldImport)) throw new Error('School portfolio card import anchor not found.');
const cardStart = managerSource.indexOf(cardStartMarker);
if (cardStart < 0) throw new Error('School portfolio card rendering start anchor not found.');
const cardEnd = managerSource.indexOf(cardEndMarker, cardStart + cardStartMarker.length);
if (cardEnd < 0) throw new Error('School portfolio card rendering end anchor not found.');
if (managerSource.indexOf(cardStartMarker, cardStart + cardStartMarker.length) >= 0) {
    throw new Error('School portfolio card rendering start anchor is ambiguous.');
}
if (!managementContractSource.includes(managementListAnchor)) {
    throw new Error('School management contract ownership list anchor not found.');
}
if (!managementContractSource.includes(oldActionOwnership)) {
    throw new Error('School management contract action ownership anchor not found.');
}

managerSource = `${managerSource.slice(0, cardStart)}${cardReplacement}${managerSource.slice(cardEnd)}`;
managerSource = managerSource.replace(oldImport, newImport);
managementContractSource = managementContractSource
    .replace(managementListAnchor, managementListReplacement)
    .replace(oldActionOwnership, newActionOwnership);

fs.writeFileSync(managerPath, managerSource);
fs.writeFileSync(managementContractPath, managementContractSource);

console.log(JSON.stringify({
    status: 'APPLIED',
    phase: 'school-portfolio-card-presentation',
    files: [
        'dashboards/admin/SchoolsManager.tsx',
        'scripts/smoke-school-management-contract.mjs',
    ],
}, null, 2));
