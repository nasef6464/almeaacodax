import assert from 'node:assert/strict';
import './smoke-smart-classroom-student-report.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/schools/application/classroomReportInsights.ts'), 'utf8');
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/classroom/registerClassroomInsightsRoutes.ts'), 'utf8');
const routerSource = fs.readFileSync(path.join(root, 'server/src/routes/classroom.routes.ts'), 'utf8');
const apiSource = fs.readFileSync(path.join(root, 'services/api.ts'), 'utf8');
const supervisorUi = fs.readFileSync(path.join(root, 'dashboards/admin/SmartClassroomReportsPanel.tsx'), 'utf8');
const supervisorSignalsUi = fs.readFileSync(path.join(root, 'dashboards/admin/SmartClassroomSupervisorSignals.tsx'), 'utf8');

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
assert.ok(routeSource.includes('ClassroomParticipantModel.find'));
assert.ok(routeSource.includes('ClassroomResponseModel.find'));
assert.ok(routeSource.includes('leastParticipation'));
assert.ok(routeSource.includes('mostImproved'));
assert.ok(routeSource.includes('responseRate'));
assert.ok(routeSource.includes('improvement'));
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
assert.ok(supervisorUi.includes('SmartClassroomSupervisorSignals'));
assert.ok(supervisorSignalsUi.includes('نشاط المعلمين في الفترة'));
assert.ok(supervisorSignalsUi.includes('مقارنة الفصول'));
assert.ok(supervisorSignalsUi.includes('الطلاب الأقل مشاركة'));
assert.ok(supervisorSignalsUi.includes('الأكثر تحسنًا'));

assert.ok(moduleSource.includes('classesComparison'));
const teacherInsightsUi = fs.readFileSync(path.join(root, 'components/classroom/ClassroomReportInsightsPanel.tsx'), 'utf8');
const batchCardUi = fs.readFileSync(path.join(root, 'components/classroom/ClassroomBatchSummaryCard.tsx'), 'utf8');
const skillResolverSource = fs.readFileSync(path.join(root, 'utils/classroomSkillResolver.ts'), 'utf8');
assert.ok(teacherInsightsUi.includes('مقارنة الفصول'));
assert.ok(teacherInsightsUi.includes('resolveClassroomSkillName'));
assert.ok(batchCardUi.includes('resolveClassroomSkillName'));
assert.ok(skillResolverSource.includes('export function resolveClassroomSkillName'));

assert.ok(routerSource.includes('registerClassroomInsightsRoutes(classroomRouter)'));

console.log('Smart Classroom report insights contract: PASS');

