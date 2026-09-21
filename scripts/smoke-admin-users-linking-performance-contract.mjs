import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'dashboards/admin/UsersManager.tsx'), 'utf8').replace(/\r\n/g, '\n');

const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
};

check('parent-linking candidates load only when a parent workflow needs them', () => {
  assert.ok(source.includes('const needsParentCandidates = newUser.role === Role.PARENT || editedUser?.role === Role.PARENT'));
  assert.ok(source.includes('if (!needsParentCandidates || hasLoadedStudentsForLinking || isLoadingStudentsForLinking) return;'));
});

check('student-directory fanout is bounded', () => {
  assert.ok(source.includes('const batchSize = 4;'));
  assert.ok(source.includes('for (let startPage = 2; startPage <= totalPages; startPage += batchSize)'));
  assert.ok(!source.includes('Promise.all(nextPages.map((page) => api.getAdminUsers'));
});

check('parent-linking candidates are cached for the current manager lifetime', () => {
  assert.ok(source.includes('setHasLoadedStudentsForLinking(true)'));
  assert.ok(source.includes('setAllStudentsForLinking(combined)'));
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'admin-users-parent-linking-performance',
  status: failed.length ? 'FAIL' : 'PASS',
  checks,
}, null, 2));

if (failed.length) process.exit(1);
