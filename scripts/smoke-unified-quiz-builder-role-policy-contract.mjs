import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'dashboards/admin/UnifiedQuizBuilder.tsx'), 'utf8').replace(/\r\n/g, '\n');

const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('step four label is role-aware', () => {
  assert.ok(source.includes('isAdmin ? "النشر والاستهداف" : isSupervisor ? "التوجيه للفصول والطلاب" : "التكليف لفصولي"'));
});

check('non-admin creators cannot request platform catalogue visibility', () => {
  assert.ok(source.includes('showOnPlatform: isAdmin ? showOnPlatform : false'));
  assert.ok(source.includes('{isAdmin && ('));
  assert.ok(source.includes('assessment-builder-show-on-platform'));
});

check('non-admin creators do not send platform learning placements', () => {
  assert.ok(source.includes('learningPlacements: !isAdmin || kind === "mock"'));
});

check('commercial access payload is admin-only', () => {
  assert.ok(source.includes('access: isAdmin'));
  assert.ok(source.includes('? {'));
  assert.ok(source.includes('type: accessType === "package" ? "paid" : accessType'));
  assert.ok(source.includes('({ type: "free" } as any)'));
});

check('completion action is role-aware', () => {
  assert.ok(source.includes('isAdmin ? "حفظ ونشر" : isSupervisor ? "حفظ وتوجيه" : "إرسال للمراجعة"'));
  assert.ok(source.includes('isAdmin ? "نشر الاختبار" : isSupervisor ? "تفعيل التوجيه" : "إرسال للمراجعة"'));
});

check('non-admin targeting remains mandatory', () => {
  assert.ok(source.includes('isAdmin || targetGroupIds.length > 0 || targetUserIds.length > 0'));
  assert.ok(source.includes('المجموعات المستهدفة {!isAdmin &&'));
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'teacher-supervisor-assessment-phase2', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
