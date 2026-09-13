import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/schools/application/classroomReportInsights.ts'), 'utf8');
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/classroom/registerClassroomInsightsRoutes.ts'), 'utf8');
const routerSource = fs.readFileSync(path.join(root, 'server/src/routes/classroom.routes.ts'), 'utf8');

assert.ok(moduleSource.includes('source: "finalized_report_snapshots"'));
assert.ok(moduleSource.includes('weakSkills'));
assert.ok(moduleSource.includes('strongSkills'));
assert.ok(moduleSource.includes('participationRate'));
assert.ok(moduleSource.includes('trend'));
assert.ok(routeSource.includes('"/teacher/insights"'));
assert.ok(routeSource.includes('status: { $in: ["ended", "archived"] }'));
assert.ok(routeSource.includes('resolveSchoolEntitlement'));
assert.ok(routeSource.includes('ensureTeacherSchoolAccess'));
assert.ok(routeSource.includes('SCHOOL_SMART_CLASSROOM_VIEW'));
assert.ok(routerSource.includes('registerClassroomInsightsRoutes(classroomRouter)'));

console.log('Smart Classroom report insights contract: PASS');
