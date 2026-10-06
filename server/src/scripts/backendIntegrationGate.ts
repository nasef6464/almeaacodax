import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { io as connectSocket } from "socket.io-client";
import { env } from "../config/env.js";
import { UserModel } from "../models/User.js";
import { CourseModel } from "../models/Course.js";
import { CertificateModel } from "../models/Certificate.js";
import { PathModel } from "../models/Path.js";
import { GroupModel } from "../models/Group.js";
import { QuizModel } from "../models/Quiz.js";
import { QuizResultModel } from "../models/QuizResult.js";
import { QuestionModel } from "../models/Question.js";
import { SkillModel } from "../models/Skill.js";
import { SchoolContractModel } from "../models/SchoolContract.js";
import { TeachingAssignmentModel } from "../models/TeachingAssignment.js";
import { SchoolMembershipModel } from "../models/SchoolMembership.js";
import { AdminAuditLogModel } from "../models/AdminAuditLog.js";
import { AssessmentAssignmentModel } from "../modules/quizzes/infrastructure/assessmentAssignmentModel.js";
import { AssessmentAttemptModel } from "../modules/quizzes/infrastructure/assessmentAttemptModel.js";
import { AssessmentResponseModel } from "../modules/quizzes/infrastructure/assessmentResponseModel.js";
import { AssessmentResultModel } from "../modules/quizzes/infrastructure/assessmentResultModel.js";
import { AssessmentVersionModel } from "../modules/quizzes/infrastructure/assessmentVersionModel.js";
import { AssessmentMirrorAuditModel } from "../modules/quizzes/infrastructure/assessmentMirrorAuditModel.js";
import {
  reconcileAssessmentResult,
  repairAssessmentResultFromLegacy,
} from "../modules/quizzes/application/assessmentResultReconciliation.js";
import { dualWriteAssessmentSubmission } from "../modules/quizzes/application/dualWriteAssessmentSubmission.js";
import { reconcileAssessmentMirrorAudits } from "../modules/quizzes/application/assessmentMirrorReconciliation.js";
import { inventoryLegacyAssessmentResults } from "../modules/quizzes/application/assessmentLegacyBackfillInventory.js";
import { backfillHistoricalAssessmentResults } from "../modules/quizzes/application/assessmentResultOnlyBackfill.js";

type Role = "student" | "outsider" | "teacher" | "supervisor" | "classSupervisor" | "schoolAdmin" | "parent" | "admin";

type JsonResult = {
  status: number;
  body: any;
};

type CsrfContext = {
  token: string;
  cookie: string;
};

const API_BASE = `http://127.0.0.1:${env.PORT}/api`;
const RUN_MARKER = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
const COURSE_ID = `platform-v3-integration-course-${RUN_MARKER}`;
const LESSON_IDS = [`platform-v3-integration-lesson-a-${RUN_MARKER}`, `platform-v3-integration-lesson-b-${RUN_MARKER}`];
const ASSESSMENT_PATH_ID = `platform-v3-integration-path-${RUN_MARKER}`;
const ASSESSMENT_SUBJECT_ID = `platform-v3-integration-subject-${RUN_MARKER}`;
const ASSESSMENT_SECTION_ID = `platform-v3-integration-section-${RUN_MARKER}`;
const ASSESSMENT_MAIN_SKILL_ID = `platform-v3-integration-main-skill-${RUN_MARKER}`;
const ASSESSMENT_SUB_SKILL_ID = `platform-v3-integration-sub-skill-${RUN_MARKER}`;
const ASSESSMENT_QUESTION_ID = `platform-v3-integration-question-${RUN_MARKER}`;
const ASSESSMENT_QUIZ_ID = `platform-v3-integration-quiz-${RUN_MARKER}`;
const MISSING_QUESTION_QUIZ_ID = `platform-v3-integration-missing-question-quiz-${RUN_MARKER}`;
const MISSING_QUESTION_ID = `platform-v3-integration-missing-question-${RUN_MARKER}`;
const INVALID_QUESTION_QUIZ_ID = `platform-v3-integration-invalid-question-quiz-${RUN_MARKER}`;
const INVALID_QUESTION_ID = `platform-v3-integration-invalid-question-${RUN_MARKER}`;
const DUPLICATE_QUESTION_QUIZ_ID = `platform-v3-integration-duplicate-question-quiz-${RUN_MARKER}`;
const HISTORICAL_RESULT_QUIZ_ID = `platform-v3-integration-historical-result-quiz-${RUN_MARKER}`;
const MOCK_ASSESSMENT_QUESTION_ID = `platform-v3-integration-mock-question-${RUN_MARKER}`;
const MOCK_ASSESSMENT_QUIZ_ID = `platform-v3-integration-mock-quiz-${RUN_MARKER}`;
const TEACHER_QUIZ_ID = `platform-v3-integration-teacher-quiz-${RUN_MARKER}`;
const TEACHER_QUESTION_ID = `platform-v3-integration-teacher-question-${RUN_MARKER}`;
const TEACHER_COURSE_ID = `platform-v3-integration-teacher-course-${RUN_MARKER}`;
const TEACHER_DRAFT_COURSE_ID = `platform-v3-integration-teacher-draft-${RUN_MARKER}`;
const TEACHER_LESSON_ID = `platform-v3-integration-teacher-lesson-${RUN_MARKER}`;
const TEACHER_LIBRARY_ID = `platform-v3-integration-teacher-library-${RUN_MARKER}`;
const SUPERVISOR_QUIZ_ID = `platform-v3-integration-supervisor-quiz-${RUN_MARKER}`;

const credentials = new Map<Role, { email: string; password: string }>();
const tokens = new Map<Role, string>();
const userIds = new Map<Role, string>();
const groupIds = new Map<"school" | "class" | "siblingClass" | "outsideSchool", string>();
const scopeStudentIds = new Map<"assigned" | "sibling" | "outsideSchool", string>();

function pass(label: string) {
  console.log(`PASS ${label}`);
}

function expectStatus(label: string, result: JsonResult, expected: number) {
  assert.equal(result.status, expected, `${label}: expected HTTP ${expected}, got ${result.status}`);
  pass(`${label} -> ${expected}`);
}

async function jsonRequest(
  path: string,
  options: {
    method?: string;
    token?: string;
    csrf?: CsrfContext;
    body?: unknown;
  } = {},
): Promise<JsonResult> {
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }
  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
  }
  if (options.csrf) {
    headers.cookie = options.csrf.cookie;
    headers["x-csrf-token"] = options.csrf.token;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(15_000),
  });

  let body: any = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { status: response.status, body };
}

async function getCsrf(): Promise<CsrfContext> {
  const response = await fetch(`${API_BASE}/auth/csrf-token`, {
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(response.status, 200, `csrf-token: expected HTTP 200, got ${response.status}`);

  const body = (await response.json()) as any;
  assert.equal(typeof body?.csrfToken, "string", "csrf-token: response token missing");

  const setCookie = response.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";")[0] || "";
  assert.ok(cookie.startsWith("almeaa_csrf_token="), "csrf-token: CSRF cookie missing");

  pass("CSRF token and cookie issued");
  return { token: body.csrfToken, cookie };
}

async function seedIsolatedUsers() {
  const roles: Role[] = ["student", "outsider", "teacher", "supervisor", "classSupervisor", "schoolAdmin", "parent", "admin"];

  for (const role of roles) {
    const password = randomBytes(24).toString("base64url");
    const email = `platform-v3-${role}-${RUN_MARKER}@example.invalid`;
    credentials.set(role, { email, password });

    const user = await UserModel.create({
      name: `Platform V3 ${role}`,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: role === "outsider" ? "student" : role === "classSupervisor" ? "supervisor" : role === "schoolAdmin" ? "school_admin" : role,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: Date.now(),
      linkedStudentIds: [],
      enrolledCourses: [],
      completedLessons: [],
    });
    userIds.set(role, String(user._id));
  }

  const studentId = userIds.get("student");
  const parentId = userIds.get("parent");
  const adminId = userIds.get("admin");
  const teacherId = userIds.get("teacher");
  const supervisorId = userIds.get("supervisor");
  const classSupervisorId = userIds.get("classSupervisor");
  assert.ok(studentId && parentId && adminId && teacherId && supervisorId && classSupervisorId, "isolated user ids were not created");
  await UserModel.updateOne({ _id: parentId }, { $set: { linkedStudentIds: [studentId] } });

  await PathModel.create({
    _id: ASSESSMENT_PATH_ID,
    name: "Platform V3 integration assessment path",
    isActive: true,
  });

  await SkillModel.create({
    _id: ASSESSMENT_MAIN_SKILL_ID,
    id: ASSESSMENT_MAIN_SKILL_ID,
    pathId: ASSESSMENT_PATH_ID,
    subjectId: ASSESSMENT_SUBJECT_ID,
    sectionId: ASSESSMENT_SECTION_ID,
    name: "Platform V3 integration assessment skill",
    order: 1,
    subSkills: [{
      id: ASSESSMENT_SUB_SKILL_ID,
      name: "Platform V3 integration assessment subskill",
      code: "integration.1",
      order: 1,
    }],
  });

  const school = await GroupModel.create({
    name: "Platform V3 integration school",
    type: "SCHOOL",
    ownerId: adminId,
    supervisorIds: [supervisorId],
    studentIds: [studentId],
  });
  const schoolId = String(school._id);
  groupIds.set("school", schoolId);
  const schoolClass = await GroupModel.create({
    name: "Platform V3 integration class",
    type: "CLASS",
    parentId: schoolId,
    ownerId: supervisorId,
    supervisorIds: [supervisorId],
    studentIds: [studentId],
  });
  const schoolClassId = String(schoolClass._id);
  groupIds.set("class", schoolClassId);
  const siblingClass = await GroupModel.create({
    name: "Platform V3 integration sibling class",
    type: "CLASS",
    parentId: schoolId,
    ownerId: adminId,
    supervisorIds: [],
    studentIds: [],
  });
  groupIds.set("siblingClass", String(siblingClass._id));
  const outsideSchool = await GroupModel.create({
    name: "Platform V3 integration outside school",
    type: "SCHOOL",
    ownerId: adminId,
    supervisorIds: [],
    studentIds: [],
  });
  groupIds.set("outsideSchool", String(outsideSchool._id));
  const siblingStudent = await UserModel.create({
    name: "Platform V3 integration sibling student",
    email: `platform-v3-sibling-student-${RUN_MARKER}@example.invalid`,
    passwordHash: await bcrypt.hash(randomBytes(24).toString("base64url"), 10),
    role: "student",
    isActive: true,
    emailVerified: true,
    emailVerifiedAt: Date.now(),
    schoolId,
    groupIds: [String(siblingClass._id)],
    linkedStudentIds: [],
    enrolledCourses: [],
    completedLessons: [],
  });
  const outsideSchoolStudent = await UserModel.create({
    name: "Platform V3 integration outside-school student",
    email: `platform-v3-outside-school-student-${RUN_MARKER}@example.invalid`,
    passwordHash: await bcrypt.hash(randomBytes(24).toString("base64url"), 10),
    role: "student",
    isActive: true,
    emailVerified: true,
    emailVerifiedAt: Date.now(),
    schoolId: String(outsideSchool._id),
    groupIds: [],
    linkedStudentIds: [],
    enrolledCourses: [],
    completedLessons: [],
  });
  scopeStudentIds.set("assigned", studentId);
  scopeStudentIds.set("sibling", String(siblingStudent._id));
  scopeStudentIds.set("outsideSchool", String(outsideSchoolStudent._id));
  await Promise.all([
    UserModel.updateOne({ _id: studentId }, { $set: { schoolId, groupIds: [schoolClassId] } }),
    UserModel.updateOne({ _id: supervisorId }, { $set: { schoolId, groupIds: [schoolClassId] } }),
    UserModel.updateOne({ _id: classSupervisorId }, { $set: { groupIds: [schoolClassId] } }),
    GroupModel.updateOne({ _id: schoolClass._id }, { $addToSet: { supervisorIds: classSupervisorId } }),
    GroupModel.updateOne({ _id: siblingClass._id }, { $addToSet: { studentIds: String(siblingStudent._id) } }),
    UserModel.updateOne(
      { _id: teacherId },
      { $set: { managedPathIds: [ASSESSMENT_PATH_ID], managedSubjectIds: [ASSESSMENT_SUBJECT_ID] } },
    ),
  ]);

  await CourseModel.create({
    _id: COURSE_ID,
    title: "Platform V3 Integration Course",
    instructor: "CI",
    isPublished: true,
    showOnPlatform: true,
    certificateEnabled: true,
    modules: [
      {
        id: `platform-v3-integration-module-${RUN_MARKER}`,
        title: "Integration module",
        order: 1,
        lessons: LESSON_IDS.map((id, index) => ({
          id,
          title: `Integration lesson ${index + 1}`,
          order: index + 1,
        })),
      },
    ],
  });

  pass("isolated users, assessment path, and certifiable course seeded");
}

async function loginRole(role: Role, csrf: CsrfContext) {
  const credential = credentials.get(role);
  assert.ok(credential, `${role}: credentials missing in test memory`);

  const result = await jsonRequest("/auth/login", {
    method: "POST",
    csrf,
    body: credential,
  });
  expectStatus(`${role} login`, result, 200);
  const expectedRole = role === "outsider" ? "student" : role === "classSupervisor" ? "supervisor" : role === "schoolAdmin" ? "school_admin" : role;
  assert.equal(result.body?.user?.role, expectedRole, `${role}: login returned wrong role`);
  assert.equal(typeof result.body?.token, "string", `${role}: test-mode bearer token missing`);
  tokens.set(role, result.body.token);
}

async function runAdminUserManagementJourney(csrf: CsrfContext) {
  const teacherId = userIds.get("teacher");
  const adminId = userIds.get("admin");
  assert.ok(teacherId && adminId, "admin user-management fixture ids missing");

  const summary = await jsonRequest("/auth/admin/users/summary", { token: tokens.get("admin") });
  expectStatus("admin reads authoritative user summary", summary, 200);
  assert.ok(Number(summary.body?.total) >= 8, "user summary omitted isolated users");
  assert.ok(Number(summary.body?.byRole?.admin) >= 1, "user summary omitted active administrator role");

  const teacherSummary = await jsonRequest("/auth/admin/users/summary", { token: tokens.get("teacher") });
  expectStatus("teacher cannot read administrator user summary", teacherSummary, 403);

  const teacherBulk = await jsonRequest("/auth/admin/users/bulk-status", {
    method: "PATCH",
    token: tokens.get("teacher"),
    csrf,
    body: { userIds: [teacherId], isActive: false },
  });
  expectStatus("teacher cannot perform administrator bulk status command", teacherBulk, 403);

  const deactivateTeacher = await jsonRequest("/auth/admin/users/bulk-status", {
    method: "PATCH",
    token: tokens.get("admin"),
    csrf,
    body: { userIds: [teacherId, `missing-user-${RUN_MARKER}`], isActive: false },
  });
  expectStatus("admin bulk command deactivates only matching requested users", deactivateTeacher, 200);
  assert.deepEqual(
    deactivateTeacher.body?.results?.map((item: any) => item.status),
    ["updated", "not_found"],
    "bulk command did not return per-user outcomes",
  );

  const reactivateTeacher = await jsonRequest("/auth/admin/users/bulk-status", {
    method: "PATCH",
    token: tokens.get("admin"),
    csrf,
    body: { userIds: [teacherId], isActive: true },
  });
  expectStatus("admin bulk command reactivates isolated teacher", reactivateTeacher, 200);
  assert.equal(reactivateTeacher.body?.results?.[0]?.status, "updated", "bulk reactivation did not persist");

  const selfDeactivate = await jsonRequest("/auth/admin/users/bulk-status", {
    method: "PATCH",
    token: tokens.get("admin"),
    csrf,
    body: { userIds: [adminId], isActive: false },
  });
  expectStatus("admin bulk command preserves current administrator", selfDeactivate, 200);
  assert.deepEqual(
    selfDeactivate.body?.results?.[0], { userId: adminId, status: "skipped", reason: "cannot_deactivate_current_admin" }, "bulk command did not protect current administrator");

  const auditCount = await AdminAuditLogModel.countDocuments({ action: "auth.admin_user.bulk_status", actorId: adminId });
  assert.ok(auditCount >= 3, "admin bulk status operations were not audit logged");
  pass("admin user summary and safe bulk status command are RBAC-protected and audit logged");
}

async function runTrainerPerformanceJourney() {
  const teacherId = userIds.get("teacher");
  assert.ok(teacherId, "trainer performance fixture id missing");

  const ownPerformance = await jsonRequest("/auth/trainer/performance", { token: tokens.get("teacher") });
  expectStatus("trainer reads only their own performance", ownPerformance, 200);
  assert.equal(typeof ownPerformance.body?.performance?.enrolledStudents, "number", "trainer performance omitted enrollment count");
  assert.equal(typeof ownPerformance.body?.performance?.quizAttempts, "number", "trainer performance omitted quiz attempts");
  assert.equal(ownPerformance.body?.performance?.revenue?.available, false, "trainer performance invented revenue availability");

  const adminPerformance = await jsonRequest("/auth/trainer/performance", { token: tokens.get("admin") });
  expectStatus("administrator cannot impersonate trainer self-performance route", adminPerformance, 403);

  const adminProfile = await jsonRequest(`/auth/admin/trainers/${encodeURIComponent(teacherId)}`, { token: tokens.get("admin") });
  expectStatus("administrator reads trainer performance through trainer profile", adminProfile, 200);
  assert.equal(typeof adminProfile.body?.trainer?.performance?.completionRate, "object", "trainer profile omitted nullable completion metric");
  pass("trainer and administrator performance reads preserve role boundaries and financial truthfulness");
}

async function runSchoolDirectorIdentityJourney(csrf: CsrfContext) {
  const schoolId = groupIds.get("school");
  const outsideSchoolId = groupIds.get("outsideSchool");
  const directorId = userIds.get("schoolAdmin");
  assert.ok(schoolId && outsideSchoolId && directorId, "school director fixture scope missing");

  const emptyWorkspace = await jsonRequest("/school-access/director-workspace", { token: tokens.get("schoolAdmin") });
  expectStatus("unassigned school director reaches isolated workspace", emptyWorkspace, 200);
  assert.deepEqual(emptyWorkspace.body?.schools, [], "unassigned director received a school");

  const supervisorGrant = await jsonRequest(`/school-access/directors/${schoolId}/${directorId}`, {
    method: "PUT",
    token: tokens.get("supervisor"),
    csrf,
    body: { status: "active", permissions: ["SCHOOL_OVERVIEW_VIEW"] },
  });
  expectStatus("non-admin cannot grant school director permissions", supervisorGrant, 403);

  const grant = await jsonRequest(`/school-access/directors/${schoolId}/${directorId}`, {
    method: "PUT",
    token: tokens.get("admin"),
    csrf,
    body: { status: "active", permissions: ["SCHOOL_OVERVIEW_VIEW", "SCHOOL_STUDENTS_VIEW"] },
  });
  expectStatus("platform admin grants per-school director permissions", grant, 200);

  const workspace = await jsonRequest("/school-access/director-workspace", { token: tokens.get("schoolAdmin") });
  expectStatus("school director reads delegated workspace", workspace, 200);
  assert.deepEqual(workspace.body?.schools?.map((school: any) => school.schoolId), [schoolId], "director workspace leaked another school");
  assert.deepEqual(workspace.body?.schools?.[0]?.permissions?.sort(), ["SCHOOL_OVERVIEW_VIEW", "SCHOOL_STUDENTS_VIEW"].sort(), "director workspace returned wrong permissions");

  const allowed = await jsonRequest(`/school-access/director/schools/${schoolId}/overview-access`, { token: tokens.get("schoolAdmin") });
  expectStatus("school director reaches granted school", allowed, 200);
  const crossSchool = await jsonRequest(`/school-access/director/schools/${outsideSchoolId}/overview-access`, { token: tokens.get("schoolAdmin") });
  expectStatus("school director cannot cross into another school", crossSchool, 403);

  const removePermission = await jsonRequest(`/school-access/directors/${schoolId}/${directorId}`, {
    method: "PUT",
    token: tokens.get("admin"),
    csrf,
    body: { status: "active", permissions: ["SCHOOL_STUDENTS_VIEW"] },
  });
  expectStatus("platform admin removes one director permission", removePermission, 200);
  const immediatelyDenied = await jsonRequest(`/school-access/director/schools/${schoolId}/overview-access`, { token: tokens.get("schoolAdmin") });
  expectStatus("revoked director permission is denied immediately", immediatelyDenied, 403);

  const deactivate = await jsonRequest(`/school-access/directors/${schoolId}/${directorId}`, {
    method: "PUT",
    token: tokens.get("admin"),
    csrf,
    body: { status: "inactive", permissions: ["SCHOOL_OVERVIEW_VIEW"] },
  });
  expectStatus("platform admin deactivates school membership", deactivate, 200);
  const inactiveDenied = await jsonRequest(`/school-access/director/schools/${schoolId}/overview-access`, { token: tokens.get("schoolAdmin") });
  expectStatus("inactive school director membership is denied", inactiveDenied, 403);

  const auditCount = await AdminAuditLogModel.countDocuments({
    action: { $in: ["schools.director_access.grant", "schools.director_access.revoke"] },
    "metadata.schoolId": schoolId,
    "metadata.userId": directorId,
  });
  assert.ok(auditCount >= 3, "school director permission changes were not audit logged");
  pass("school director grants and revocation are audit logged");
}

async function runSchoolDirectorDashboardJourney(csrf: CsrfContext) {
  const schoolId = groupIds.get("school");
  const classId = groupIds.get("class");
  const siblingClassId = groupIds.get("siblingClass");
  const outsideSchoolId = groupIds.get("outsideSchool");
  const outsideStudentId = scopeStudentIds.get("outsideSchool");
  const directorId = userIds.get("schoolAdmin");
  assert.ok(schoolId && classId && siblingClassId && outsideSchoolId && outsideStudentId && directorId, "school director dashboard fixture scope missing");
  const permissions = ["SCHOOL_OVERVIEW_VIEW", "SCHOOL_REPORTS_AGGREGATE_VIEW", "SCHOOL_STUDENTS_VIEW", "SCHOOL_STUDENTS_ADD", "SCHOOL_STUDENTS_MOVE_CLASS"];
  const grant = await jsonRequest(`/school-access/directors/${schoolId}/${directorId}`, { method: "PUT", token: tokens.get("admin"), csrf, body: { status: "active", permissions } });
  expectStatus("platform admin authorizes usable director dashboard", grant, 200);

  const selfGrant = await jsonRequest(`/school-access/directors/${outsideSchoolId}/${directorId}`, { method: "PUT", token: tokens.get("schoolAdmin"), csrf, body: { status: "active", permissions } });
  expectStatus("school director cannot grant self another school", selfGrant, 403);
  const overview = await jsonRequest(`/school-access/director/schools/${schoolId}/overview`, { token: tokens.get("schoolAdmin") });
  expectStatus("school director reads aggregate school overview", overview, 200);
  assert.equal(overview.body?.school?.schoolId, schoolId, "director overview returned wrong school");
  assert.ok(Number(overview.body?.metrics?.students) >= 1, "director overview omitted students");
  assert.equal(overview.body?.classes?.some((classroom: any) => classroom.classId === siblingClassId), true, "director overview omitted school class selector");

  const before = await jsonRequest(`/school-access/director/schools/${schoolId}/students`, { token: tokens.get("schoolAdmin") });
  expectStatus("school director reads only school student roster", before, 200);
  assert.equal(before.body?.students?.some((student: any) => student.studentId === outsideStudentId), false, "director roster leaked another school student");

  const studentEmail = `director-added-${RUN_MARKER}@example.invalid`;
  const studentPayload = { name: "Director Added Student", email: studentEmail, password: `Temp${randomBytes(8).toString("hex")}9`, classId };
  const created = await jsonRequest(`/school-access/director/schools/${schoolId}/students`, { method: "POST", token: tokens.get("schoolAdmin"), csrf, body: studentPayload });
  expectStatus("school director creates student inside granted school", created, 201);
  const studentId = String(created.body?.student?.studentId || "");
  assert.ok(studentId, "director-created student id missing");
  const persistedMembership = await SchoolMembershipModel.findOne({ userId: studentId, schoolId, role: "student", status: "active" }).lean();
  assert.ok(persistedMembership, "director-created student membership was not persisted");

  const repeatedAdd = await jsonRequest(`/school-access/director/schools/${schoolId}/students`, { method: "POST", token: tokens.get("schoolAdmin"), csrf, body: studentPayload });
  expectStatus("repeated director student add is idempotent", repeatedAdd, 200);
  assert.equal(repeatedAdd.body?.created, false, "repeated student add created a duplicate account");
  assert.equal(await UserModel.countDocuments({ email: studentEmail }), 1, "repeated student add duplicated database user");

  const wrongClass = await jsonRequest(`/school-access/director/schools/${schoolId}/students`, { method: "POST", token: tokens.get("schoolAdmin"), csrf, body: { ...studentPayload, email: `wrong-class-${RUN_MARKER}@example.invalid`, classId: outsideSchoolId } });
  expectStatus("school director cannot add student to class outside school", wrongClass, 400);
  const crossSchoolAdd = await jsonRequest(`/school-access/director/schools/${outsideSchoolId}/students`, { method: "POST", token: tokens.get("schoolAdmin"), csrf, body: { ...studentPayload, email: `cross-school-${RUN_MARKER}@example.invalid` } });
  expectStatus("school director cannot add student to ungranted school", crossSchoolAdd, 403);

  const moved = await jsonRequest(`/school-access/director/schools/${schoolId}/students/${studentId}/class`, { method: "PUT", token: tokens.get("schoolAdmin"), csrf, body: { classId: siblingClassId } });
  expectStatus("school director moves student within same school", moved, 200);
  assert.equal(moved.body?.student?.classId, siblingClassId, "student move did not persist destination class");
  assert.equal(moved.body?.idempotent, false, "first student move was incorrectly idempotent");
  const repeatedMove = await jsonRequest(`/school-access/director/schools/${schoolId}/students/${studentId}/class`, { method: "PUT", token: tokens.get("schoolAdmin"), csrf, body: { classId: siblingClassId } });
  expectStatus("repeated same-class move is idempotent", repeatedMove, 200);
  assert.equal(repeatedMove.body?.idempotent, true, "repeated same-class move was not marked idempotent");
  const classMembershipCount = await GroupModel.countDocuments({ type: "CLASS", parentId: schoolId, studentIds: studentId });
  assert.equal(classMembershipCount, 1, "student remained in multiple classes after move");

  const outsideStudentMove = await jsonRequest(`/school-access/director/schools/${schoolId}/students/${outsideStudentId}/class`, { method: "PUT", token: tokens.get("schoolAdmin"), csrf, body: { classId } });
  expectStatus("school director cannot move another school student", outsideStudentMove, 404);
  const deleteAttempt = await jsonRequest(`/school-access/director/schools/${schoolId}/students/${studentId}`, { method: "DELETE", token: tokens.get("schoolAdmin"), csrf });
  expectStatus("school director has no student delete endpoint", deleteAttempt, 404);

  const auditCount = await AdminAuditLogModel.countDocuments({ actorId: directorId, action: { $in: ["schools.director.student.add", "schools.director.student.move_class"] }, "metadata.schoolId": schoolId });
  assert.ok(auditCount >= 4, "director student operations were not audit logged");
  pass("school director add and idempotent move operations are audit logged");
}

async function runSchoolDirectorDelegatedOperationsJourney(csrf: CsrfContext) {
  const schoolId = groupIds.get("school");
  const classId = groupIds.get("class");
  const outsideSchoolId = groupIds.get("outsideSchool");
  const studentId = scopeStudentIds.get("assigned");
  const outsideStudentId = scopeStudentIds.get("outsideSchool");
  const teacherId = userIds.get("teacher");
  const directorId = userIds.get("schoolAdmin");
  assert.ok(schoolId && classId && outsideSchoolId && studentId && outsideStudentId && teacherId && directorId, "delegated school operations fixtures missing");
  const permissions = [
    "SCHOOL_OVERVIEW_VIEW", "SCHOOL_REPORTS_AGGREGATE_VIEW", "SCHOOL_STUDENTS_VIEW", "SCHOOL_STUDENTS_ADD", "SCHOOL_STUDENTS_MOVE_CLASS",
    "SCHOOL_STUDENTS_UPDATE_BASIC", "SCHOOL_STUDENTS_DEACTIVATE", "SCHOOL_CLASSES_MANAGE", "SCHOOL_TEACHERS_ASSIGN", "SCHOOL_REPORTS_DETAILED_VIEW", "SCHOOL_REPORTS_EXPORT",
  ];
  const grant = await jsonRequest(`/school-access/directors/${schoolId}/${directorId}`, { method: "PUT", token: tokens.get("admin"), csrf, body: { status: "active", permissions } });
  expectStatus("platform admin grants delegated school operations", grant, 200);

  const workspaceBeforeExport = await jsonRequest("/school-access/director-workspace", { token: tokens.get("schoolAdmin") });
  expectStatus("director workspace exposes effective contract modules", workspaceBeforeExport, 200);
  assert.equal(workspaceBeforeExport.body?.schools?.[0]?.modules?.includes("SCHOOL_CORE"), true, "director workspace omitted active core module");
  assert.equal(workspaceBeforeExport.body?.schools?.[0]?.modules?.includes("EXECUTIVE_ANALYTICS"), false, "director workspace exposed inactive export module");

  const updated = await jsonRequest(`/school-access/director/schools/${schoolId}/students/${studentId}`, { method: "PATCH", token: tokens.get("schoolAdmin"), csrf, body: { name: "Director Updated Student", phone: "0500000000" } });
  expectStatus("director updates bounded student basic fields", updated, 200);
  assert.equal(updated.body?.student?.phone, "0500000000", "student basic update was not persisted");
  const outsideUpdate = await jsonRequest(`/school-access/director/schools/${schoolId}/students/${outsideStudentId}`, { method: "PATCH", token: tokens.get("schoolAdmin"), csrf, body: { name: "Forbidden" } });
  expectStatus("director cannot update another school student", outsideUpdate, 404);

  const deactivated = await jsonRequest(`/school-access/director/schools/${schoolId}/students/${studentId}/active`, { method: "PATCH", token: tokens.get("schoolAdmin"), csrf, body: { isActive: false } });
  expectStatus("director deactivates student without delete", deactivated, 200);
  assert.equal(await UserModel.exists({ _id: studentId, isActive: false }).then(Boolean), true, "student deactivation was not persisted");
  const reactivated = await jsonRequest(`/school-access/director/schools/${schoolId}/students/${studentId}/active`, { method: "PATCH", token: tokens.get("schoolAdmin"), csrf, body: { isActive: true } });
  expectStatus("director reactivates student", reactivated, 200);

  const createdClass = await jsonRequest(`/school-access/director/schools/${schoolId}/classes`, { method: "POST", token: tokens.get("schoolAdmin"), csrf, body: { name: `Director Class ${RUN_MARKER}` } });
  expectStatus("director creates class in granted school", createdClass, 201);
  const createdClassId = String(createdClass.body?.classroom?.classId || "");
  const renamedClass = await jsonRequest(`/school-access/director/schools/${schoolId}/classes/${createdClassId}`, { method: "PATCH", token: tokens.get("schoolAdmin"), csrf, body: { name: `Director Renamed Class ${RUN_MARKER}` } });
  expectStatus("director renames class in granted school", renamedClass, 200);
  const outsideClass = await jsonRequest(`/school-access/director/schools/${schoolId}/classes/${outsideSchoolId}`, { method: "PATCH", token: tokens.get("schoolAdmin"), csrf, body: { name: "Forbidden" } });
  expectStatus("director cannot rename object outside school classes", outsideClass, 404);

  const teachers = await jsonRequest(`/school-access/director/schools/${schoolId}/teachers`, { token: tokens.get("schoolAdmin") });
  expectStatus("director lists only active school teachers for assignment", teachers, 200);
  assert.equal(teachers.body?.teachers?.some((teacher: any) => teacher.teacherId === teacherId), true, "school teacher missing from assignment picker");
  const assignment = await jsonRequest(`/school-access/director/schools/${schoolId}/assignments`, { method: "PUT", token: tokens.get("schoolAdmin"), csrf, body: { teacherId, classId: createdClassId, subjectId: ASSESSMENT_SUBJECT_ID, status: "active" } });
  expectStatus("director assigns school teacher to school class", assignment, 200);
  const crossSchoolAssignment = await jsonRequest(`/school-access/director/schools/${outsideSchoolId}/assignments`, { method: "PUT", token: tokens.get("schoolAdmin"), csrf, body: { teacherId, classId, subjectId: ASSESSMENT_SUBJECT_ID, status: "active" } });
  expectStatus("director cannot assign through ungranted school", crossSchoolAssignment, 403);

  const detailed = await jsonRequest(`/school-access/director/schools/${schoolId}/reports/detailed`, { token: tokens.get("schoolAdmin") });
  expectStatus("director reads school-bounded detailed intelligence", detailed, 200);
  assert.equal(detailed.body?.school?.schoolId, schoolId, "detailed report returned wrong school");
  const exportWithoutModule = await jsonRequest(`/school-access/director/schools/${schoolId}/reports/students.csv`, { token: tokens.get("schoolAdmin") });
  expectStatus("export permission alone cannot bypass contract module", exportWithoutModule, 403);
  await SchoolContractModel.updateOne({ schoolId }, { $addToSet: { modules: "EXECUTIVE_ANALYTICS" } });
  const exported = await jsonRequest(`/school-access/director/schools/${schoolId}/reports/students.csv`, { token: tokens.get("schoolAdmin") });
  expectStatus("director exports bounded school roster when dual gate passes", exported, 200);
  assert.match(String(exported.body || ""), /Director Updated Student/, "school export omitted scoped student");
  assert.doesNotMatch(String(exported.body || ""), /outside-school-student/, "school export leaked outside student");

  const revokedPermissions = permissions.filter((permission) => permission !== "SCHOOL_CLASSES_MANAGE");
  const revoke = await jsonRequest(`/school-access/directors/${schoolId}/${directorId}`, { method: "PUT", token: tokens.get("admin"), csrf, body: { status: "active", permissions: revokedPermissions } });
  expectStatus("platform admin revokes one delegated capability", revoke, 200);
  const classAfterRevoke = await jsonRequest(`/school-access/director/schools/${schoolId}/classes`, { method: "POST", token: tokens.get("schoolAdmin"), csrf, body: { name: `Denied Class ${RUN_MARKER}` } });
  expectStatus("revoked class capability fails immediately", classAfterRevoke, 403);
  await SchoolContractModel.updateOne({ schoolId }, { $pull: { modules: "SCHOOL_INTELLIGENCE" } });
  const reportAfterContractRevoke = await jsonRequest(`/school-access/director/schools/${schoolId}/reports/detailed`, { token: tokens.get("schoolAdmin") });
  expectStatus("disabled contract module fails detailed report immediately", reportAfterContractRevoke, 403);
  await SchoolContractModel.updateOne({ schoolId }, { $addToSet: { modules: "SCHOOL_INTELLIGENCE" } });

  const auditCount = await AdminAuditLogModel.countDocuments({ actorId: directorId, action: { $in: ["schools.director.student.update_basic", "schools.director.student.deactivate", "schools.director.student.reactivate", "schools.director.class.create", "schools.director.class.update", "schools.director.teacher.assign"] }, "metadata.schoolId": schoolId });
  assert.ok(auditCount >= 6, "delegated school mutations were not audit logged");
  assert.equal(await AdminAuditLogModel.countDocuments({ actorId: directorId, action: "schools.director.report.export_students", "metadata.schoolId": schoolId }), 1, "school roster export was not audit logged");
  pass("delegated school operations enforce permission plus contract entitlement");
}

async function runSchoolDirectorAcademicClosureJourney(csrf: CsrfContext) {
  const schoolId = groupIds.get("school"); const classId = groupIds.get("class"); const outsideSchoolId = groupIds.get("outsideSchool"); const directorId = userIds.get("schoolAdmin");
  assert.ok(schoolId && classId && outsideSchoolId && directorId, "academic closure fixtures missing");
  const academicPermissions = ["SCHOOL_OVERVIEW_VIEW", "SCHOOL_STUDENTS_VIEW", "SCHOOL_ASSESSMENTS_MANAGE", "SCHOOL_SMART_CLASSROOM_VIEW", "SCHOOL_INTERVENTIONS_VIEW", "SCHOOL_INTERVENTIONS_MANAGE", "SCHOOL_STUDENTS_TRANSFER_SCHOOL"];
  await SchoolContractModel.updateOne({ schoolId }, { $addToSet: { modules: { $each: ["SCHOOL_ASSESSMENTS", "INTERVENTION_CENTER", "SMART_CLASSROOM"] } } });
  const grantSource = await jsonRequest(`/school-access/directors/${schoolId}/${directorId}`, { method: "PUT", token: tokens.get("admin"), csrf, body: { status: "active", permissions: academicPermissions } });
  expectStatus("admin grants academic director capabilities", grantSource, 200);
  const questionId = `platform-v3-smart-classroom-question-${RUN_MARKER}`;
  const assessment = await jsonRequest(`/school-access/director/schools/${schoolId}/academic/assessments`, { method: "POST", token: tokens.get("schoolAdmin"), csrf, body: { title: "Director School Assessment", classId, pathId: ASSESSMENT_PATH_ID, subjectId: ASSESSMENT_SUBJECT_ID, questionIds: [questionId] } });
  expectStatus("director creates school assessment from approved bank", assessment, 201);
  const assessments = await jsonRequest(`/school-access/director/schools/${schoolId}/academic/assessments`, { token: tokens.get("schoolAdmin") });
  expectStatus("director lists school-bounded assessments", assessments, 200);
  assert.equal(assessments.body?.assessments?.some((item: any) => String(item.title) === "Director School Assessment"), true, "created school assessment missing");
  const smart = await jsonRequest(`/school-access/director/schools/${schoolId}/academic/smart-classrooms`, { token: tokens.get("schoolAdmin") });
  expectStatus("director views school smart classroom history", smart, 200);
  assert.equal(smart.body?.sessions?.every((item: any) => String(item.schoolId) === schoolId), true, "smart classroom view leaked another school");
  const studentId = scopeStudentIds.get("assigned"); assert.ok(studentId, "intervention student missing");
  const intervention = await jsonRequest(`/school-access/director/schools/${schoolId}/academic/interventions`, { method: "POST", token: tokens.get("schoolAdmin"), csrf, body: { classId, studentId, skillId: "platform-v3-smart-classroom-skill", pathId: ASSESSMENT_PATH_ID } });
  expectStatus("director creates existing-engine intervention", intervention, 201);
  const interventions = await jsonRequest(`/school-access/director/schools/${schoolId}/academic/interventions`, { token: tokens.get("schoolAdmin") });
  expectStatus("director lists school-bounded interventions", interventions, 200);

  const transferStudent = await UserModel.findOne({ email: `director-added-${RUN_MARKER}@example.invalid` }).select("_id id").lean();
  assert.ok(transferStudent, "G10 transfer fixture missing");
  const targetClass = await GroupModel.create({ name: "Academic transfer target", type: "CLASS", parentId: outsideSchoolId, ownerId: userIds.get("admin"), studentIds: [] });
  const deniedTransfer = await jsonRequest(`/school-access/director/schools/${schoolId}/students/${String((transferStudent as any).id || transferStudent._id)}/transfer`, { method: "POST", token: tokens.get("schoolAdmin"), csrf, body: { targetSchoolId: outsideSchoolId, targetClassId: String(targetClass._id), confirmation: "TRANSFER" } });
  expectStatus("school transfer denied without active target membership", deniedTransfer, 403);
  const grantTarget = await jsonRequest(`/school-access/directors/${outsideSchoolId}/${directorId}`, { method: "PUT", token: tokens.get("admin"), csrf, body: { status: "active", permissions: ["SCHOOL_STUDENTS_TRANSFER_SCHOOL"] } });
  expectStatus("admin grants transfer permission in target school", grantTarget, 200);
  const targetClasses = await jsonRequest(`/school-access/director/schools/${outsideSchoolId}/transfer-target-classes`, { token: tokens.get("schoolAdmin") });
  expectStatus("transfer target classes use transfer capability without overview access", targetClasses, 200);
  const transferred = await jsonRequest(`/school-access/director/schools/${schoolId}/students/${String((transferStudent as any).id || transferStudent._id)}/transfer`, { method: "POST", token: tokens.get("schoolAdmin"), csrf, body: { targetSchoolId: outsideSchoolId, targetClassId: String(targetClass._id), confirmation: "TRANSFER" } });
  expectStatus("director transfers student with two active school grants", transferred, 200);
  assert.ok(await UserModel.exists({ _id: transferStudent._id, schoolId: outsideSchoolId, groupIds: String(targetClass._id) }), "transferred student persistence missing");
  assert.ok(await SchoolMembershipModel.exists({ userId: String((transferStudent as any).id || transferStudent._id), schoolId: outsideSchoolId, role: "student", status: "active" }), "target student membership missing");

  await SchoolContractModel.updateOne({ schoolId }, { $pull: { modules: "SCHOOL_ASSESSMENTS" } });
  const assessmentAfterModuleRevoke = await jsonRequest(`/school-access/director/schools/${schoolId}/academic/assessments`, { token: tokens.get("schoolAdmin") });
  expectStatus("academic permission cannot bypass revoked assessment module", assessmentAfterModuleRevoke, 403);
  const adminUsers = await jsonRequest("/auth/admin/users?role=school_admin&limit=20", { token: tokens.get("admin") });
  expectStatus("admin user export source includes explicit school contexts", adminUsers, 200);
  const directorRow = adminUsers.body?.users?.find((item: any) => String(item.id || item._id) === directorId);
  assert.ok(directorRow?.schoolContexts?.some((context: any) => context.schoolId === schoolId && context.role === "school_admin"), "director export context missing");
  const hybrid = await jsonRequest("/school-access/teacher-workspace", { token: tokens.get("teacher") });
  expectStatus("hybrid teacher retains separate platform and school personas", hybrid, 200);
  assert.deepEqual(hybrid.body?.personas, { platformTrainer: true, schoolTeacher: true }, "hybrid teacher personas blended or missing");
  assert.ok(await AdminAuditLogModel.exists({ actorId: directorId, action: "schools.director.student.transfer_school" }), "school transfer audit missing");
  pass("academic delegation and persona closure preserve separated school contexts");
}

async function runSmartClassroomJourney(csrf: CsrfContext) {
  const schoolId = groupIds.get("school");
  const classId = groupIds.get("class");
  const teacherId = userIds.get("teacher");
  const studentId = scopeStudentIds.get("assigned");
  assert.ok(schoolId && classId && teacherId && studentId, "smart classroom fixture scope missing");
  const questionId = `platform-v3-smart-classroom-question-${RUN_MARKER}`;
  await SchoolContractModel.create({ schoolId, status: "active", modules: ["SCHOOL_CORE", "SMART_CLASSROOM", "SCHOOL_INTELLIGENCE", "INTERVENTION_CENTER"] });
  await SchoolMembershipModel.create({ userId: teacherId, schoolId, role: "teacher", status: "active" });
  await TeachingAssignmentModel.create({ schoolId, teacherId, classId, subjectId: ASSESSMENT_SUBJECT_ID, status: "active" });
  await QuestionModel.create({ id: questionId, text: "Smart classroom question", options: ["Wrong", "Correct"], correctOptionIndex: 1, subject: ASSESSMENT_SUBJECT_ID, type: "mcq", approvalStatus: "approved", skillIds: ["platform-v3-smart-classroom-skill"] });

  const outsideSchoolId = groupIds.get("outsideSchool");
  assert.ok(outsideSchoolId, "outside school fixture missing");
  await SchoolMembershipModel.create({ userId: teacherId, schoolId: outsideSchoolId, role: "teacher", status: "active" });
  await TeachingAssignmentModel.create({ schoolId: outsideSchoolId, teacherId, classId, subjectId: ASSESSMENT_SUBJECT_ID, status: "active" });
  await SchoolContractModel.create({ schoolId: outsideSchoolId, status: "active", modules: ["SCHOOL_CORE", "SMART_CLASSROOM"] });
  const workspaceAssessmentId = `school-teacher-assessment-${RUN_MARKER}`;
  await QuizModel.create({ _id: workspaceAssessmentId, id: workspaceAssessmentId, title: "Assigned school assessment", pathId: ASSESSMENT_PATH_ID, subjectId: ASSESSMENT_SUBJECT_ID, targetGroupIds: [classId], isPublished: true, approvalStatus: "approved" });
  const teacherWorkspace = await jsonRequest("/school-access/teacher-workspace", { token: tokens.get("teacher") });
  expectStatus("school teacher reads assigned workspace", teacherWorkspace, 200);
  assert.equal(teacherWorkspace.body?.personas?.platformTrainer, true, "hybrid teacher lost platform trainer context");
  assert.equal(teacherWorkspace.body?.personas?.schoolTeacher, true, "assigned teacher lost school context");
  assert.deepEqual(teacherWorkspace.body?.schools?.map((entry: any) => entry.schoolId), [schoolId], "teacher workspace leaked a school without a valid class assignment");
  assert.equal(teacherWorkspace.body?.schools?.[0]?.assignments?.[0]?.classId, classId, "teacher workspace omitted assigned class");
  assert.equal(teacherWorkspace.body?.schools?.[0]?.assignments?.[0]?.studentCount, 1, "teacher workspace omitted the assigned class roster count");
  assert.deepEqual(teacherWorkspace.body?.schools?.[0]?.assignments?.[0]?.students?.map((student: any) => student.studentId), [studentId], "teacher workspace roster leaked or omitted students outside the assigned class");
  assert.equal(teacherWorkspace.body?.schools?.[0]?.assessments?.[0]?.assessmentId, workspaceAssessmentId, "teacher workspace omitted assigned school assessment");
  const crossSchoolClass = await jsonRequest("/classroom/sessions", { method: "POST", token: tokens.get("teacher"), csrf, body: { schoolId: outsideSchoolId, classId, questionIds: [questionId] } });
  expectStatus("school teacher cannot pair another school with assigned class", crossSchoolClass, 400);

  const created = await jsonRequest("/classroom/sessions", { method: "POST", token: tokens.get("teacher"), csrf, body: { schoolId, classId, questionIds: [questionId], autoStart: true } });
  expectStatus("assigned teacher creates smart classroom session", created, 201);
  const sessionId = String(created.body?.sessionId || ""); const pin = String(created.body?.pin || "");
  assert.ok(sessionId && /^\d{6}$/.test(pin), "smart classroom session did not issue ephemeral PIN");

  const outsiderJoin = await jsonRequest(`/classroom/sessions/${sessionId}/join`, { method: "POST", token: tokens.get("outsider"), csrf, body: { pin } });
  expectStatus("other school student cannot join smart classroom", outsiderJoin, 403);
  const joined = await jsonRequest(`/classroom/sessions/${sessionId}/join`, { method: "POST", token: tokens.get("student"), csrf, body: { pin } });
  expectStatus("assigned student joins smart classroom", joined, 200);
  const socket = connectSocket(API_BASE.replace(/\/api$/, ""), { auth: { token: tokens.get("student") }, transports: ["websocket"], reconnectionDelay: 25, reconnectionDelayMax: 100 });
  try {
    await once(socket, "connect");
    await joinClassroomRoom(socket, sessionId);
    const publishedEvent = once(socket, "question:published");
    const published = await jsonRequest(`/classroom/sessions/${sessionId}/publish/0`, { method: "POST", token: tokens.get("teacher"), csrf });
    expectStatus("teacher publishes smart classroom question", published, 200);
    await publishedEvent;
    socket.io.engine?.close();
    await once(socket.io, "reconnect");
    await joinClassroomRoom(socket, sessionId);
    pass("student socket reconnects and rejoins authorized classroom room");
  } finally { socket.disconnect(); }
  const current = await jsonRequest(`/classroom/sessions/${sessionId}/current`, { token: tokens.get("student") });
  expectStatus("joined student reads safe live question", current, 200);
  assert.equal(current.body?.question?.correctOptionIndex, undefined, "student live question leaked answer key");
  const invalidAnswer = await jsonRequest(`/classroom/sessions/${sessionId}/answers/${questionId}`, { method: "PUT", token: tokens.get("student"), csrf, body: { selectedOptionIndex: 2 } });
  expectStatus("invalid smart classroom answer option is rejected", invalidAnswer, 400);
  const answer = await jsonRequest(`/classroom/sessions/${sessionId}/answers/${questionId}`, { method: "PUT", token: tokens.get("student"), csrf, body: { selectedOptionIndex: 1 } });
  expectStatus("student submits smart classroom answer", answer, 200);
  const repeated = await jsonRequest(`/classroom/sessions/${sessionId}/answers/${questionId}`, { method: "PUT", token: tokens.get("student"), csrf, body: { selectedOptionIndex: 1 } });
  expectStatus("smart classroom answer is idempotent", repeated, 200);
  assert.equal(repeated.body?.responseId, answer.body?.responseId, "repeated smart classroom answer created a second response");
  const ended = await jsonRequest(`/classroom/sessions/${sessionId}/end`, { method: "POST", token: tokens.get("teacher"), csrf });
  expectStatus("teacher ends smart classroom session", ended, 200);
  assert.equal(ended.body?.report?.totals?.responses, 1, "smart classroom immutable report has wrong response count");
  const schoolSupervisorHistory = await jsonRequest("/classroom/supervisor/history", { token: tokens.get("supervisor") });
  expectStatus("school supervisor reads in-scope classroom history", schoolSupervisorHistory, 200);
  assert.equal(schoolSupervisorHistory.body?.sessions?.some((report: any) => report.sessionId === sessionId), true, "school supervisor history omitted in-scope session");
  const schoolSupervisorTeachers = await jsonRequest("/classroom/supervisor/teachers", { token: tokens.get("supervisor") });
  expectStatus("school supervisor reads in-scope teacher classroom summary", schoolSupervisorTeachers, 200);
  assert.equal(schoolSupervisorTeachers.body?.teachers?.some((report: any) => report.teacherId === teacherId && report.sessions === 1), true, "teacher classroom summary omitted in-scope teacher");
  const classSupervisorReport = await jsonRequest(`/classroom/supervisor/sessions/${sessionId}/report`, { token: tokens.get("classSupervisor") });
  expectStatus("class supervisor reads assigned-class classroom report", classSupervisorReport, 200);
  assert.equal(classSupervisorReport.body?.report?.roster?.joined, 1, "classroom report lost joined roster count");
  const studentHistory = await jsonRequest("/classroom/supervisor/history", { token: tokens.get("student") });
  expectStatus("student cannot read supervisor classroom history", studentHistory, 403);
  const afterEnd = await jsonRequest(`/classroom/sessions/${sessionId}/answers/${questionId}`, { method: "PUT", token: tokens.get("student"), csrf, body: { selectedOptionIndex: 1 } });
  expectStatus("ended smart classroom rejects further answers", afterEnd, 404);
}

function once(target: any, event: string) {
  return new Promise<any[]>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for socket ${event}`)), 10_000);
    target.once(event, (...args: any[]) => { clearTimeout(timer); resolve(args); });
  });
}

function joinClassroomRoom(socket: { emit: (event: string, workspace: string, acknowledge: (result: { ok: boolean; error?: string }) => void) => void }, sessionId: string) {
  return new Promise<void>((resolve, reject) => socket.emit("workspace:join", `classroom:${sessionId}`, (result) => result.ok ? resolve() : reject(new Error(result.error || "Classroom room join failed"))));
}

async function runAssessmentJourney(csrf: CsrfContext) {
  const studentId = userIds.get("student");
  assert.ok(studentId, "target student id missing");

  const question = await jsonRequest("/quizzes/questions", {
    method: "POST",
    token: tokens.get("admin"),
    csrf,
    body: {
      id: ASSESSMENT_QUESTION_ID,
      text: "What is 2 + 2?",
      options: ["3", "4"],
      correctOptionIndex: 1,
      explanation: "2 + 2 = 4",
      skillIds: [ASSESSMENT_MAIN_SKILL_ID, ASSESSMENT_SUB_SKILL_ID],
      pathId: ASSESSMENT_PATH_ID,
      subject: ASSESSMENT_SUBJECT_ID,
      sectionId: ASSESSMENT_SECTION_ID,
      approvalStatus: "approved",
    },
  });
  expectStatus("admin creates an approved assessment question", question, 201);

  await QuestionModel.create({
    id: INVALID_QUESTION_ID,
    text: "",
    options: [],
    subject: ASSESSMENT_SUBJECT_ID,
    pathId: ASSESSMENT_PATH_ID,
    type: "mcq",
    approvalStatus: "approved",
  });

  const quiz = await jsonRequest("/quizzes", {
    method: "POST",
    token: tokens.get("admin"),
    csrf,
    body: {
      id: ASSESSMENT_QUIZ_ID,
      title: "Platform V3 directed assessment",
      pathId: ASSESSMENT_PATH_ID,
      subjectId: ASSESSMENT_SUBJECT_ID,
      quizKind: "test",
      mode: "central",
      questionIds: [ASSESSMENT_QUESTION_ID],
      targetUserIds: [studentId],
      isPublished: true,
      showOnPlatform: true,
      access: { type: "free" },
      assessmentData: { mirrorSubmissions: true },
      settings: { maxAttempts: 1, passingScore: 60 },
    },
  });
  expectStatus("admin creates a published directed assessment", quiz, 201);
  assert.equal(quiz.body?.id, ASSESSMENT_QUIZ_ID, "created assessment id mismatch");
  assert.equal(quiz.body?.isPublished, true, "admin assessment was not published");

  const initialVersion = await AssessmentVersionModel.findOne({ assessmentId: ASSESSMENT_QUIZ_ID, version: 1 }).lean();
  assert.ok(initialVersion, "published assessment did not create immutable version 1");
  const updatedDefinition = await jsonRequest(`/quizzes/${ASSESSMENT_QUIZ_ID}`, {
    method: "PATCH",
    token: tokens.get("admin"),
    csrf,
    body: {
      title: "Platform V3 immutable assessment version",
      settings: { maxAttempts: 1, passingScore: 60, timeLimit: 45 },
    },
  });
  expectStatus("admin updates published assessment definition", updatedDefinition, 200);
  assert.deepEqual(updatedDefinition.body?.questionIds, [ASSESSMENT_QUESTION_ID], "published update lost selected questions");
  const latestVersion = await AssessmentVersionModel.findOne({ assessmentId: ASSESSMENT_QUIZ_ID, status: "published" }).sort({ version: -1 }).lean();
  assert.equal(latestVersion?.version, 2, "published update did not append immutable version 2");
  assert.equal(latestVersion?.definition?.title, "Platform V3 immutable assessment version", "immutable version did not retain updated title");
  assert.deepEqual(latestVersion?.definition?.questionIds, [ASSESSMENT_QUESTION_ID], "immutable version lost selected questions");
  assert.equal((latestVersion?.definition as any)?.settings?.timeLimit, 45, "immutable version lost updated settings");
  const versionedDetail = await jsonRequest(`/quizzes/${ASSESSMENT_QUIZ_ID}`, {
    token: tokens.get("student"),
  });
  expectStatus("assessment definition reads its immutable version when present", versionedDetail, 200);
  assert.equal(versionedDetail.body?.id, ASSESSMENT_QUIZ_ID, "versioned definition changed assessment identity");
  assert.equal(versionedDetail.body?.title, "Platform V3 immutable assessment version", "versioned definition was not read");
  assert.equal(versionedDetail.body?.questions?.length, 1, "versioned definition did not resolve its legacy questions");

  const outsiderDefinition = await jsonRequest(`/quizzes/${ASSESSMENT_QUIZ_ID}`, {
    token: tokens.get("outsider"),
  });
  expectStatus("outside student cannot read directed assessment definition", outsiderDefinition, 403);

  const anonymousDefinition = await jsonRequest(`/quizzes/${ASSESSMENT_QUIZ_ID}`);
  expectStatus("anonymous user cannot read directed assessment definition", anonymousDefinition, 401);

  const outsiderLiveStart = await jsonRequest("/live-exams/start", {
    method: "POST",
    token: tokens.get("outsider"),
    csrf,
    body: { quizId: ASSESSMENT_QUIZ_ID, quizTitle: "Directed assessment", totalQuestions: 1 },
  });
  expectStatus("outside student cannot start a directed assessment session", outsiderLiveStart, 403);

  const targetLiveStart = await jsonRequest("/live-exams/start", {
    method: "POST",
    token: tokens.get("student"),
    csrf,
    body: { quizId: ASSESSMENT_QUIZ_ID, quizTitle: "Directed assessment", totalQuestions: 1 },
  });
  expectStatus("targeted student starts a directed assessment session", targetLiveStart, 200);
  const liveAttemptId = String(targetLiveStart.body?.assessmentAttemptId || "");
  assert.ok(liveAttemptId, "directed live session did not create an assessment attempt");

  const savedProgress = await Promise.all(
    Array.from({ length: 2 }, () =>
      jsonRequest("/live-exams/progress", {
        method: "POST",
        token: tokens.get("student"),
        csrf,
        body: {
          quizId: ASSESSMENT_QUIZ_ID,
          answeredQuestions: 1,
          totalQuestions: 1,
          answers: { [ASSESSMENT_QUESTION_ID]: 1 },
        },
      }),
    ),
  );
  savedProgress.forEach((result) => expectStatus("live assessment progress retry is accepted", result, 200));
  assert.equal(
    await AssessmentResponseModel.countDocuments({ attemptId: liveAttemptId, questionId: ASSESSMENT_QUESTION_ID }),
    1,
    "live progress retry created duplicate assessment responses",
  );
  const resumedLiveSession = await jsonRequest(`/live-exams/session/${ASSESSMENT_QUIZ_ID}`, { token: tokens.get("student") });
  expectStatus("student resumes an active directed assessment session", resumedLiveSession, 200);
  assert.equal(resumedLiveSession.body?.answers?.[ASSESSMENT_QUESTION_ID], 1, "live session did not restore the saved answer");
  assert.equal(String(resumedLiveSession.body?.session?.assessmentAttemptId || ""), liveAttemptId, "live session resume changed the attempt");

  await AssessmentAttemptModel.updateOne({ _id: liveAttemptId }, { $set: { expiresAt: new Date(Date.now() - 1_000) } });
  const expiredProgress = await jsonRequest("/live-exams/progress", {
    method: "POST",
    token: tokens.get("student"),
    csrf,
    body: { quizId: ASSESSMENT_QUIZ_ID, answeredQuestions: 1, totalQuestions: 1, answers: { [ASSESSMENT_QUESTION_ID]: 0 } },
  });
  expectStatus("expired assessment session rejects further progress", expiredProgress, 409);
  const expiredAttempt = await AssessmentAttemptModel.findById(liveAttemptId).lean();
  assert.equal(expiredAttempt?.status, "expired", "expired assessment attempt was not closed");
  const expiredSession = await jsonRequest(`/live-exams/session/${ASSESSMENT_QUIZ_ID}`, { token: tokens.get("student") });
  expectStatus("expired assessment session is no longer resumable", expiredSession, 200);
  assert.equal(expiredSession.body?.session, null, "expired live session remained resumable");

  const missingQuestionQuiz = await jsonRequest("/quizzes", {
    method: "POST",
    token: tokens.get("admin"),
    csrf,
    body: {
      id: MISSING_QUESTION_QUIZ_ID,
      title: "Platform V3 assessment with a missing question",
      pathId: ASSESSMENT_PATH_ID,
      subjectId: ASSESSMENT_SUBJECT_ID,
      quizKind: "test",
      mode: "central",
      questionIds: [MISSING_QUESTION_ID],
      targetUserIds: [studentId],
      isPublished: true,
      showOnPlatform: true,
      access: { type: "free" },
    },
  });
  expectStatus("published assessment with a missing question is rejected", missingQuestionQuiz, 400);
  assert.equal(missingQuestionQuiz.body?.integrity?.missingIds?.includes(MISSING_QUESTION_ID), true, "missing question id was not reported");
  assert.equal(await QuizModel.countDocuments({ id: MISSING_QUESTION_QUIZ_ID }), 0, "missing-question assessment was saved");

  const invalidQuestionQuiz = await jsonRequest("/quizzes", {
    method: "POST",
    token: tokens.get("admin"),
    csrf,
    body: {
      id: INVALID_QUESTION_QUIZ_ID,
      title: "Platform V3 assessment with invalid question content",
      pathId: ASSESSMENT_PATH_ID,
      subjectId: ASSESSMENT_SUBJECT_ID,
      quizKind: "test",
      mode: "central",
      questionIds: [INVALID_QUESTION_ID],
      targetUserIds: [studentId],
      isPublished: true,
      showOnPlatform: true,
      access: { type: "free" },
    },
  });
  expectStatus("published assessment with invalid question content is rejected", invalidQuestionQuiz, 400);
  assert.equal(invalidQuestionQuiz.body?.integrity?.invalidContentIds?.includes(INVALID_QUESTION_ID), true, "invalid question id was not reported");
  assert.equal(await QuizModel.countDocuments({ id: INVALID_QUESTION_QUIZ_ID }), 0, "invalid-question assessment was saved");

  const duplicateQuestionQuiz = await jsonRequest("/quizzes", {
    method: "POST",
    token: tokens.get("admin"),
    csrf,
    body: {
      id: DUPLICATE_QUESTION_QUIZ_ID,
      title: "Platform V3 assessment with duplicate question references",
      pathId: ASSESSMENT_PATH_ID,
      subjectId: ASSESSMENT_SUBJECT_ID,
      quizKind: "test",
      mode: "central",
      questionIds: [ASSESSMENT_QUESTION_ID, ASSESSMENT_QUESTION_ID],
      targetUserIds: [studentId],
      isPublished: true,
      showOnPlatform: true,
      access: { type: "free" },
    },
  });
  expectStatus("published assessment normalizes duplicate question references", duplicateQuestionQuiz, 201);
  assert.deepEqual(duplicateQuestionQuiz.body?.questionIds, [ASSESSMENT_QUESTION_ID], "duplicate question reference was persisted");

  const outsiderSubmission = await jsonRequest(`/quizzes/${ASSESSMENT_QUIZ_ID}/submit`, {
    method: "POST",
    token: tokens.get("outsider"),
    csrf,
    body: { answers: { [ASSESSMENT_QUESTION_ID]: 1 }, timeSpentSeconds: 1, source: "tests" },
  });
  expectStatus("outside student cannot submit directed assessment", outsiderSubmission, 403);

  const acceptedSubmission = await jsonRequest(`/quizzes/${ASSESSMENT_QUIZ_ID}/submit`, {
    method: "POST",
    token: tokens.get("student"),
    csrf,
    body: { answers: { [ASSESSMENT_QUESTION_ID]: 1 }, timeSpentSeconds: 1, source: "tests" },
  });
  expectStatus("targeted student submits directed assessment", acceptedSubmission, 201);
  assert.equal(acceptedSubmission.body?.score, 100, "assessment scoring did not preserve the correct answer");
  assert.equal(acceptedSubmission.body?.quizSnapshot?.quizKind, "test", "assessment result snapshot missing quiz kind");
  const acceptedLegacyResult = await QuizResultModel.findOne({ userId: studentId, quizId: ASSESSMENT_QUIZ_ID }).lean();
  assert.ok(acceptedLegacyResult, "legacy result missing after accepted assessment submission");
  const submittedLiveAttempt = await AssessmentAttemptModel.findById(liveAttemptId).lean();
  assert.equal(submittedLiveAttempt?.submissionKey, acceptedLegacyResult.submissionKey, "legacy submit did not finalize the existing live attempt");
  assert.equal(submittedLiveAttempt?.status, "submitted", "legacy submit did not finalize the existing live attempt status");
  assert.equal(await AssessmentResultModel.countDocuments({ legacyQuizResultId: String(acceptedLegacyResult._id) }), 1, "opted-in directed assessment was not mirrored after legacy submission");
  const mirrorAudit = await AssessmentMirrorAuditModel.findOne({ legacyQuizResultId: String(acceptedLegacyResult._id) }).lean();
  assert.equal(mirrorAudit?.status, "completed", "successful assessment mirror was not auditable");
  pass("eligible assessment mirrors only after preserving the legacy HTTP submission");

  const repeatedSubmission = await jsonRequest(`/quizzes/${ASSESSMENT_QUIZ_ID}/submit`, {
    method: "POST",
    token: tokens.get("student"),
    csrf,
    body: { answers: { [ASSESSMENT_QUESTION_ID]: 1 }, timeSpentSeconds: 1, source: "tests" },
  });
  expectStatus("assessment max-attempt guard rejects repeat submission", repeatedSubmission, 409);
}

async function runHistoricalResultJourney(csrf: CsrfContext) {
  const studentId = userIds.get("student");
  assert.ok(studentId, "target student id missing for historical result");

  const directedLegacyResult = await QuizResultModel.findOne({ userId: studentId, quizId: ASSESSMENT_QUIZ_ID }).lean();
  assert.ok(directedLegacyResult, "directed legacy result missing for reader cutover");
  await AssessmentResultModel.updateOne(
    { legacyQuizResultId: String(directedLegacyResult._id) },
    { $set: { compatibilityProjection: { quizTitle: "Platform V3 compatibility reader projection" } } },
  );
  const defaultReaderDetail = await jsonRequest(`/quiz-results/${directedLegacyResult._id}`, { token: tokens.get("student") });
  expectStatus("legacy reader remains the default before compatibility cutover", defaultReaderDetail, 200);
  assert.notEqual(defaultReaderDetail.body?.result?.quizTitle, "Platform V3 compatibility reader projection", "default reader used the additive projection");

  const enableCompatibilityReader = await jsonRequest(`/quizzes/${ASSESSMENT_QUIZ_ID}`, {
    method: "PATCH", token: tokens.get("admin"), csrf,
    body: { assessmentData: { resultReaderMode: "compatibility" } },
  });
  expectStatus("admin enables per-assessment compatibility result reader", enableCompatibilityReader, 200);
  assert.equal(enableCompatibilityReader.body?.assessmentData?.mirrorSubmissions, true, "reader update changed the existing mirror control");
  assert.equal(enableCompatibilityReader.body?.assessmentData?.resultReaderMode, "compatibility", "reader mode was not persisted");
  const compatibilityReaderDetail = await jsonRequest(`/quiz-results/${directedLegacyResult._id}`, { token: tokens.get("student") });
  expectStatus("enabled assessment reads compatibility projection", compatibilityReaderDetail, 200);
  assert.equal(compatibilityReaderDetail.body?.result?.quizTitle, "Platform V3 compatibility reader projection", "enabled reader did not use the additive projection");
  const compatibilityReaderList = await jsonRequest(`/quiz-results/my?quizId=${ASSESSMENT_QUIZ_ID}`, { token: tokens.get("student") });
  expectStatus("enabled assessment reads compatibility projection in student list", compatibilityReaderList, 200);
  assert.ok(compatibilityReaderList.body?.data?.some((item: any) => item.quizTitle === "Platform V3 compatibility reader projection"), "student list did not use the additive projection");
  const compatibilityAdminList = await jsonRequest(`/admin/quiz-results?quizId=${ASSESSMENT_QUIZ_ID}`, { token: tokens.get("admin") });
  expectStatus("enabled assessment reads compatibility projection in admin list", compatibilityAdminList, 200);
  assert.ok(compatibilityAdminList.body?.data?.some((item: any) => item.quizTitle === "Platform V3 compatibility reader projection"), "admin list did not use the additive projection");
  const compatibilityLegacyListRoute = await jsonRequest(`/quizzes/results?quizId=${ASSESSMENT_QUIZ_ID}`, { token: tokens.get("student") });
  expectStatus("enabled assessment reads compatibility projection in legacy result list route", compatibilityLegacyListRoute, 200);
  assert.ok(compatibilityLegacyListRoute.body?.results?.some((item: any) => item.quizTitle === "Platform V3 compatibility reader projection"), "legacy result list route did not use the additive projection");

  const disableCompatibilityReader = await jsonRequest(`/quizzes/${ASSESSMENT_QUIZ_ID}`, {
    method: "PATCH", token: tokens.get("admin"), csrf,
    body: { assessmentData: { resultReaderMode: "legacy" } },
  });
  expectStatus("admin rolls back per-assessment result reader", disableCompatibilityReader, 200);
  assert.equal(disableCompatibilityReader.body?.assessmentData?.mirrorSubmissions, true, "reader rollback changed the existing mirror control");
  const rolledBackReaderDetail = await jsonRequest(`/quiz-results/${directedLegacyResult._id}`, { token: tokens.get("student") });
  expectStatus("legacy response returns after reader rollback", rolledBackReaderDetail, 200);
  assert.notEqual(rolledBackReaderDetail.body?.result?.quizTitle, "Platform V3 compatibility reader projection", "reader rollback still used the additive projection");

  await QuizModel.updateOne({ id: ASSESSMENT_QUIZ_ID }, { $set: { "assessmentData.resultReaderMode": "compatibility" } });

  await QuizModel.create({
    _id: HISTORICAL_RESULT_QUIZ_ID,
    id: HISTORICAL_RESULT_QUIZ_ID,
    title: "Platform V3 historical reader-control fixture",
    pathId: ASSESSMENT_PATH_ID,
    subjectId: ASSESSMENT_SUBJECT_ID,
    assessmentData: { resultReaderMode: "compatibility" },
  });

  const historicalResult = await QuizResultModel.create({
    userId: studentId,
    quizId: HISTORICAL_RESULT_QUIZ_ID,
    quizTitle: "Platform V3 historical assessment result",
    score: 75,
    passed: true,
    totalQuestions: 4,
    correctAnswers: 3,
    wrongAnswers: 1,
    unanswered: 0,
    timeSpent: "08:00",
    date: "2025-01-01T00:00:00.000Z",
    skillsAnalysis: [],
  });

  const historicalResults = await jsonRequest(`/quizzes/results?quizId=${HISTORICAL_RESULT_QUIZ_ID}`, {
    token: tokens.get("student"),
  });
  expectStatus("student reads historical result without snapshot fields", historicalResults, 200);
  const historical = historicalResults.body?.results?.[0];
  assert.equal(historical?.quizId, HISTORICAL_RESULT_QUIZ_ID, "historical result quiz id changed");
  assert.equal(historical?.score, 75, "historical result score changed");
  assert.equal(historical?.timeSpent, "08:00", "historical result time changed");

  const compatibleAssessmentResult = await AssessmentResultModel.create({
    attemptId: `platform-v3-integration-compatible-result-${RUN_MARKER}`,
    assignmentId: `platform-v3-integration-assignment-${RUN_MARKER}`,
    assessmentVersionId: `platform-v3-integration-version-${RUN_MARKER}`,
    studentId,
    legacyQuizResultId: String(historicalResult._id),
    score: 75,
    totalQuestions: 4,
    correctAnswers: 3,
    wrongAnswers: 1,
    unanswered: 0,
    passed: true,
    compatibilityProjection: { quizTitle: "Platform V3 compatible historical result", score: 76 },
  });
  const compatibleDetail = await jsonRequest(`/quiz-results/${historicalResult._id}`, {
    token: tokens.get("student"),
  });
  expectStatus("student reads compatible assessment result projection", compatibleDetail, 200);
  assert.equal(compatibleDetail.body?.result?.score, 76, "compatible result projection was not read");
  assert.equal(compatibleDetail.body?.result?.userId, studentId, "compatible result changed the legacy owner");
  const compatibleLatest = await jsonRequest("/quizzes/results/latest", { token: tokens.get("student") });
  expectStatus("student reads compatible latest-result projection", compatibleLatest, 200);
  assert.equal(compatibleLatest.body?.score, 76, "latest-result route did not use the compatible projection");
  assert.deepEqual(reconcileAssessmentResult(historicalResult.toObject(), compatibleAssessmentResult.toObject()), []);

  const resultOnlyLegacy = await QuizResultModel.create({
    userId: studentId, quizId: ASSESSMENT_QUIZ_ID, quizTitle: "Result-only historical fixture",
    score: 50, passed: false, totalQuestions: 2, correctAnswers: 1, wrongAnswers: 1, unanswered: 0,
  });
  const dryRun = await backfillHistoricalAssessmentResults({ limit: 100 });
  assert.equal(dryRun.mode, "dry-run", "historical result backfill defaulted to writes");
  assert.equal(await AssessmentResultModel.countDocuments({ legacyQuizResultId: String(resultOnlyLegacy._id) }), 0, "result-only dry-run wrote an assessment result");
  const applied = await backfillHistoricalAssessmentResults({ limit: 100, execute: true });
  assert.ok(applied.created >= 1, "result-only backfill did not create a pending historical result");
  const resultOnly = await AssessmentResultModel.findOne({ legacyQuizResultId: String(resultOnlyLegacy._id) }).lean();
  assert.equal(resultOnly?.dataCompleteness, "result_only", "historical result completeness was not explicit");
  assert.equal(resultOnly?.source, "legacy_backfill", "historical result source was not explicit");
  assert.equal(resultOnly?.attemptId, undefined, "result-only backfill invented an attempt");
  assert.equal(resultOnly?.assessmentVersionId, undefined, "result-only backfill invented a definition version");
  const resultOnlyDetail = await jsonRequest(`/quiz-results/${resultOnlyLegacy._id}`, { token: tokens.get("student") });
  expectStatus("student reads result-only historical compatibility projection", resultOnlyDetail, 200);
  assert.equal(resultOnlyDetail.body?.result?.score, 50, "result-only compatibility read changed the legacy score");
  await AssessmentResultModel.deleteOne({ _id: resultOnly?._id });
  const rollbackDetail = await jsonRequest(`/quiz-results/${resultOnlyLegacy._id}`, { token: tokens.get("student") });
  expectStatus("student falls back to legacy result after compatibility rollback", rollbackDetail, 200);
  assert.equal(rollbackDetail.body?.result?.score, 50, "legacy fallback changed the historical score");
  await backfillHistoricalAssessmentResults({ limit: 100, execute: true });
  const retry = await backfillHistoricalAssessmentResults({ limit: 100, execute: true });
  assert.equal(retry.created, 0, "result-only backfill retry was not idempotent");
  pass("historical result-only backfill is explicit, idempotent, and does not invent attempt data");
}

async function runAssessmentDualWritePrimitiveJourney() {
  const studentId = userIds.get("student");
  assert.ok(studentId, "target student id missing for dual-write primitive");
  const quiz = await QuizModel.findOne({ id: ASSESSMENT_QUIZ_ID }).lean();
  const legacyResult = await QuizResultModel.findOne({ userId: studentId, quizId: ASSESSMENT_QUIZ_ID }).lean();
  assert.ok(quiz, "assessment quiz missing for dual-write primitive");
  assert.ok(legacyResult, "legacy submission missing for dual-write primitive");

  const answers = { [ASSESSMENT_QUESTION_ID]: 1 };
  const firstResult = await dualWriteAssessmentSubmission({ quiz, legacyResult, answers });
  const retriedResult = await dualWriteAssessmentSubmission({ quiz, legacyResult, answers });
  assert.equal(String(firstResult._id), String(retriedResult._id), "dual-write retry created a second assessment result");
  assert.equal(await AssessmentAttemptModel.countDocuments({ submissionKey: legacyResult.submissionKey }), 1, "dual-write retry created a second attempt");
  assert.equal(await AssessmentResultModel.countDocuments({ legacyQuizResultId: String(legacyResult._id) }), 1, "dual-write retry created a second result");
  const persistedAttempt = await AssessmentAttemptModel.findOne({ submissionKey: legacyResult.submissionKey }).lean();
  assert.ok(persistedAttempt, "dual-write attempt was not persisted");
  assert.equal(await AssessmentResponseModel.countDocuments({ attemptId: String(persistedAttempt._id) }), 1, "dual-write retry duplicated a response");
  pass("assessment dual-write primitive is idempotent after a legacy submission");

  const partialLegacyResult = await QuizResultModel.create({
    userId: studentId,
    quizId: ASSESSMENT_QUIZ_ID,
    quizTitle: "Platform V3 partial dual-write fixture",
    score: 100,
    passed: true,
    totalQuestions: 1,
    correctAnswers: 1,
    wrongAnswers: 0,
    unanswered: 0,
    attemptNumber: 2,
    submissionKey: `platform-v3-partial-dual-write-${RUN_MARKER}`,
  });
  const newWriteFailure = new Error("isolated response persistence failure");
  await assert.rejects(
    () => dualWriteAssessmentSubmission({
      quiz,
      legacyResult: partialLegacyResult.toObject(),
      answers,
      dependencies: { upsertResponse: async () => { throw newWriteFailure; } },
    }),
    newWriteFailure,
  );
  assert.ok(await QuizResultModel.exists({ _id: partialLegacyResult._id }), "new-write failure altered the successful legacy submission");
  assert.equal(await AssessmentResultModel.countDocuments({ legacyQuizResultId: String(partialLegacyResult._id) }), 0, "partial new write finalized a result after response failure");
  const repairedAfterRetry = await dualWriteAssessmentSubmission({
    quiz,
    legacyResult: partialLegacyResult.toObject(),
    answers,
  });
  assert.equal(String(repairedAfterRetry.legacyQuizResultId), String(partialLegacyResult._id), "retry did not repair the partial new write");
  assert.equal(await AssessmentAttemptModel.countDocuments({ submissionKey: partialLegacyResult.submissionKey }), 1, "partial-write retry created a duplicate attempt");
  pass("assessment dual-write failure preserves legacy submission and retry repairs the new projection");

  const divergent = await AssessmentResultModel.findByIdAndUpdate(
    repairedAfterRetry._id,
    { $set: { score: 0, compatibilityProjection: { score: 0 } } },
    { new: true },
  ).lean();
  assert.ok(divergent, "failed to create isolated reconciliation divergence");
  assert.deepEqual(reconcileAssessmentResult(partialLegacyResult.toObject(), divergent), ["score"], "reconciliation did not detect the isolated divergence");
  const repaired = await repairAssessmentResultFromLegacy(partialLegacyResult.toObject(), divergent);
  assert.ok(repaired, "reconciliation repair did not return an assessment result");
  assert.deepEqual(reconcileAssessmentResult(partialLegacyResult.toObject(), repaired.toObject()), [], "reconciliation repair did not restore legacy parity");
  assert.equal(await QuizResultModel.countDocuments({ _id: partialLegacyResult._id }), 1, "reconciliation repair altered the legacy submission");
  pass("assessment reconciliation detects and repairs a new-model divergence without changing legacy data");

  await AssessmentMirrorAuditModel.create({
    legacyQuizResultId: String(partialLegacyResult._id),
    assessmentId: ASSESSMENT_QUIZ_ID,
    submissionKey: partialLegacyResult.submissionKey,
    status: "completed",
  });
  await AssessmentResultModel.findByIdAndUpdate(repairedAfterRetry._id, { $set: { score: 0 } });
  const dryRun = await reconcileAssessmentMirrorAudits({ limit: 100 });
  const dryRunItem = dryRun.items.find((item) => item.legacyQuizResultId === String(partialLegacyResult._id));
  assert.deepEqual(dryRunItem, {
    auditId: dryRunItem?.auditId,
    legacyQuizResultId: String(partialLegacyResult._id),
    status: "mismatch",
    differences: ["score"],
  }, "reconciliation dry-run did not report the divergence without repair");
  const repairRun = await reconcileAssessmentMirrorAudits({ limit: 100, repair: true });
  assert.equal(repairRun.items.find((item) => item.legacyQuizResultId === String(partialLegacyResult._id))?.status, "repaired", "explicit reconciliation repair did not repair the divergence");
  const idempotentRepairRun = await reconcileAssessmentMirrorAudits({ limit: 100, repair: true });
  assert.equal(idempotentRepairRun.items.find((item) => item.legacyQuizResultId === String(partialLegacyResult._id))?.status, "consistent", "reconciliation repair was not idempotent");
  pass("assessment mirror reconciliation is bounded, dry-run-safe, and explicitly repairable");

  const [legacyCountBeforeInventory, projectionCountBeforeInventory] = await Promise.all([
    QuizResultModel.countDocuments(),
    AssessmentResultModel.countDocuments(),
  ]);
  const firstInventory = await inventoryLegacyAssessmentResults({ limit: 1 });
  assert.equal(firstInventory.mode, "dry-run", "legacy inventory unexpectedly entered write mode");
  assert.equal(firstInventory.processed, 1, "legacy inventory did not honor its batch limit");
  assert.ok(firstInventory.nextAfterId, "bounded legacy inventory did not return a cursor");
  const secondInventory = await inventoryLegacyAssessmentResults({ afterId: firstInventory.nextAfterId!, limit: 100 });
  assert.ok(secondInventory.processed >= 1, "legacy inventory cursor did not advance to the next batch");
  const stableInventory = await inventoryLegacyAssessmentResults({ limit: 1 });
  assert.equal(stableInventory.checksum, firstInventory.checksum, "legacy inventory checksum is not stable for the same dry-run page");
  assert.equal(await QuizResultModel.countDocuments(), legacyCountBeforeInventory, "legacy inventory wrote QuizResult data");
  assert.equal(await AssessmentResultModel.countDocuments(), projectionCountBeforeInventory, "legacy inventory wrote additive result data");
  pass("legacy assessment backfill inventory is bounded, cursor-based, and read-only");
}

async function runMockAssessmentJourney(csrf: CsrfContext) {
  const studentId = userIds.get("student");
  assert.ok(studentId, "target student id missing for mock assessment");

  const secondQuestion = await jsonRequest("/quizzes/questions", {
    method: "POST",
    token: tokens.get("admin"),
    csrf,
    body: {
      id: MOCK_ASSESSMENT_QUESTION_ID,
      text: "What is 3 + 3?",
      options: ["5", "6"],
      correctOptionIndex: 1,
      explanation: "3 + 3 = 6",
      skillIds: [ASSESSMENT_MAIN_SKILL_ID, ASSESSMENT_SUB_SKILL_ID],
      pathId: ASSESSMENT_PATH_ID,
      subject: ASSESSMENT_SUBJECT_ID,
      sectionId: ASSESSMENT_SECTION_ID,
      approvalStatus: "approved",
    },
  });
  expectStatus("admin creates a second mock assessment question", secondQuestion, 201);

  const mockQuiz = await jsonRequest("/quizzes", {
    method: "POST",
    token: tokens.get("admin"),
    csrf,
    body: {
      id: MOCK_ASSESSMENT_QUIZ_ID,
      title: "Platform V3 two-section mock assessment",
      pathId: ASSESSMENT_PATH_ID,
      subjectId: ASSESSMENT_SUBJECT_ID,
      quizKind: "mock",
      mode: "central",
      isPublished: true,
      showOnPlatform: true,
      access: { type: "free" },
      settings: { maxAttempts: 1, passingScore: 60 },
      targetUserIds: [studentId],
      mockExam: {
        enabled: true,
        isStrictSectionLock: true,
        sections: [
          {
            id: `platform-v3-integration-mock-section-a-${RUN_MARKER}`,
            title: "Mock section A",
            questionIds: [ASSESSMENT_QUESTION_ID],
            timeLimit: 15,
            order: 1,
            isStrictSectionLock: true,
          },
          {
            id: `platform-v3-integration-mock-section-b-${RUN_MARKER}`,
            title: "Mock section B",
            questionIds: [MOCK_ASSESSMENT_QUESTION_ID],
            timeLimit: 15,
            order: 2,
            isStrictSectionLock: true,
          },
        ],
      },
    },
  });
  expectStatus("admin creates a published two-section mock assessment", mockQuiz, 201);
  assert.equal(mockQuiz.body?.quizKind, "mock", "mock assessment lost its quiz kind");
  assert.equal(mockQuiz.body?.mockExam?.sections?.length, 2, "mock assessment did not retain both sections");

  const partialMockUpdate = await jsonRequest(`/quizzes/${MOCK_ASSESSMENT_QUIZ_ID}`, {
    method: "PATCH",
    token: tokens.get("admin"),
    csrf,
    body: { title: "Platform V3 two-section mock assessment updated" },
  });
  expectStatus("admin partial update preserves existing mock assessment definition", partialMockUpdate, 200);
  assert.equal(partialMockUpdate.body?.settings?.maxAttempts, 1, "partial mock update dropped max-attempt settings");
  assert.equal(partialMockUpdate.body?.mockExam?.enabled, true, "partial mock update disabled the mock definition");
  assert.equal(partialMockUpdate.body?.mockExam?.sections?.length, 2, "partial mock update dropped mock sections");
  assert.equal(partialMockUpdate.body?.mockExam?.sections?.[1]?.questionIds?.[0], MOCK_ASSESSMENT_QUESTION_ID, "partial mock update changed selected questions");

  const outsiderSubmission = await jsonRequest(`/quizzes/${MOCK_ASSESSMENT_QUIZ_ID}/submit`, {
    method: "POST",
    token: tokens.get("outsider"),
    csrf,
    body: { answers: { [ASSESSMENT_QUESTION_ID]: 1, [MOCK_ASSESSMENT_QUESTION_ID]: 0 }, timeSpentSeconds: 30, source: "mock-exam" },
  });
  expectStatus("outside student cannot submit directed mock assessment", outsiderSubmission, 403);

  const acceptedSubmission = await jsonRequest(`/quizzes/${MOCK_ASSESSMENT_QUIZ_ID}/submit`, {
    method: "POST",
    token: tokens.get("student"),
    csrf,
    body: { answers: { [ASSESSMENT_QUESTION_ID]: 1, [MOCK_ASSESSMENT_QUESTION_ID]: 0 }, timeSpentSeconds: 30, source: "mock-exam" },
  });
  expectStatus("targeted student submits two-section mock assessment", acceptedSubmission, 201);
  assert.equal(acceptedSubmission.body?.quizSnapshot?.quizKind, "mock", "mock result snapshot missing quiz kind");
  assert.equal(acceptedSubmission.body?.sectionResults?.length, 2, "mock result missing section results");
  assert.equal(acceptedSubmission.body?.sectionResults?.[0]?.score, 100, "first mock section score is incorrect");
  assert.equal(acceptedSubmission.body?.sectionResults?.[1]?.score, 0, "second mock section score is incorrect");

  const learnerMockResults = await jsonRequest(`/quiz-results/my?quizId=${MOCK_ASSESSMENT_QUIZ_ID}`, {
    token: tokens.get("student"),
  });
  expectStatus("student reads mock section results from the result list", learnerMockResults, 200);
  assert.equal(learnerMockResults.body?.data?.[0]?.sectionResults?.length, 2, "learner result list omitted mock section results");

  const sectionAnalytics = await jsonRequest(`/quizzes/results/section-analytics/${MOCK_ASSESSMENT_QUIZ_ID}`, {
    token: tokens.get("admin"),
  });
  expectStatus("admin reads mock section analytics from stored result", sectionAnalytics, 200);
  assert.equal(sectionAnalytics.body?.sections?.length, 2, "mock section analytics did not return both sections");
}

async function runScopedCreatorJourney(csrf: CsrfContext) {
  const studentId = userIds.get("student");
  const classId = groupIds.get("class");
  assert.ok(studentId && classId, "target student/class ids missing for scoped creator checks");

  const teacherQuestion = await jsonRequest("/quizzes/questions", {
    method: "POST",
    token: tokens.get("teacher"),
    csrf,
    body: {
      id: TEACHER_QUESTION_ID,
      text: "Platform V3 teacher scoped question",
      options: ["Wrong", "Correct"],
      correctOptionIndex: 1,
      skillIds: [ASSESSMENT_MAIN_SKILL_ID, ASSESSMENT_SUB_SKILL_ID],
      pathId: ASSESSMENT_PATH_ID,
      subject: ASSESSMENT_SUBJECT_ID,
      sectionId: ASSESSMENT_SECTION_ID,
      type: "mcq",
    },
  });
  expectStatus("teacher creates a question inside managed scope", teacherQuestion, 201);
  assert.equal(teacherQuestion.body?.approvalStatus, "pending_review", "teacher question bypassed approval workflow");

  const teacherOutsideQuestionScope = await jsonRequest("/quizzes/questions", {
    method: "POST",
    token: tokens.get("teacher"),
    csrf,
    body: {
      id: `${TEACHER_QUESTION_ID}-outside`,
      text: "Platform V3 teacher outside scoped question",
      options: ["Wrong", "Correct"],
      correctOptionIndex: 1,
      skillIds: [`platform-v3-integration-teacher-outside-skill-${RUN_MARKER}`],
      pathId: `platform-v3-integration-outside-path-${RUN_MARKER}`,
      subject: `platform-v3-integration-outside-subject-${RUN_MARKER}`,
      type: "mcq",
    },
  });
  expectStatus("teacher cannot create a question outside managed scope", teacherOutsideQuestionScope, 403);

  const teacherDraft = await jsonRequest("/quizzes", {
    method: "POST",
    token: tokens.get("teacher"),
    csrf,
    body: {
      id: TEACHER_QUIZ_ID,
      title: "Platform V3 teacher scoped draft",
      pathId: ASSESSMENT_PATH_ID,
      subjectId: ASSESSMENT_SUBJECT_ID,
      questionIds: [ASSESSMENT_QUESTION_ID],
      isPublished: true,
    },
  });
  expectStatus("teacher creates a quiz inside managed scope", teacherDraft, 201);
  assert.equal(teacherDraft.body?.isPublished, false, "teacher draft bypassed publication review");
  assert.equal(teacherDraft.body?.approvalStatus, "pending_review", "teacher draft bypassed approval workflow");

  const teacherOutsideScope = await jsonRequest("/quizzes", {
    method: "POST",
    token: tokens.get("teacher"),
    csrf,
    body: {
      id: `${TEACHER_QUIZ_ID}-outside`,
      title: "Platform V3 teacher outside scope",
      pathId: `platform-v3-integration-outside-path-${RUN_MARKER}`,
      subjectId: `platform-v3-integration-outside-subject-${RUN_MARKER}`,
      questionIds: [ASSESSMENT_QUESTION_ID],
    },
  });
  expectStatus("teacher cannot create a quiz outside managed scope", teacherOutsideScope, 403);

  const trainerCourse = await jsonRequest("/courses", {
    method: "POST",
    token: tokens.get("teacher"),
    csrf,
    body: {
      id: TEACHER_COURSE_ID,
      title: "Platform trainer scoped course",
      pathId: ASSESSMENT_PATH_ID,
      subjectId: ASSESSMENT_SUBJECT_ID,
    },
  });
  expectStatus("platform trainer creates a course inside managed scope", trainerCourse, 201);
  assert.equal(trainerCourse.body?.approvalStatus, "pending_review", "trainer course bypassed review");

  const trainerDraftCourse = await jsonRequest("/courses", {
    method: "POST",
    token: tokens.get("teacher"),
    csrf,
    body: {
      id: TEACHER_DRAFT_COURSE_ID,
      title: "Platform trainer saved draft",
      pathId: ASSESSMENT_PATH_ID,
      subjectId: ASSESSMENT_SUBJECT_ID,
      approvalStatus: "draft",
      isPublished: true,
    },
  });
  expectStatus("platform trainer saves a course draft", trainerDraftCourse, 201);
  assert.equal(trainerDraftCourse.body?.approvalStatus, "draft", "trainer draft was not persisted");
  assert.equal(trainerDraftCourse.body?.isPublished, false, "trainer draft was published directly");

  const trainerSubmitsDraft = await jsonRequest(`/courses/${TEACHER_DRAFT_COURSE_ID}`, {
    method: "PATCH",
    token: tokens.get("teacher"),
    csrf,
    body: {
      approvalStatus: "pending_review",
      isPublished: true,
      reviewerNotes: "forged reviewer note",
      revenueSharePercentage: 99,
    },
  });
  expectStatus("platform trainer submits a draft for review", trainerSubmitsDraft, 200);
  assert.equal(trainerSubmitsDraft.body?.approvalStatus, "pending_review", "trainer submission did not enter review");
  assert.equal(trainerSubmitsDraft.body?.isPublished, false, "trainer submitted course was published directly");
  assert.notEqual(trainerSubmitsDraft.body?.reviewerNotes, "forged reviewer note", "trainer forged reviewer notes");
  assert.notEqual(trainerSubmitsDraft.body?.revenueSharePercentage, 99, "trainer set an admin revenue share");

  const trainerOutsideCourse = await jsonRequest("/courses", {
    method: "POST",
    token: tokens.get("teacher"),
    csrf,
    body: {
      id: `${TEACHER_COURSE_ID}-outside`,
      title: "Platform trainer outside course",
      pathId: `outside-path-${RUN_MARKER}`,
      subjectId: `outside-subject-${RUN_MARKER}`,
    },
  });
  expectStatus("platform trainer cannot create a course outside managed scope", trainerOutsideCourse, 403);

  const teacherId = userIds.get("teacher");
  const adminId = userIds.get("admin");
  assert.ok(teacherId && adminId, "trainer-directory fixture ids missing");
  const [unscopedTrainer, inactiveTrainer] = await Promise.all([
    UserModel.create({
      name: "Unscoped platform trainer candidate",
      email: `platform-v3-unscoped-trainer-${RUN_MARKER}@example.invalid`,
      passwordHash: await bcrypt.hash(randomBytes(24).toString("base64url"), 10),
      role: "teacher",
      isActive: true,
    }),
    UserModel.create({
      name: "Inactive platform trainer candidate",
      email: `platform-v3-inactive-trainer-${RUN_MARKER}@example.invalid`,
      passwordHash: await bcrypt.hash(randomBytes(24).toString("base64url"), 10),
      role: "teacher",
      isActive: false,
      managedPathIds: [ASSESSMENT_PATH_ID],
      managedSubjectIds: [ASSESSMENT_SUBJECT_ID],
    }),
  ]);

  const trainerDirectory = await jsonRequest(
    `/auth/admin/users?platformTrainer=true&search=${encodeURIComponent(credentials.get("teacher")!.email)}&limit=10`,
    { token: tokens.get("admin") },
  );
  expectStatus("admin reads the server-filtered platform trainer directory", trainerDirectory, 200);
  assert.equal(
    trainerDirectory.body?.users?.some((candidate: any) => String(candidate.id || candidate._id || "") === teacherId),
    true,
    "platform trainer directory omitted the scoped active trainer",
  );
  assert.equal(
    trainerDirectory.body?.users?.every((candidate: any) => candidate.role === "teacher" && candidate.isActive !== false),
    true,
    "platform trainer directory leaked a non-active trainer identity",
  );
  assert.equal(
    trainerDirectory.body?.users?.some((candidate: any) => String(candidate.id || candidate._id || "") === String(unscopedTrainer._id)),
    false,
    "platform trainer directory leaked an unscoped teacher",
  );
  assert.equal(
    trainerDirectory.body?.users?.some((candidate: any) => String(candidate.id || candidate._id || "") === String(inactiveTrainer._id)),
    false,
    "platform trainer directory leaked an inactive teacher",
  );

  const trainerDirectoryDenied = await jsonRequest("/auth/admin/users?platformTrainer=true", {
    token: tokens.get("teacher"),
  });
  expectStatus("platform trainer directory is admin-only", trainerDirectoryDenied, 403);

  const trainerCenter = await jsonRequest(
    `/auth/admin/trainers?status=active&persona=platform&pathId=${encodeURIComponent(ASSESSMENT_PATH_ID)}&search=${encodeURIComponent(credentials.get("teacher")!.email)}`,
    { token: tokens.get("admin") },
  );
  expectStatus("admin reads the paginated trainer management center", trainerCenter, 200);
  const managedTrainer = trainerCenter.body?.trainers?.find(
    (candidate: any) => String(candidate.id || candidate._id || "") === teacherId,
  );
  assert.ok(managedTrainer, "trainer management center omitted the scoped trainer");
  assert.ok(Number(managedTrainer.portfolio?.total || 0) >= 1, "trainer management center omitted aggregate portfolio totals");

  const trainerProfile = await jsonRequest(`/auth/admin/trainers/${encodeURIComponent(teacherId)}`, {
    token: tokens.get("admin"),
  });
  expectStatus("admin reads a trainer management profile", trainerProfile, 200);
  assert.equal(String(trainerProfile.body?.trainer?.id || trainerProfile.body?.trainer?._id || ""), teacherId, "trainer profile returned the wrong user");
  assert.ok(
    Number(trainerProfile.body?.trainer?.portfolio?.stats?.total || 0) >= Number(managedTrainer.portfolio?.total || 0),
    "trainer profile aggregate is less complete than the directory read model",
  );

  const trainerCenterDenied = await jsonRequest("/auth/admin/trainers", { token: tokens.get("teacher") });
  expectStatus("trainer management center is admin-only", trainerCenterDenied, 403);

  const configuredTrainer = await jsonRequest(`/auth/admin/users/${encodeURIComponent(String(unscopedTrainer._id))}`, {
    method: "PATCH",
    token: tokens.get("admin"),
    csrf,
    body: { managedPathIds: [ASSESSMENT_PATH_ID], managedSubjectIds: [ASSESSMENT_SUBJECT_ID] },
  });
  expectStatus("admin saves trainer scope through the trainer center command", configuredTrainer, 200);
  assert.deepEqual(configuredTrainer.body?.user?.managedSubjectIds, [ASSESSMENT_SUBJECT_ID], "trainer scope did not persist");
  assert.ok(
    await AdminAuditLogModel.exists({
      actorId: adminId,
      action: "auth.admin_user.update",
      resourceId: String(unscopedTrainer._id),
    }),
    "trainer scope change was not audit logged",
  );

  const adminAssignedCourse = await jsonRequest("/courses", {
    method: "POST",
    token: tokens.get("admin"),
    csrf,
    body: {
      id: `${TEACHER_COURSE_ID}-admin-assigned`,
      title: "Admin assigned platform trainer course",
      pathId: ASSESSMENT_PATH_ID,
      subjectId: ASSESSMENT_SUBJECT_ID,
      assignedTeacherId: teacherId,
    },
  });
  expectStatus("admin assigns an in-scope platform trainer to a course", adminAssignedCourse, 201);
  assert.equal(String(adminAssignedCourse.body?.assignedTeacherId || ""), teacherId, "assigned trainer did not persist");

  const invalidTrainerAssignment = await jsonRequest("/courses", {
    method: "POST",
    token: tokens.get("admin"),
    csrf,
    body: {
      id: `${TEACHER_COURSE_ID}-invalid-assignment`,
      title: "Invalid trainer assignment must be blocked",
      pathId: `outside-path-${RUN_MARKER}`,
      subjectId: `outside-subject-${RUN_MARKER}`,
      assignedTeacherId: teacherId,
    },
  });
  expectStatus("admin cannot assign trainer outside their content scope", invalidTrainerAssignment, 400);
  assert.match(String(invalidTrainerAssignment.body?.message || ""), /خارج المسارات أو المواد/, "invalid assignment did not explain the scope conflict");

  const inactiveTrainerAssignment = await jsonRequest("/courses", {
    method: "POST",
    token: tokens.get("admin"),
    csrf,
    body: {
      id: `${TEACHER_COURSE_ID}-inactive-assignment`,
      title: "Inactive trainer assignment must be blocked",
      pathId: ASSESSMENT_PATH_ID,
      subjectId: ASSESSMENT_SUBJECT_ID,
      assignedTeacherId: String(inactiveTrainer._id),
    },
  });
  expectStatus("admin cannot assign an inactive trainer", inactiveTrainerAssignment, 400);

  const trainerCannotReassignCourse = await jsonRequest(`/courses/${TEACHER_COURSE_ID}`, {
    method: "PATCH",
    token: tokens.get("teacher"),
    csrf,
    body: { assignedTeacherId: adminId },
  });
  expectStatus("trainer cannot reassign course ownership through a direct request", trainerCannotReassignCourse, 200);
  assert.equal(String(trainerCannotReassignCourse.body?.assignedTeacherId || ""), teacherId, "trainer reassigned course ownership");

  const trainerLesson = await jsonRequest("/content/lessons", {
    method: "POST",
    token: tokens.get("teacher"),
    csrf,
    body: {
      id: TEACHER_LESSON_ID,
      title: "Platform trainer scoped lesson",
      pathId: ASSESSMENT_PATH_ID,
      subjectId: ASSESSMENT_SUBJECT_ID,
      type: "text",
      skillIds: [`trainer-lesson-skill-${RUN_MARKER}`],
    },
  });
  expectStatus("platform trainer creates a lesson inside managed scope", trainerLesson, 201);

  const trainerOutsideLesson = await jsonRequest("/content/lessons", {
    method: "POST",
    token: tokens.get("teacher"),
    csrf,
    body: {
      id: `${TEACHER_LESSON_ID}-outside`,
      title: "Platform trainer outside lesson",
      pathId: `outside-path-${RUN_MARKER}`,
      subjectId: `outside-subject-${RUN_MARKER}`,
      type: "text",
      skillIds: [`trainer-outside-lesson-skill-${RUN_MARKER}`],
    },
  });
  expectStatus("platform trainer cannot create a lesson outside managed scope", trainerOutsideLesson, 403);

  const trainerLibraryItem = await jsonRequest("/content/library-items", {
    method: "POST",
    token: tokens.get("teacher"),
    csrf,
    body: {
      id: TEACHER_LIBRARY_ID,
      title: "Platform trainer scoped library item",
      pathId: ASSESSMENT_PATH_ID,
      subjectId: ASSESSMENT_SUBJECT_ID,
      skillIds: [`trainer-library-skill-${RUN_MARKER}`],
    },
  });
  expectStatus("platform trainer creates a library item inside managed scope", trainerLibraryItem, 201);

  const trainerOutsideLibraryItem = await jsonRequest("/content/library-items", {
    method: "POST",
    token: tokens.get("teacher"),
    csrf,
    body: {
      id: `${TEACHER_LIBRARY_ID}-outside`,
      title: "Platform trainer outside library item",
      pathId: `outside-path-${RUN_MARKER}`,
      subjectId: `outside-subject-${RUN_MARKER}`,
      skillIds: [`trainer-outside-library-skill-${RUN_MARKER}`],
    },
  });
  expectStatus("platform trainer cannot create a library item outside managed scope", trainerOutsideLibraryItem, 403);

  const trainerCourses = await jsonRequest("/courses?limit=200", { token: tokens.get("teacher") });
  expectStatus("platform trainer reads scoped course catalog", trainerCourses, 200);
  assert.equal(
    trainerCourses.body?.courses?.some(
      (course: any) => String(course.id || course._id || "") === TEACHER_COURSE_ID,
    ),
    true,
    "trainer course list omitted in-scope course",
  );
  assert.equal(
    trainerCourses.body?.courses?.some(
      (course: any) => String(course.id || course._id || "") === COURSE_ID,
    ),
    false,
    "trainer course list leaked a course without managed scope",
  );

  const studentCannotSeePendingTrainerCourse = await jsonRequest(`/courses/${TEACHER_DRAFT_COURSE_ID}`, { token: tokens.get("student") });
  expectStatus("student cannot see a pending trainer course", studentCannotSeePendingTrainerCourse, 404);

  const adminReviewQueue = await jsonRequest("/content/review-queue?limit=100", { token: tokens.get("admin") });
  expectStatus("admin reads the unified pending-content queue", adminReviewQueue, 200);
  assert.equal(
    adminReviewQueue.body?.items?.filter((item: any) => item.type === "course" && String(item.id) === TEACHER_COURSE_ID).length,
    1,
    "pending trainer course was not represented exactly once in the review queue",
  );
  const adminReviewDecision = await jsonRequest(`/content/review-queue/course/${TEACHER_COURSE_ID}`, {
    method: "PATCH",
    token: tokens.get("admin"),
    csrf,
    body: { decision: "rejected", reviewerNotes: "أضف أهداف التعلم قبل إعادة الإرسال" },
  });
  expectStatus("admin records a review decision in the unified queue", adminReviewDecision, 200);
  assert.equal(adminReviewDecision.body?.item?.reviewerNotes, "أضف أهداف التعلم قبل إعادة الإرسال", "review decision note did not persist");

  const adminApprovesTrainerCourse = await jsonRequest(`/courses/${TEACHER_DRAFT_COURSE_ID}`, {
    method: "PATCH",
    token: tokens.get("admin"),
    csrf,
    body: { approvalStatus: "approved", isPublished: true, showOnPlatform: true, reviewerNotes: "جاهزة للنشر" },
  });
  expectStatus("admin approves and publishes trainer course", adminApprovesTrainerCourse, 200);
  assert.equal(adminApprovesTrainerCourse.body?.approvalStatus, "approved", "admin approval did not persist");
  assert.equal(adminApprovesTrainerCourse.body?.reviewerNotes, "جاهزة للنشر", "admin review note did not persist");

  const studentSeesApprovedTrainerCourse = await jsonRequest(`/courses/${TEACHER_DRAFT_COURSE_ID}`, { token: tokens.get("student") });
  expectStatus("student sees an approved published trainer course", studentSeesApprovedTrainerCourse, 200);

  const trainerEditsApprovedCourse = await jsonRequest(`/courses/${TEACHER_DRAFT_COURSE_ID}`, {
    method: "PATCH",
    token: tokens.get("teacher"),
    csrf,
    body: { title: "Platform trainer revised approved course" },
  });
  expectStatus("trainer revision returns an approved course to review", trainerEditsApprovedCourse, 200);
  assert.equal(trainerEditsApprovedCourse.body?.approvalStatus, "pending_review", "trainer revision stayed approved");
  assert.equal(trainerEditsApprovedCourse.body?.isPublished, false, "trainer revision stayed published");

  const trainerContent = await jsonRequest("/content/bootstrap?scope=full", { token: tokens.get("teacher") });
  expectStatus("platform trainer reads scoped learning content", trainerContent, 200);
  assert.equal(trainerContent.body?.lessons?.some((lesson: any) => lesson.id === TEACHER_LESSON_ID), true);
  assert.equal(trainerContent.body?.libraryItems?.some((item: any) => item.id === TEACHER_LIBRARY_ID), true);

  assert.ok(teacherId, "teacher id missing for empty-scope proof");
  await UserModel.updateOne(
    { _id: teacherId },
    { $set: { managedPathIds: [], managedSubjectIds: [] } },
  );
  const emptyScopeCreate = await jsonRequest("/quizzes/questions", {
    method: "POST",
    token: tokens.get("teacher"),
    csrf,
    body: {
      id: `${TEACHER_QUESTION_ID}-empty-scope`,
      text: "Platform trainer must fail closed without assignments",
      options: ["Wrong", "Correct"],
      correctOptionIndex: 1,
      skillIds: [ASSESSMENT_MAIN_SKILL_ID, ASSESSMENT_SUB_SKILL_ID],
      pathId: ASSESSMENT_PATH_ID,
      subject: ASSESSMENT_SUBJECT_ID,
      sectionId: ASSESSMENT_SECTION_ID,
      type: "mcq",
    },
  });
  expectStatus("platform trainer without managed assignments fails closed", emptyScopeCreate, 403);
  await UserModel.updateOne(
    { _id: teacherId },
    { $set: { managedPathIds: [ASSESSMENT_PATH_ID], managedSubjectIds: [ASSESSMENT_SUBJECT_ID] } },
  );

  const supervisorQuiz = await jsonRequest("/quizzes", {
    method: "POST",
    token: tokens.get("supervisor"),
    csrf,
    body: {
      id: SUPERVISOR_QUIZ_ID,
      title: "Platform V3 supervisor directed assessment",
      pathId: ASSESSMENT_PATH_ID,
      subjectId: ASSESSMENT_SUBJECT_ID,
      mode: "central",
      questionIds: [ASSESSMENT_QUESTION_ID],
      targetUserIds: [],
      targetGroupIds: [classId],
      isPublished: true,
      // School-directed tests are intentionally not public. The target learner
      // must still discover, open, and submit this exact assessment.
      showOnPlatform: false,
      access: { type: "free" },
    },
  });
  expectStatus("supervisor creates an assessment for an in-scope student", supervisorQuiz, 201);
  assert.equal(supervisorQuiz.body?.mode, "central", "supervisor assessment lost central mode");
  assert.equal(supervisorQuiz.body?.approvalStatus, "approved", "supervisor assessment was not approved by workflow");

  const supervisorGeneralCourse = await jsonRequest("/courses", {
    method: "POST",
    token: tokens.get("supervisor"),
    csrf,
    body: { id: `supervisor-general-course-${RUN_MARKER}`, title: "Supervisor general course", pathId: ASSESSMENT_PATH_ID, subjectId: ASSESSMENT_SUBJECT_ID },
  });
  expectStatus("supervisor cannot author a general platform course", supervisorGeneralCourse, 403);

  const supervisorGeneralLesson = await jsonRequest("/content/lessons", {
    method: "POST",
    token: tokens.get("supervisor"),
    csrf,
    body: { id: `supervisor-general-lesson-${RUN_MARKER}`, title: "Supervisor general lesson", pathId: ASSESSMENT_PATH_ID, subjectId: ASSESSMENT_SUBJECT_ID, type: "text" },
  });
  expectStatus("supervisor cannot author a general platform lesson", supervisorGeneralLesson, 403);

  const supervisorAssignmentUpdate = await jsonRequest(`/quizzes/${SUPERVISOR_QUIZ_ID}`, {
    method: "PATCH",
    token: tokens.get("supervisor"),
    csrf,
    body: {
      settings: { ...(supervisorQuiz.body?.settings || {}), maxAttempts: 2 },
    },
  });
  expectStatus("supervisor persists the selected directed-assessment attempt limit", supervisorAssignmentUpdate, 200);
  assert.equal(supervisorAssignmentUpdate.body?.settings?.maxAttempts, 2, "supervisor assignment lost its attempt limit");

  const supervisorAlertTitle = `Platform V3 directed assessment alert ${RUN_MARKER}`;
  const supervisorAlert = await jsonRequest("/notifications/student-alert", {
    method: "POST",
    token: tokens.get("supervisor"),
    csrf,
    body: {
      studentIds: [studentId],
      title: supervisorAlertTitle,
      body: "Please complete your directed assessment.",
    },
  });
  expectStatus("supervisor sends a scoped assessment alert to the target student", supervisorAlert, 202);

  const studentNotifications = await jsonRequest("/notifications/me?limit=50", { token: tokens.get("student") });
  expectStatus("target student loads their in-app notifications", studentNotifications, 200);
  assert.ok(
    (studentNotifications.body?.notifications || []).some((notification: any) => notification.title === supervisorAlertTitle),
    "supervisor assessment alert was not visible in the target student's inbox",
  );
  pass("supervisor assessment alert is visible in the target student's inbox");

  const studentCatalog = await jsonRequest("/quizzes", { token: tokens.get("student") });
  expectStatus("targeted student loads the assessment catalogue", studentCatalog, 200);
  const listedForStudent = (studentCatalog.body?.quizzes || []).find((item: any) => item.id === SUPERVISOR_QUIZ_ID);
  assert.ok(listedForStudent, "hidden school-directed assessment was missing from its target student catalogue");
  assert.equal(listedForStudent?.showOnPlatform, false, "school-directed assessment became public");
  assert.equal(listedForStudent?.viewerAudienceVerified, true, "target catalogue lacked server audience verification");

  const outsiderCatalog = await jsonRequest("/quizzes", { token: tokens.get("outsider") });
  expectStatus("outside student loads the assessment catalogue", outsiderCatalog, 200);
  assert.equal(
    (outsiderCatalog.body?.quizzes || []).some((item: any) => item.id === SUPERVISOR_QUIZ_ID),
    false,
    "hidden school-directed assessment leaked into an outside student catalogue",
  );

  const studentDefinition = await jsonRequest(`/quizzes/${SUPERVISOR_QUIZ_ID}`, { token: tokens.get("student") });
  expectStatus("targeted student opens hidden school-directed assessment", studentDefinition, 200);
  const outsiderDefinition = await jsonRequest(`/quizzes/${SUPERVISOR_QUIZ_ID}`, { token: tokens.get("outsider") });
  expectStatus("outside student cannot open hidden school-directed assessment", outsiderDefinition, 403);

  const studentSubmission = await jsonRequest(`/quizzes/${SUPERVISOR_QUIZ_ID}/submit`, {
    method: "POST",
    token: tokens.get("student"),
    csrf,
    body: { answers: { [ASSESSMENT_QUESTION_ID]: 1 }, timeSpentSeconds: 1, source: "tests" },
  });
  expectStatus("targeted student submits hidden school-directed assessment", studentSubmission, 201);

  const secondStudentSubmission = await jsonRequest(`/quizzes/${SUPERVISOR_QUIZ_ID}/submit`, {
    method: "POST",
    token: tokens.get("student"),
    csrf,
    body: { answers: { [ASSESSMENT_QUESTION_ID]: 1 }, timeSpentSeconds: 1, source: "tests" },
  });
  expectStatus("targeted student receives the supervisor-selected second attempt", secondStudentSubmission, 201);

  const blockedThirdStudentSubmission = await jsonRequest(`/quizzes/${SUPERVISOR_QUIZ_ID}/submit`, {
    method: "POST",
    token: tokens.get("student"),
    csrf,
    body: { answers: { [ASSESSMENT_QUESTION_ID]: 1 }, timeSpentSeconds: 1, source: "tests" },
  });
  expectStatus("third submission is rejected after the supervisor-selected limit", blockedThirdStudentSubmission, 409);

  const outsiderSubmission = await jsonRequest(`/quizzes/${SUPERVISOR_QUIZ_ID}/submit`, {
    method: "POST",
    token: tokens.get("outsider"),
    csrf,
    body: { answers: { [ASSESSMENT_QUESTION_ID]: 1 }, timeSpentSeconds: 1, source: "tests" },
  });
  expectStatus("outside student cannot submit hidden school-directed assessment", outsiderSubmission, 403);
}

async function runSchoolScopeJourney(csrf: CsrfContext) {
  const schoolId = groupIds.get("school");
  const classId = groupIds.get("class");
  const siblingClassId = groupIds.get("siblingClass");
  const outsideSchoolId = groupIds.get("outsideSchool");
  const siblingStudentId = scopeStudentIds.get("sibling");
  const outsideSchoolStudentId = scopeStudentIds.get("outsideSchool");
  assert.ok(schoolId && classId && siblingClassId && outsideSchoolId && siblingStudentId && outsideSchoolStudentId, "isolated school scope fixtures missing");

  const schoolSupervisorOutsideReport = await jsonRequest(`/content/schools/${outsideSchoolId}/report`, {
    token: tokens.get("supervisor"),
  });
  expectStatus("school supervisor cannot read another school's report", schoolSupervisorOutsideReport, 403);

  const classSupervisorSchoolReport = await jsonRequest(`/content/schools/${schoolId}/report`, {
    token: tokens.get("classSupervisor"),
  });
  expectStatus("class supervisor cannot read the whole school report", classSupervisorSchoolReport, 403);

  const classSupervisorSiblingClass = await jsonRequest(`/content/groups/${siblingClassId}`, {
    method: "PATCH",
    token: tokens.get("classSupervisor"),
    csrf,
    body: { name: "Unauthorized sibling class update" },
  });
  expectStatus("class supervisor cannot manage a sibling class", classSupervisorSiblingClass, 403);

  const classSupervisorOwnClass = await jsonRequest(`/content/groups/${classId}`, {
    method: "PATCH",
    token: tokens.get("classSupervisor"),
    csrf,
    body: { name: "Platform V3 integration class updated by assigned supervisor" },
  });
  expectStatus("class supervisor manages only the assigned class", classSupervisorOwnClass, 200);

  const classSupervisorScopedResults = await jsonRequest("/quizzes/results/scoped?limit=10", {
    token: tokens.get("classSupervisor"),
  });
  expectStatus("class supervisor reaches scoped results", classSupervisorScopedResults, 200);
  assert.equal(classSupervisorScopedResults.body?.scope?.studentCount, 1, "class supervisor result scope included a sibling class");
  pass("class supervisor result scope excludes sibling-class students");

  const classSupervisorMockAnalytics = await jsonRequest(
    `/quizzes/results/section-analytics/${MOCK_ASSESSMENT_QUIZ_ID}`,
    { token: tokens.get("classSupervisor") },
  );
  expectStatus("class supervisor reads mock section analytics inside assigned class", classSupervisorMockAnalytics, 200);
  assert.equal(classSupervisorMockAnalytics.body?.sections?.length, 2, "class supervisor mock analytics lost sections");
  assert.equal(
    classSupervisorMockAnalytics.body?.sections?.[0]?.attempts,
    1,
    "class supervisor mock analytics did not remain scoped to assigned student attempts",
  );

  const classSupervisorOutsideTarget = await jsonRequest("/quizzes", {
    method: "POST",
    token: tokens.get("classSupervisor"),
    csrf,
    body: {
      id: `${SUPERVISOR_QUIZ_ID}-class-outside`,
      title: "Platform V3 class supervisor outside target",
      pathId: ASSESSMENT_PATH_ID,
      subjectId: ASSESSMENT_SUBJECT_ID,
      mode: "central",
      questionIds: [ASSESSMENT_QUESTION_ID],
      targetUserIds: [siblingStudentId],
      isPublished: true,
      showOnPlatform: true,
      access: { type: "free" },
    },
  });
  expectStatus("class supervisor cannot target a sibling-class student", classSupervisorOutsideTarget, 403);

  const schoolSupervisorOutsideTarget = await jsonRequest("/quizzes", {
    method: "POST",
    token: tokens.get("supervisor"),
    csrf,
    body: {
      id: `${SUPERVISOR_QUIZ_ID}-school-outside`,
      title: "Platform V3 school supervisor outside target",
      pathId: ASSESSMENT_PATH_ID,
      subjectId: ASSESSMENT_SUBJECT_ID,
      mode: "central",
      questionIds: [ASSESSMENT_QUESTION_ID],
      targetUserIds: [outsideSchoolStudentId],
      isPublished: true,
      showOnPlatform: true,
      access: { type: "free" },
    },
  });
  expectStatus("school supervisor cannot target another school's student", schoolSupervisorOutsideTarget, 403);
}

async function runSchoolIntelligenceJourney(csrf: CsrfContext) {
  const studentId = userIds.get("student");
  const outsideSchoolStudentId = scopeStudentIds.get("outsideSchool");
  assert.ok(studentId && outsideSchoolStudentId, "school intelligence fixture students missing");

  const [platformResult, schoolAssessmentResult] = await Promise.all([
    QuizResultModel.findOne({ userId: studentId, quizId: ASSESSMENT_QUIZ_ID }).lean(),
    QuizResultModel.findOne({ userId: studentId, quizId: SUPERVISOR_QUIZ_ID }).lean(),
  ]);
  assert.equal(platformResult?.learningContext, "platform_self_study", "personal platform result was not classified at write time");
  assert.equal(schoolAssessmentResult?.learningContext, "school_assessment", "class-targeted school result was not classified at write time");

  await QuizResultModel.create({
    userId: outsideSchoolStudentId,
    quizId: `platform-v3-outside-intelligence-${RUN_MARKER}`,
    quizTitle: "Outside school intelligence result",
    score: 0,
    totalQuestions: 1,
    learningContext: "platform_self_study",
  });
  const expectedPlatformAttempts = await QuizResultModel.countDocuments({ userId: studentId, learningContext: "platform_self_study" });
  const expectedSchoolAttempts = await QuizResultModel.countDocuments({ userId: studentId, learningContext: "school_assessment" });

  const supervisorIntelligence = await jsonRequest("/classroom/supervisor/intelligence", { token: tokens.get("supervisor") });
  expectStatus("school supervisor reads dual-source intelligence", supervisorIntelligence, 200);
  assert.equal(supervisorIntelligence.body?.intelligence?.comparisonPolicy, "separate_sources_only_no_blended_score", "school intelligence exposed a blended score");
  assert.equal(supervisorIntelligence.body?.intelligence?.platformSelfStudy?.attempts, expectedPlatformAttempts, "school intelligence included another school's platform results");
  assert.equal(supervisorIntelligence.body?.intelligence?.schoolPerformance?.officialAssessments?.attempts, expectedSchoolAttempts, "school intelligence lost scoped school-assessment results");
  assert.equal(supervisorIntelligence.body?.intelligence?.schoolPerformance?.smartClassroom?.responses, 1, "school intelligence lost formative classroom responses");
  assert.ok(Array.isArray(supervisorIntelligence.body?.intelligence?.schoolPerformance?.smartClassroom?.skillHeatmap), "school intelligence skill heatmap missing");
  assert.ok(Array.isArray(supervisorIntelligence.body?.intelligence?.schoolPerformance?.smartClassroom?.weakStudents), "school intelligence weak-student read model missing");

  const classSupervisorIntelligence = await jsonRequest("/classroom/supervisor/intelligence", { token: tokens.get("classSupervisor") });
  expectStatus("class supervisor reads assigned-class intelligence only", classSupervisorIntelligence, 200);
  assert.equal(classSupervisorIntelligence.body?.intelligence?.platformSelfStudy?.attempts, expectedPlatformAttempts, "class intelligence included another school's platform result");
  const studentIntelligence = await jsonRequest("/classroom/supervisor/intelligence", { token: tokens.get("student") });
  expectStatus("student cannot read supervisor intelligence", studentIntelligence, 403);

  const intervention = await jsonRequest("/classroom/supervisor/interventions", { method: "POST", token: tokens.get("supervisor"), csrf, body: { schoolId: groupIds.get("school"), classId: groupIds.get("class"), skillId: "platform-v3-smart-classroom-skill", targetStudentIds: [studentId], pathId: ASSESSMENT_PATH_ID, minimumEvidence: 2 } });
  expectStatus("school supervisor assigns a scoped intervention study plan", intervention, 201);
  assert.equal(intervention.body?.intervention?.actionType, "study_plan", "intervention did not reuse a study plan action");
  assert.equal(intervention.body?.studyPlanIds?.length, 1, "intervention did not create the target student's study plan");
  const outcome = await jsonRequest(`/classroom/supervisor/interventions/${intervention.body?.intervention?._id}/outcome`, { token: tokens.get("supervisor") });
  expectStatus("school supervisor measures intervention outcome", outcome, 200);
  assert.equal(outcome.body?.comparison?.confidence, "insufficient_evidence", "intervention claimed improvement without minimum evidence");
  const classSupervisorOutsideIntervention = await jsonRequest("/classroom/supervisor/interventions", { method: "POST", token: tokens.get("classSupervisor"), csrf, body: { schoolId: groupIds.get("school"), classId: groupIds.get("class"), skillId: "platform-v3-smart-classroom-skill", targetStudentIds: [outsideSchoolStudentId], pathId: ASSESSMENT_PATH_ID } });
  expectStatus("class supervisor cannot target another school's student for intervention", classSupervisorOutsideIntervention, 403);
  const studentInterventions = await jsonRequest("/classroom/supervisor/interventions", { token: tokens.get("student") });
  expectStatus("student cannot read supervisor interventions", studentInterventions, 403);
}

type MongoIndex = {
  key: Record<string, unknown>;
  unique?: boolean;
};

function assertMongoIndex(
  indexes: MongoIndex[],
  key: Record<string, 1 | -1>,
  unique: boolean,
  label: string,
) {
  const matched = indexes.some((index) =>
    Object.entries(key).every(([field, direction]) => index.key[field] === direction) &&
    Object.keys(index.key).length === Object.keys(key).length &&
    Boolean(index.unique) === unique,
  );
  assert.equal(matched, true, `${label}: required additive index was not created`);
}

async function runAssessmentDataEvolutionAdditiveDryRun() {
  const models = [
    AssessmentVersionModel,
    AssessmentAssignmentModel,
    AssessmentAttemptModel,
    AssessmentResponseModel,
    AssessmentResultModel,
    AssessmentMirrorAuditModel,
  ];

  await Promise.all(models.map((model) => model.createIndexes()));

  const [versionIndexes, attemptIndexes, responseIndexes, resultIndexes] = await Promise.all([
    AssessmentVersionModel.collection.indexes() as Promise<MongoIndex[]>,
    AssessmentAttemptModel.collection.indexes() as Promise<MongoIndex[]>,
    AssessmentResponseModel.collection.indexes() as Promise<MongoIndex[]>,
    AssessmentResultModel.collection.indexes() as Promise<MongoIndex[]>,
  ]);

  assertMongoIndex(versionIndexes, { assessmentId: 1, version: 1 }, true, "assessment version");
  assertMongoIndex(attemptIndexes, { assignmentId: 1, studentId: 1, attemptNumber: 1 }, true, "assessment attempt");
  assertMongoIndex(responseIndexes, { attemptId: 1, questionId: 1 }, true, "assessment response");
  assertMongoIndex(resultIndexes, { attemptId: 1 }, true, "assessment result");
  pass("assessment additive models and indexes dry run");
}

async function main() {
  assert.equal(env.NODE_ENV, "test", "Backend integration gate requires NODE_ENV=test");
  assert.ok(
    env.MONGODB_URI.startsWith("mongodb://127.0.0.1:27017/almeaa_platform_v3_ci_") ||
      env.MONGODB_URI.startsWith("mongodb://localhost:27017/almeaa_platform_v3_ci_"),
    "Backend integration gate requires a dedicated localhost CI Mongo database",
  );
  assert.ok(API_BASE.startsWith("http://127.0.0.1:") || API_BASE.startsWith("http://localhost:"), "Backend integration gate must target a local API");
  assert.equal(env.AI_PROVIDER, "none", "Backend integration gate must disable external AI providers");

  await mongoose.connect(env.MONGODB_URI);

  try {
    await runAssessmentDataEvolutionAdditiveDryRun();
    await seedIsolatedUsers();

    const live = await jsonRequest("/health/live");
    expectStatus("health live", live, 200);

    const ready = await jsonRequest("/health/ready");
    expectStatus("health ready", ready, 200);
    assert.equal(ready.body?.ready, true, "health ready did not confirm Mongo connectivity");

    const csrf = await getCsrf();

    const noCsrfLogin = await jsonRequest("/auth/login", {
      method: "POST",
      body: credentials.get("student"),
    });
    expectStatus("login without CSRF is rejected", noCsrfLogin, 403);
    assert.equal(noCsrfLogin.body?.code, "CSRF_TOKEN_INVALID", "login without CSRF returned unexpected error code");

    for (const role of ["student", "outsider", "teacher", "supervisor", "classSupervisor", "schoolAdmin", "parent", "admin"] as Role[]) {
      await loginRole(role, csrf);
    }

    await runSchoolDirectorIdentityJourney(csrf);
    await runSmartClassroomJourney(csrf);
    await runSchoolDirectorDashboardJourney(csrf);
    await runSchoolDirectorDelegatedOperationsJourney(csrf);
    await runSchoolDirectorAcademicClosureJourney(csrf);
    await runAssessmentJourney(csrf);
    await runAssessmentDualWritePrimitiveJourney();
    await runHistoricalResultJourney(csrf);
    await runMockAssessmentJourney(csrf);
    await runScopedCreatorJourney(csrf);
    await runSchoolScopeJourney(csrf);
    await runSchoolIntelligenceJourney(csrf);
    await runTrainerPerformanceJourney();

    const anonymousMine = await jsonRequest("/certificates/mine");
    expectStatus("anonymous certificate list is rejected", anonymousMine, 401);

    const anonymousStudyPlan = await jsonRequest("/ai/study-plan", {
      method: "POST",
      csrf,
      body: { weaknesses: ["algebra"] },
    });
    expectStatus("anonymous study plan is rejected", anonymousStudyPlan, 401);

    const studentAdminUsers = await jsonRequest("/auth/admin/users?limit=10", {
      token: tokens.get("student"),
    });
    expectStatus("student cannot list admin users", studentAdminUsers, 403);

    const teacherAdminUsers = await jsonRequest("/auth/admin/users?limit=10", {
      token: tokens.get("teacher"),
    });
    expectStatus("teacher reaches scoped admin-users handler", teacherAdminUsers, 200);

    const studentQuestion = await jsonRequest("/ai/question", {
      method: "POST",
      token: tokens.get("student"),
      csrf,
      body: { topic: "الجبر" },
    });
    expectStatus("student cannot generate staff AI question", studentQuestion, 403);

    const parentQuestion = await jsonRequest("/ai/question", {
      method: "POST",
      token: tokens.get("parent"),
      csrf,
      body: { topic: "الجبر" },
    });
    expectStatus("parent cannot generate staff AI question", parentQuestion, 403);

    const parentGlobalWeeklyReport = await jsonRequest("/parent/weekly-report/trigger-all", {
      method: "POST",
      token: tokens.get("parent"),
      csrf,
      body: {},
    });
    expectStatus("parent cannot trigger reports for every guardian", parentGlobalWeeklyReport, 403);

    const parentUnverifiedStudentLink = await jsonRequest("/auth/parent/link-student", {
      method: "POST",
      token: tokens.get("parent"),
      csrf,
      body: { nationalId: "1234567890" },
    });
    expectStatus("parent cannot link a student without verified guardianship", parentUnverifiedStudentLink, 403);

    for (const role of ["teacher", "supervisor", "admin"] as Role[]) {
      const result = await jsonRequest("/ai/question", {
        method: "POST",
        token: tokens.get(role),
        csrf,
        body: { topic: "الجبر" },
      });
      expectStatus(`${role} can reach staff AI question handler`, result, 200);
      assert.equal(typeof result.body?.question, "string", `${role}: AI fallback payload missing question`);
    }

    const teacherCertificate = await jsonRequest("/certificates/generate", {
      method: "POST",
      token: tokens.get("teacher"),
      csrf,
      body: { courseId: COURSE_ID },
    });
    expectStatus("teacher cannot issue student certificate", teacherCertificate, 403);

    const studentNoEntitlement = await jsonRequest("/certificates/generate", {
      method: "POST",
      token: tokens.get("student"),
      csrf,
      body: { courseId: COURSE_ID },
    });
    expectStatus("student certificate requires entitlement", studentNoEntitlement, 403);

    const studentCredential = credentials.get("student");
    assert.ok(studentCredential, "student credential missing");
    const student = await UserModel.findOne({ email: studentCredential.email });
    assert.ok(student, "student missing from isolated database");

    student.enrolledCourses = [COURSE_ID];
    await student.save();

    const incompleteCertificate = await jsonRequest("/certificates/generate", {
      method: "POST",
      token: tokens.get("student"),
      csrf,
      body: { courseId: COURSE_ID },
    });
    expectStatus("student certificate requires full completion", incompleteCertificate, 400);
    assert.equal(incompleteCertificate.body?.completionPercentage, 0, "incomplete certificate returned unexpected percentage");

    student.completedLessons = LESSON_IDS;
    await student.save();

    const issuedCertificate = await jsonRequest("/certificates/generate", {
      method: "POST",
      token: tokens.get("student"),
      csrf,
      body: { courseId: COURSE_ID },
    });
    expectStatus("eligible completed student receives isolated certificate", issuedCertificate, 201);
    assert.equal(issuedCertificate.body?.completionPercentage, 100, "issued certificate is not 100% complete");
    assert.equal(typeof issuedCertificate.body?.verificationCode, "string", "issued certificate verification code missing");

    const repeatedCertificate = await jsonRequest("/certificates/generate", {
      method: "POST",
      token: tokens.get("student"),
      csrf,
      body: { courseId: COURSE_ID },
    });
    expectStatus("certificate generation is idempotent", repeatedCertificate, 200);
    assert.equal(
      repeatedCertificate.body?.verificationCode,
      issuedCertificate.body?.verificationCode,
      "idempotent certificate returned a different verification code",
    );

    const mine = await jsonRequest("/certificates/mine", {
      token: tokens.get("student"),
    });
    expectStatus("student can list own certificate", mine, 200);
    assert.equal(Array.isArray(mine.body?.certificates), true, "certificate list shape is invalid");
    assert.equal(mine.body.certificates.length, 1, "student certificate list should contain exactly one isolated certificate");

    const invalidCertificate = await jsonRequest(`/certificates/platform-v3-invalid-${RUN_MARKER}`);
    expectStatus("invalid public certificate fails safely", invalidCertificate, 404);

    const certificateCount = await CertificateModel.countDocuments({ courseId: COURSE_ID });
    assert.equal(certificateCount, 1, "isolated certificate idempotency failed at database level");

    await runAdminUserManagementJourney(csrf);

    console.log("Backend integration gate PASS");
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

main().catch(async (error) => {
  console.error("Backend integration gate FAIL:", error instanceof Error ? error.message : String(error));
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect().catch(() => undefined);
  }
  process.exit(1);
});
