import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { UserModel } from "../models/User.js";
import { CourseModel } from "../models/Course.js";
import { CertificateModel } from "../models/Certificate.js";
import { PathModel } from "../models/Path.js";
import { GroupModel } from "../models/Group.js";
import { QuizModel } from "../models/Quiz.js";

type Role = "student" | "outsider" | "teacher" | "supervisor" | "classSupervisor" | "parent" | "admin";

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
const ASSESSMENT_QUESTION_ID = `platform-v3-integration-question-${RUN_MARKER}`;
const ASSESSMENT_QUIZ_ID = `platform-v3-integration-quiz-${RUN_MARKER}`;
const MISSING_QUESTION_QUIZ_ID = `platform-v3-integration-missing-question-quiz-${RUN_MARKER}`;
const MISSING_QUESTION_ID = `platform-v3-integration-missing-question-${RUN_MARKER}`;
const MOCK_ASSESSMENT_QUESTION_ID = `platform-v3-integration-mock-question-${RUN_MARKER}`;
const MOCK_ASSESSMENT_QUIZ_ID = `platform-v3-integration-mock-quiz-${RUN_MARKER}`;
const TEACHER_QUIZ_ID = `platform-v3-integration-teacher-quiz-${RUN_MARKER}`;
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
  const roles: Role[] = ["student", "outsider", "teacher", "supervisor", "classSupervisor", "parent", "admin"];

  for (const role of roles) {
    const password = randomBytes(24).toString("base64url");
    const email = `platform-v3-${role}-${RUN_MARKER}@example.invalid`;
    credentials.set(role, { email, password });

    const user = await UserModel.create({
      name: `Platform V3 ${role}`,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: role === "outsider" ? "student" : role === "classSupervisor" ? "supervisor" : role,
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
  const expectedRole = role === "outsider" ? "student" : role === "classSupervisor" ? "supervisor" : role;
  assert.equal(result.body?.user?.role, expectedRole, `${role}: login returned wrong role`);
  assert.equal(typeof result.body?.token, "string", `${role}: test-mode bearer token missing`);
  tokens.set(role, result.body.token);
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
      skillIds: [`platform-v3-integration-skill-${RUN_MARKER}`],
      pathId: ASSESSMENT_PATH_ID,
      subject: ASSESSMENT_SUBJECT_ID,
      approvalStatus: "approved",
    },
  });
  expectStatus("admin creates an approved assessment question", question, 201);

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
      settings: { maxAttempts: 1, passingScore: 60 },
    },
  });
  expectStatus("admin creates a published directed assessment", quiz, 201);
  assert.equal(quiz.body?.id, ASSESSMENT_QUIZ_ID, "created assessment id mismatch");
  assert.equal(quiz.body?.isPublished, true, "admin assessment was not published");

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

  const repeatedSubmission = await jsonRequest(`/quizzes/${ASSESSMENT_QUIZ_ID}/submit`, {
    method: "POST",
    token: tokens.get("student"),
    csrf,
    body: { answers: { [ASSESSMENT_QUESTION_ID]: 1 }, timeSpentSeconds: 1, source: "tests" },
  });
  expectStatus("assessment max-attempt guard rejects repeat submission", repeatedSubmission, 409);
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
      skillIds: [`platform-v3-integration-mock-skill-${RUN_MARKER}`],
      pathId: ASSESSMENT_PATH_ID,
      subject: ASSESSMENT_SUBJECT_ID,
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

  const sectionAnalytics = await jsonRequest(`/quizzes/results/section-analytics/${MOCK_ASSESSMENT_QUIZ_ID}`, {
    token: tokens.get("admin"),
  });
  expectStatus("admin reads mock section analytics from stored result", sectionAnalytics, 200);
  assert.equal(sectionAnalytics.body?.sections?.length, 2, "mock section analytics did not return both sections");
}

async function runScopedCreatorJourney(csrf: CsrfContext) {
  const studentId = userIds.get("student");
  assert.ok(studentId, "target student id missing for scoped creator checks");

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
      targetUserIds: [studentId],
      isPublished: true,
      showOnPlatform: true,
      access: { type: "free" },
    },
  });
  expectStatus("supervisor creates an assessment for an in-scope student", supervisorQuiz, 201);
  assert.equal(supervisorQuiz.body?.mode, "central", "supervisor assessment lost central mode");
  assert.equal(supervisorQuiz.body?.approvalStatus, "approved", "supervisor assessment was not approved by workflow");
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

    for (const role of ["student", "outsider", "teacher", "supervisor", "classSupervisor", "parent", "admin"] as Role[]) {
      await loginRole(role, csrf);
    }

    await runAssessmentJourney(csrf);
    await runMockAssessmentJourney(csrf);
    await runScopedCreatorJourney(csrf);
    await runSchoolScopeJourney(csrf);

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
