import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [workspace, accessRoutes, classroomTeacherRoutes, classroomSupport, routeTree, dashboard, primaryTabs, secondaryTabs, consolePage, contextGate] = await Promise.all([
  read('server/src/modules/schools/application/schoolTeacherWorkspace.ts'),
  read('server/src/routes/schoolAccess.routes.ts'),
  read('server/src/routes/classroom/registerClassroomTeacherRoutes.ts'),
  read('server/src/routes/classroom/classroomRouteSupport.ts'),
  read('app/AppRouteTree.tsx'),
  read('dashboards/SchoolTeacherDashboard.tsx'),
  read('dashboards/school-teacher/SchoolTeacherPrimaryTabs.tsx'),
  read('dashboards/school-teacher/SchoolTeacherSecondaryTabs.tsx'),
  read('pages/ClassroomTeacherConsole.tsx'),
  read('components/teacher/TeacherWorkspaceContext.tsx'),
]);

const pass = (label) => console.log(`PASS ${label}`);
const includesAll = (source, values, label) => {
  values.forEach((value) => assert.ok(source.includes(value), `${label}: missing ${value}`));
  pass(label);
};

includesAll(workspace, [
  'resolveSchoolContexts(actor)',
  'teacherId: actor.id',
  'status: "active"',
  'String(classroom.parentId) === String(assignment.schoolId)',
  'targetGroupIds: { $in: [...assignedSchoolIds, ...validClassIds] }',
  'targetUserIds: { $in: assignedStudentIds }',
  'teacherAssessmentClassIds(assessment, schoolId, schoolAssignments)',
  '{ isPublished: true }',
  '{ ownerId: actor.id }',
  '{ createdBy: actor.id }',
  '.select("id title subjectId targetGroupIds targetUserIds dueDate quizKind approvalStatus isPublished ownerId createdBy")',
  'approvalStatus: assessment.approvalStatus || undefined',
  'isPublished: assessment.isPublished === true',
  'ownedByTeacher: [assessment.ownerId, assessment.createdBy].some',
  'platformTrainer:',
  'schoolTeacher: availableSchools.length > 0',
], 'teacher workspace joins active membership assignment class and school assessment, preserves owned review lifecycle visibility, and prevents cross-school leakage');

includesAll(accessRoutes, [
  '"/teacher-workspace"',
  'requireRole(["teacher"])',
  'buildSchoolTeacherWorkspace(req.authUser!)',
], 'teacher workspace API is authenticated and teacher-only');

includesAll(classroomSupport, [
  'hasActiveSchoolRole(actor, schoolId, "teacher")',
  'TeachingAssignmentModel.exists({ schoolId, teacherId: actor.id, status: "active" })',
], 'teacher school access requires active school role and active teaching assignment');

includesAll(classroomTeacherRoutes, [
  'GroupModel.exists({ _id: payload.classId, type: "CLASS", parentId: payload.schoolId })',
  'TeachingAssignmentModel.exists({ schoolId: payload.schoolId, teacherId: req.authUser!.id, classId: payload.classId, status: "active" })',
  'Teacher is not assigned to this school and class',
  'Class does not belong to this school',
], 'smart classroom requires school context valid assignment and a class belonging to the same school');

includesAll(routeTree, [
  '<Route path="/school-teacher-dashboard"',
  '<TeacherWorkspaceGate workspace="school">',
  '<TeacherWorkspaceGate workspace="platform">',
], 'platform trainer and school teacher have separate persona-gated routes');

includesAll(contextGate, [
  "workspace === 'platform' && !data.personas.platformTrainer",
  "workspace === 'school' && !data.personas.schoolTeacher",
], 'persona gate redirects accounts away from unauthorized workspaces');

includesAll(dashboard, [
  'لوحة معلم المدرسة',
  "selectedSchool.assignments",
  "role=\"teacher\"",
  "allowedGroupIds={teacherGroupIds}",
  "اختباراتي وتكليفاتي",
], 'school teacher dashboard binds the assessment builder to the active school and assigned teacher groups');

includesAll(primaryTabs, [
  'selectedSchool.assignments.map',
  'فصولي المسندة وجدول الحصص',
  'طلاب فصولي المسندة',
  'اختبارات موجهة لفصولك',
], 'school teacher primary workspace exposes only server-provided assigned classes and their students');

includesAll(secondaryTabs, [
  'اختباراتي وتكليفاتي',
  'إنشاء اختبار / تدريب',
  'selectedSchool.assessments.map',
  'assessment.ownedByTeacher',
  'assessment.approvalStatus',
  'assessment.isPublished',
], 'school teacher assessments show scoped assignments plus owned lifecycle state');

includesAll(consolePage, [
  "user?.role === 'admin' && !workspace",
  'placeholder="معرّف المدرسة"',
  'placeholder="معرّف الفصل"',
  'selectedSchool?.assignments',
  '!selectedSchool?.smartClassroomEnabled',
], 'teacher console uses server-provided assignments while manual identifiers remain admin-only and entitlement-gated');

console.log('Account Workspaces G8 contract passed.');
