import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/schools/application/classroomReportInsights.ts'), 'utf8');
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/classroom/registerClassroomInsightsRoutes.ts'), 'utf8');
const routerSource = fs.readFileSync(path.join(root, 'server/src/routes/classroom.routes.ts'), 'utf8');
const apiSource = fs.readFileSync(path.join(root, 'services/api.ts'), 'utf8');
const supervisorUi = fs.readFileSync(path.join(root, 'dashboards/admin/SmartClassroomReportsPanel.tsx'), 'utf8');

assert.ok(moduleSource.includes('source: "finalized_report_snapshots"'));
assert.ok(moduleSource.includes('weakSkills'));
assert.ok(moduleSource.includes('strongSkills'));
assert.ok(moduleSource.includes('participationRate'));
assert.ok(moduleSource.includes('trend'));
assert.ok(moduleSource.includes('buildClassroomSupervisorDrilldown'));
assert.ok(moduleSource.includes('summarizeClassroomReports'));
assert.ok(moduleSource.includes('schoolNames'));
assert.ok(moduleSource.includes('teacherNames'));

assert.ok(routeSource.includes('"/teacher/insights"'));
assert.ok(routeSource.includes('"/supervisor/insights"'));
assert.ok(routeSource.includes('requireRole(["admin", "supervisor"])'));
assert.ok(routeSource.includes('resolveClassroomSupervisorScope'));
assert.ok(routeSource.includes('classroomScopeFilter(scope)'));
assert.ok(routeSource.includes('supervisorPeriodSchema'));
assert.ok(routeSource.includes('"custom"'));
assert.ok(routeSource.includes('from and to are required for custom period'));
assert.ok(routeSource.includes('status: { $in: ["ended", "archived"] }'));
assert.ok(routeSource.includes('resolveSchoolEntitlement'));
assert.ok(routeSource.includes('ensureTeacherSchoolAccess'));
assert.ok(routeSource.includes('SCHOOL_SMART_CLASSROOM_VIEW'));

assert.ok(apiSource.includes('getSupervisorClassroomAnalytics'));
assert.ok(apiSource.includes('/classroom/supervisor/insights'));

assert.ok(supervisorUi.includes('آخر 30 يومًا'));
assert.ok(supervisorUi.includes('آخر 7 أيام'));
assert.ok(supervisorUi.includes('فترة مخصصة'));
assert.ok(supervisorUi.includes('المدرسة'));
assert.ok(supervisorUi.includes('المعلم'));
assert.ok(supervisorUi.includes('الفصل'));
assert.ok(supervisorUi.includes('الحصص في النطاق الحالي'));
assert.ok(supervisorUi.includes('أضعف المهارات في الفترة'));
assert.ok(supervisorUi.includes('getSupervisorClassroomAnalytics'));
assert.ok(supervisorUi.includes('getSupervisorClassroomReport'));

assert.ok(routerSource.includes('registerClassroomInsightsRoutes(classroomRouter)'));

console.log('Smart Classroom report insights contract: PASS');
