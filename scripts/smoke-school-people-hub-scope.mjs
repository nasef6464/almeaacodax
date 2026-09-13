import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../dashboards/admin/SchoolsManager/SchoolPeopleHubTab.tsx', import.meta.url), 'utf8');

assert.ok(source.includes("selectedClassId !== 'all' && item.schoolRole === 'student'"), 'class filter must apply only to students');
assert.ok(source.includes('إضافة طالب فردي'), 'student-only flow must be labelled accurately');
assert.ok(source.includes('onOpenImport'), 'legacy import remains reachable from People Hub');
assert.ok(source.includes('SchoolDirectorDelegationPanel'), 'existing server-backed director linking remains reused');

console.log('School People Hub scope contract: PASS');
