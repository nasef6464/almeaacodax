import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const managerPath = path.join(root, 'dashboards/admin/SchoolsManager.tsx');
const managementContractPath = path.join(root, 'scripts/smoke-school-management-contract.mjs');
let managerSource = fs.readFileSync(managerPath, 'utf8').replace(/\r\n/g, '\n');
let managementContractSource = fs.readFileSync(managementContractPath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = "import { SchoolPortfolioCard } from './SchoolsManager/SchoolPortfolioCard';";
const importReplacement = `${importAnchor}\nimport { SchoolWorkspaceControlsPanel } from './SchoolsManager/SchoolWorkspaceControlsPanel';`;
const returnAnchor = `        return (\n            <div data-testid="school-workspace-shell" className="min-w-0 max-w-full space-y-6 overflow-x-hidden animate-fade-in">`;
const renameHandler = `        const openSchoolRenameModal = () => {
            setEditNameModalState({
                isOpen: true,
                title: 'اكتب اسم المدرسة الجديد',
                initialValue: selectedSchool.name,
                onSave: async (newName: string) => {
                    if (newName.trim() === selectedSchool.name) return;
                    setSchoolActionPending('rename-school');
                    setSaveVerificationState('saving');
                    setSaveVerificationMessage('جاري حفظ اسم المدرسة...');
                    setManagementError(null);
                    setManagementNotice(null);
                    try {
                        const persistedSchool = await updateGroupAsync(selectedSchool.id, { name: newName.trim() });
                        const verifiedSchool = await refreshSchoolWorkspace(persistedSchool.id);
                        setSelectedSchool(verifiedSchool);
                        setSaveVerificationState('success');
                        setSaveVerificationMessage('تم حفظ اسم المدرسة والتأكد منه من الخادم.');
                        setManagementNotice('تم حفظ اسم المدرسة بعد التحقق من الخادم.');
                    } catch (error) {
                        setSaveVerificationState('error');
                        setSaveVerificationMessage(error instanceof Error ? error.message : 'تعذر تعديل اسم المدرسة الآن.');
                        setManagementError(error instanceof Error ? error.message : 'تعذر تعديل اسم المدرسة الآن.');
                        throw error;
                    } finally {
                        setSchoolActionPending(null);
                    }
                },
            });
        };

`;
const controlsStartMarker = `                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">`;
const controlsEndMarker = `                <div data-testid="school-workspace-tabs" className="hidden">`;
const controlsReplacement = `                <SchoolWorkspaceControlsPanel
                    schoolName={selectedSchool.name}
                    saveVerificationState={saveVerificationState}
                    saveVerificationButtonLabel={saveVerificationButtonLabel}
                    isSchoolWorkspaceBusy={isSchoolWorkspaceBusy}
                    isDeleteConfirmOpen={isDeleteSchoolConfirmOpen}
                    classCount={schoolClasses.length}
                    studentCount={schoolStudents.length}
                    supervisorCount={schoolSupervisors.length}
                    packageCount={schoolPackages.length}
                    codeCount={schoolCodes.length}
                    readinessScore={readinessScore}
                    readinessTotal={readinessChecks.length}
                    isDeletePending={Boolean(schoolActionPending)}
                    onBack={() => {
                        setManagementError(null);
                        setManagementNotice(null);
                        setIsDeleteSchoolConfirmOpen(false);
                        setSelectedSchool(null);
                    }}
                    onSaveAndVerify={() => void handleSaveAndVerifySchool()}
                    onRename={openSchoolRenameModal}
                    onDownloadHandover={downloadSchoolHandover}
                    onCopyHandover={() => void copySchoolHandoverMessage()}
                    onPrintReport={printSchoolReport}
                    onRequestDelete={handleDeleteSelectedSchool}
                    onCancelDelete={() => setIsDeleteSchoolConfirmOpen(false)}
                    onConfirmDelete={confirmDeleteSelectedSchool}
                />

`;

const managementListAnchor = `  await read("dashboards/admin/SchoolsManager/SchoolPortfolioCard.tsx"),\n  await read("dashboards/admin/SchoolsManager/relationshipViewModel.ts"),`;
const managementListReplacement = `  await read("dashboards/admin/SchoolsManager/SchoolPortfolioCard.tsx"),\n  await read("dashboards/admin/SchoolsManager/SchoolWorkspaceControlsPanel.tsx"),\n  await read("dashboards/admin/SchoolsManager/relationshipViewModel.ts"),`;

const alreadyApplied = managerSource.includes("import { SchoolWorkspaceControlsPanel } from './SchoolsManager/SchoolWorkspaceControlsPanel';")
    && managerSource.includes('<SchoolWorkspaceControlsPanel')
    && managerSource.includes('const openSchoolRenameModal = () => {')
    && !managerSource.includes(controlsStartMarker)
    && managementContractSource.includes('SchoolWorkspaceControlsPanel.tsx');

if (alreadyApplied) {
    console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'school-workspace-controls-presentation' }, null, 2));
    process.exit(0);
}

if (!managerSource.includes(importAnchor)) throw new Error('School workspace controls import anchor not found.');
if (!managerSource.includes(returnAnchor)) throw new Error('School workspace return anchor not found.');
const controlsStart = managerSource.indexOf(controlsStartMarker);
if (controlsStart < 0) throw new Error('School workspace controls start anchor not found.');
const controlsEnd = managerSource.indexOf(controlsEndMarker, controlsStart + controlsStartMarker.length);
if (controlsEnd < 0) throw new Error('School workspace controls end anchor not found.');
if (managerSource.indexOf(controlsStartMarker, controlsStart + controlsStartMarker.length) >= 0) {
    throw new Error('School workspace controls start anchor is ambiguous.');
}
if (!managementContractSource.includes(managementListAnchor)) {
    throw new Error('School management contract workspace controls ownership anchor not found.');
}

managerSource = `${managerSource.slice(0, controlsStart)}${controlsReplacement}${managerSource.slice(controlsEnd)}`;
managerSource = managerSource.replace(importAnchor, importReplacement);
managerSource = managerSource.replace(returnAnchor, `${renameHandler}${returnAnchor}`);
managementContractSource = managementContractSource.replace(managementListAnchor, managementListReplacement);

fs.writeFileSync(managerPath, managerSource);
fs.writeFileSync(managementContractPath, managementContractSource);

console.log(JSON.stringify({
    status: 'APPLIED',
    phase: 'school-workspace-controls-presentation',
    files: [
        'dashboards/admin/SchoolsManager.tsx',
        'scripts/smoke-school-management-contract.mjs',
    ],
}, null, 2));
