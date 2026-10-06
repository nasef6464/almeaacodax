import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const managerPath = path.join(root, 'dashboards/admin/SchoolsManager.tsx');
const managementContractPath = path.join(root, 'scripts/smoke-school-management-contract.mjs');
let managerSource = fs.readFileSync(managerPath, 'utf8').replace(/\r\n/g, '\n');
let managementContractSource = fs.readFileSync(managementContractPath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = "import { SchoolWorkspaceControlsPanel } from './SchoolsManager/SchoolWorkspaceControlsPanel';";
const importReplacement = `${importAnchor}\nimport { SchoolLaunchBoardPanel } from './SchoolsManager/SchoolLaunchBoardPanel';`;
const boardStartMarker = `                <section data-testid="school-ux-launch-board" className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm p-6 space-y-6">`;
const boardEndMarker = `\n\n                <div className="flex-1 w-full flex flex-col min-h-0 relative">`;
const boardReplacement = `                <SchoolLaunchBoardPanel
                    schoolName={selectedSchool.name}
                    readinessStatusLabel={readinessStatusLabel}
                    readinessNextStep={readinessNextStep}
                    readinessScore={readinessScore}
                    readinessTotal={readinessChecks.length}
                    readinessPercent={readinessPercent}
                    commercialOperatingSteps={commercialOperatingSteps}
                    expandedSchoolStep={expandedSchoolStep}
                    onBack={() => {
                        setManagementError(null);
                        setManagementNotice(null);
                        setIsDeleteSchoolConfirmOpen(false);
                        setSelectedSchool(null);
                    }}
                    onCollapseSteps={() => setExpandedSchoolStep(null)}
                    onSelectStep={(tab) => {
                        setActiveTab(tab);
                        setExpandedSchoolStep((current) => (current === tab ? null : tab));
                    }}
                />`;

const managementListAnchor = `  await read("dashboards/admin/SchoolsManager/SchoolWorkspaceControlsPanel.tsx"),\n  await read("dashboards/admin/SchoolsManager/relationshipViewModel.ts"),`;
const managementListReplacement = `  await read("dashboards/admin/SchoolsManager/SchoolWorkspaceControlsPanel.tsx"),\n  await read("dashboards/admin/SchoolsManager/SchoolLaunchBoardPanel.tsx"),\n  await read("dashboards/admin/SchoolsManager/relationshipViewModel.ts"),`;

const alreadyApplied = managerSource.includes("import { SchoolLaunchBoardPanel } from './SchoolsManager/SchoolLaunchBoardPanel';")
    && managerSource.includes('<SchoolLaunchBoardPanel')
    && !managerSource.includes(boardStartMarker)
    && managementContractSource.includes('SchoolLaunchBoardPanel.tsx');

if (alreadyApplied) {
    console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'school-launch-board-presentation' }, null, 2));
    process.exit(0);
}

if (!managerSource.includes(importAnchor)) throw new Error('School launch board import anchor not found.');
const boardStart = managerSource.indexOf(boardStartMarker);
if (boardStart < 0) throw new Error('School launch board start anchor not found.');
const boardEnd = managerSource.indexOf(boardEndMarker, boardStart + boardStartMarker.length);
if (boardEnd < 0) throw new Error('School launch board end anchor not found.');
if (managerSource.indexOf(boardStartMarker, boardStart + boardStartMarker.length) >= 0) {
    throw new Error('School launch board start anchor is ambiguous.');
}
if (!managementContractSource.includes(managementListAnchor)) {
    throw new Error('School management contract launch board ownership anchor not found.');
}

managerSource = `${managerSource.slice(0, boardStart)}${boardReplacement}${managerSource.slice(boardEnd)}`;
managerSource = managerSource.replace(importAnchor, importReplacement);
managementContractSource = managementContractSource.replace(managementListAnchor, managementListReplacement);

fs.writeFileSync(managerPath, managerSource);
fs.writeFileSync(managementContractPath, managementContractSource);

console.log(JSON.stringify({
    status: 'APPLIED',
    phase: 'school-launch-board-presentation',
    files: [
        'dashboards/admin/SchoolsManager.tsx',
        'scripts/smoke-school-management-contract.mjs',
    ],
}, null, 2));
