import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../dashboards/admin/SchoolsManager/SchoolPeopleHubTab.tsx', import.meta.url), 'utf8');
const manager = readFileSync(new URL('../dashboards/admin/SchoolsManager.tsx', import.meta.url), 'utf8');
const assignmentPanel = readFileSync(new URL('../dashboards/admin/SchoolsManager/TeachingAssignmentPanel.tsx', import.meta.url), 'utf8');

assert.ok(source.includes("selectedClassId !== 'all' && item.schoolRole === 'student'"), 'class filter must apply only to students');
assert.ok(source.includes('إضافة طالب فردي'), 'student-only flow must be labelled accurately');
assert.ok(source.includes('onOpenImport'), 'legacy import remains reachable from People Hub');
assert.ok(source.includes('SchoolDirectorDelegationPanel'), 'existing server-backed director linking remains reused');
assert.ok(source.includes('إضافة أو ربط مستخدم'), 'People Hub must expose one clear entry point for role actions');
['director', 'supervisor', 'teacher', 'student', 'parent'].forEach((role) => {
  assert.ok(source.includes(`id: '${role}'`), `role action must remain available for ${role}`);
});
assert.ok(source.includes('onOpenPersonAction'), 'role actions must use the parent-owned existing workflow');
['school-director-delegation-panel', 'school-relations-quick-supervisor-card', 'school-teaching-assignment-panel', 'school-students-panel', 'school-relations-import-panel'].forEach((target) => {
  assert.ok(manager.includes(target), `People Hub action must route to ${target}`);
});
assert.ok(manager.includes('onAssignmentSaved={async () =>'), 'teacher assignment must reload the school workspace after save');
assert.ok(assignmentPanel.includes('await onAssignmentSaved?.()'), 'teacher assignment must await the server-backed refresh');

console.log('School People Hub scope contract: PASS');
