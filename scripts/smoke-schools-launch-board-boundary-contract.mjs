import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const managerFile = 'dashboards/admin/SchoolsManager.tsx';
const panelFile = 'dashboards/admin/SchoolsManager/SchoolLaunchBoardPanel.tsx';
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

check('manager delegates the visible launch board to a dedicated presentation child', () => {
    assert.ok(managerSource.includes("import { SchoolLaunchBoardPanel } from './SchoolsManager/SchoolLaunchBoardPanel';"));
    assert.ok(managerSource.includes('<SchoolLaunchBoardPanel'));
    assert.ok(managerSource.includes('readinessStatusLabel={readinessStatusLabel}'));
    assert.ok(managerSource.includes('commercialOperatingSteps={commercialOperatingSteps}'));
    assert.ok(managerSource.includes('expandedSchoolStep={expandedSchoolStep}'));
    assert.ok(!managerSource.includes('<section data-testid="school-ux-launch-board"'));
});

check('launch board preserves visible readiness and five-step journey presentation', () => {
    for (const fragment of [
        'data-testid="school-ux-launch-board"',
        'data-testid="school-ux-next-action"',
        'نسبة الإنجاز',
        'مسار إعداد ومتابعة المدرسة',
        'طي شريط الخطوات',
        'commercialOperatingSteps.map((step, index)',
        'data-testid={`school-ux-step-${step.id}`}',
        'step.statusLabel',
        'step.title',
        'step.metric',
    ]) {
        assert.ok(panelSource.includes(fragment), `launch board must preserve ${fragment}`);
    }
});

check('launch board keeps readiness thresholds and progress semantics intact', () => {
    assert.ok(panelSource.includes('readinessScore === readinessTotal'));
    assert.ok(panelSource.includes('readinessScore >= 3'));
    assert.ok(panelSource.includes('{readinessStatusLabel} ({readinessPercent}%)'));
    assert.ok(panelSource.includes('{readinessScore}/{readinessTotal} خطوات'));
    assert.ok(panelSource.includes('style={{ width: `${readinessPercent}%` }}'));
});

check('launch board child remains presentation-only while manager owns navigation and reset state', () => {
    for (const forbidden of [
        'useStore',
        'api.',
        'window.',
        'document.',
        'setActiveTab(',
        'setExpandedSchoolStep(',
        'setSelectedSchool(',
        'setManagementError(',
        'setManagementNotice(',
    ]) {
        assert.ok(!panelSource.includes(forbidden), `launch board presentation must not include ${forbidden}`);
    }
    assert.ok(managerSource.includes('onCollapseSteps={() => setExpandedSchoolStep(null)}'));
    assert.ok(managerSource.includes('setActiveTab(tab);'));
    assert.ok(managerSource.includes('setExpandedSchoolStep((current) => (current === tab ? null : tab));'));
    assert.ok(managerSource.includes('setSelectedSchool(null);'));
});

check('school management compatibility contract follows launch board ownership', () => {
    assert.ok(managementContractSource.includes('SchoolLaunchBoardPanel.tsx'));
    assert.ok(managementContractSource.includes('readinessStatusLabel'));
    assert.ok(managementContractSource.includes('readinessNextStep'));
});

check('launch board extraction reduces the manager hotspot without creating a replacement hotspot', () => {
    assert.ok(lineCount(panelSource) <= 150, `SchoolLaunchBoardPanel.tsx exceeded 150 lines (${lineCount(panelSource)}).`);
    assert.ok(lineCount(managerSource) <= 2725, `SchoolsManager.tsx did not shrink below 2725 lines (${lineCount(managerSource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
    phase: 'schools-launch-board-presentation-boundary',
    status: failed.length === 0 ? 'PASS' : 'FAIL',
    managerLines: lineCount(managerSource),
    panelLines: lineCount(panelSource),
    checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
