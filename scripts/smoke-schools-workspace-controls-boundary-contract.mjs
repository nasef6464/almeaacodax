import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const managerFile = 'dashboards/admin/SchoolsManager.tsx';
const panelFile = 'dashboards/admin/SchoolsManager/SchoolWorkspaceControlsPanel.tsx';
const managementContractFile = 'scripts/smoke-school-management-contract.mjs';
const managerSource = fs.readFileSync(path.join(root, managerFile), 'utf8').replace(/\r\n/g, '\n');
const panelSource = fs.readFileSync(path.join(root, panelFile), 'utf8').replace(/\r\n/g, '\n');
const managementContractSource = fs.readFileSync(path.join(root, managementContractFile), 'utf8').replace(/\r\n/g, '\n');
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

check('manager delegates workspace controls and delete confirmation to a dedicated presentation child', () => {
    assert.ok(managerSource.includes("import { SchoolWorkspaceControlsPanel } from './SchoolsManager/SchoolWorkspaceControlsPanel';"));
    assert.ok(managerSource.includes('<SchoolWorkspaceControlsPanel'));
    assert.ok(managerSource.includes('schoolName={selectedSchool.name}'));
    assert.ok(managerSource.includes('onRename={openSchoolRenameModal}'));
    assert.ok(managerSource.includes('onRequestDelete={handleDeleteSelectedSchool}'));
    assert.ok(managerSource.includes('onConfirmDelete={confirmDeleteSelectedSchool}'));
    assert.ok(!managerSource.includes('className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"'));
});

check('workspace controls child preserves the existing operator actions and delete review selectors', () => {
    for (const fragment of [
        'data-testid="school-save-verify-button"',
        'تعديل الاسم',
        'ملف تسليم المدرسة',
        'نسخ رسالة التسليم',
        'طباعة التقرير',
        'data-testid="school-delete-button"',
        'data-testid="school-delete-confirm-panel"',
        'data-testid="school-delete-cancel"',
        'data-testid="school-delete-confirm"',
        'حذف المدرسة نهائيًا',
    ]) {
        assert.ok(panelSource.includes(fragment), `workspace controls panel must preserve ${fragment}`);
    }
});

check('delete impact summary preserves all operational dimensions', () => {
    for (const fragment of [
        "['فصول', classCount]",
        "['طلاب', studentCount]",
        "['مشرفون', supervisorCount]",
        "['باقات', packageCount]",
        "['أكواد', codeCount]",
        "['جاهزية', `${readinessScore}/${readinessTotal}`]",
    ]) {
        assert.ok(panelSource.includes(fragment), `delete impact summary must preserve ${fragment}`);
    }
});

check('workspace controls child remains presentation-only while manager owns mutations and browser orchestration', () => {
    for (const forbidden of [
        'useStore',
        'api.',
        'window.',
        'document.',
        'updateGroupAsync',
        'deleteGroupAsync',
        'setSelectedSchool(',
        'setEditNameModalState(',
        'setManagementError(',
        'setManagementNotice(',
    ]) {
        assert.ok(!panelSource.includes(forbidden), `workspace controls presentation must not include ${forbidden}`);
    }
    assert.ok(managerSource.includes('const openSchoolRenameModal = () => {'));
    assert.ok(managerSource.includes('updateGroupAsync(selectedSchool.id, { name: newName.trim() })'));
    assert.ok(managerSource.includes('handleSaveAndVerifySchool'));
    assert.ok(managerSource.includes('handleDeleteSelectedSchool'));
    assert.ok(managerSource.includes('confirmDeleteSelectedSchool'));
    assert.ok(managerSource.includes('setSelectedSchool(null)'));
    assert.ok(managerSource.includes('window.confirm'));
});

check('school management compatibility contract follows workspace controls ownership', () => {
    assert.ok(managementContractSource.includes('SchoolWorkspaceControlsPanel.tsx'));
    assert.ok(managementContractSource.includes('data-testid="school-delete-button"'));
    assert.ok(managementContractSource.includes('handleDeleteSelectedSchool'));
});

check('workspace controls extraction reduces the manager hotspot without creating a new hotspot', () => {
    assert.ok(lineCount(panelSource) <= 190, `SchoolWorkspaceControlsPanel.tsx exceeded 190 lines (${lineCount(panelSource)}).`);
    assert.ok(lineCount(managerSource) <= 2810, `SchoolsManager.tsx did not shrink below 2810 lines (${lineCount(managerSource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
    phase: 'schools-workspace-controls-presentation-boundary',
    status: failed.length === 0 ? 'PASS' : 'FAIL',
    managerLines: lineCount(managerSource),
    panelLines: lineCount(panelSource),
    checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
