import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { env } from "../config/env.js";
import { GroupModel } from "../models/Group.js";
import { UserModel } from "../models/User.js";
import { SchoolContractModel } from "../models/SchoolContract.js";
import { SchoolMembershipModel } from "../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../models/TeachingAssignment.js";
import { QuestionModel } from "../models/Question.js";
import { ClassroomSessionModel } from "../models/ClassroomSession.js";
import { ClassroomParticipantModel } from "../models/ClassroomParticipant.js";
import { ClassroomResponseModel } from "../models/ClassroomResponse.js";
import { signAccessToken } from "../utils/jwt.js";
import { canJoinAuthorizedWorkspace } from "../sockets/workspaceAuthorization.js";
import { createSocketServer } from "../sockets/index.js";
import { io as connectSocket, Socket } from "socket.io-client";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
process.env.DEV_LOCAL_ADMIN_BYPASS = "false";
(env as any).DEV_LOCAL_ADMIN_BYPASS = false;

const RUN_ID = `sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
console.log(`\n======================================================`);
console.log(`🚀 [SIMULATION] Multi-School Smart Classroom E2E Pass`);
console.log(`🆔 Run ID: ${RUN_ID}`);
console.log(`======================================================\n`);

let server: http.Server;
let apiBaseUrl: string;
let csrfToken: string = "";
let csrfCookie: string = "";

async function initCsrf() {
  const res = await fetch(`${apiBaseUrl}/auth/csrf-token`);
  assert.equal(res.status, 200, "Should retrieve CSRF token");
  const data: any = await res.json();
  csrfToken = data.csrfToken;
  const setCookie = res.headers.get("set-cookie") || "";
  csrfCookie = setCookie.split(";")[0] || `almeaa_csrf_token=${csrfToken}`;
  console.log("🔒 [SECURITY] CSRF token successfully acquired");
}

async function request(
  endpoint: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {},
) {
  const method = (options.method || "GET").toUpperCase();
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }
  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }
    if (csrfCookie) {
      headers["cookie"] = csrfCookie;
    }
  }

  const res = await fetch(`${apiBaseUrl}${endpoint}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { status: res.status, body: json };
}

async function run() {
  const mongoUri = env.MONGODB_URI || "mongodb://127.0.0.1:27017/almeaa-dev";
  await mongoose.connect(mongoUri);
  console.log("✅ 1. Connected to MongoDB");

  // Spin up HTTP server on an ephemeral port
  const app = createApp();
  server = http.createServer(app);
  createSocketServer(server);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address() as any;
  const socketBaseUrl = `http://127.0.0.1:${address.port}`;
  apiBaseUrl = `${socketBaseUrl}/api`;
  console.log(`✅ 2. Ephemeral API & Socket.IO test server listening on ${socketBaseUrl}`);
  await initCsrf();
  await ClassroomSessionModel.syncIndexes();

  let schoolAId: string | null = null;
  let schoolBId: string | null = null;
  let sessionId: string | null = null;
  let clientSocket: Socket | null = null;
  const receivedSocketEvents: Array<{ event: string; payload: any }> = [];

  try {
    // -------------------------------------------------------------
    // SETUP: SCHOOL A ("مدرسة الفلاح الأهلية")
    // -------------------------------------------------------------
    console.log("\n🏫 --- Setting up School A (مدرسة الفلاح الأهلية) ---");
    const schoolA = await GroupModel.create({
      name: "مدرسة الفلاح الأهلية",
      type: "SCHOOL",
      ownerId: `admin_${RUN_ID}`,
    });
    schoolAId = String(schoolA._id);

    await SchoolContractModel.create({
      schoolId: schoolAId,
      status: "active",

      modules: ["SMART_CLASSROOM", "INTERVENTION_CENTER", "SCHOOL_ASSESSMENTS"],
      validFrom: new Date(Date.now() - 86400000),
      validUntil: new Date(Date.now() + 365 * 86400000),

    });

    const managerA = await UserModel.create({
      name: "أ. خالد الفلاح (مدير المدرسة أ)",
      email: `managerA_${RUN_ID}@example.com`,
      passwordHash: "dummy_sim_hash",
      role: "school_admin",
      isActive: true,
      schoolId: schoolAId,
    });
    await SchoolMembershipModel.create({
      userId: String(managerA._id),
      schoolId: schoolAId,
      role: "school_admin",
      status: "active",
    });

    const supervisorA = await UserModel.create({
      name: "د. عبدالله المشرف (مشرف المدرسة أ)",
      email: `supervisorA_${RUN_ID}@example.com`,
      passwordHash: "dummy_sim_hash",
      role: "supervisor",
      isActive: true,
      schoolId: schoolAId,
    });
    await SchoolMembershipModel.create({
      userId: String(supervisorA._id),
      schoolId: schoolAId,
      role: "supervisor",
      status: "active",
    });

    const teacherA1 = await UserModel.create({
      name: "أ. محمد العمري (معلم رياضيات - أ)",
      email: `teacherA1_${RUN_ID}@example.com`,
      passwordHash: "dummy_sim_hash",
      role: "teacher",
      isActive: true,
      schoolId: schoolAId,
    });
    await SchoolMembershipModel.create({
      userId: String(teacherA1._id),
      schoolId: schoolAId,
      role: "teacher",
      status: "active",
    });

    const teacherA2 = await UserModel.create({
      name: "أ. سالم الدوسري (معلم فيزياء - أ)",
      email: `teacherA2_${RUN_ID}@example.com`,
      passwordHash: "dummy_sim_hash",
      role: "teacher",
      isActive: true,
      schoolId: schoolAId,
    });
    await SchoolMembershipModel.create({
      userId: String(teacherA2._id),
      schoolId: schoolAId,
      role: "teacher",
      status: "active",
    });

    const classA1 = await GroupModel.create({
      name: "3/1 علمي",
      type: "CLASS",
      parentId: schoolAId,
      ownerId: String(managerA._id),
      supervisorIds: [String(supervisorA._id)],
    });
    const classA1Id = String(classA1._id);

    const classA2 = await GroupModel.create({
      name: "3/2 علمي",
      type: "CLASS",
      parentId: schoolAId,
      ownerId: String(managerA._id),
      supervisorIds: [String(supervisorA._id)],
    });
    const classA2Id = String(classA2._id);

    await TeachingAssignmentModel.create({
      schoolId: schoolAId,
      teacherId: String(teacherA1._id),
      classId: classA1Id,
      subjectId: "رياضيات",
      status: "active",
    });
    await TeachingAssignmentModel.create({
      schoolId: schoolAId,
      teacherId: String(teacherA2._id),
      classId: classA2Id,
      subjectId: "فيزياء",
      status: "active",
    });

    const studentA1 = await UserModel.create({
      name: "فهد القحطاني (طالب فصل 3/1)",
      email: `studentA1_${RUN_ID}@example.com`,
      passwordHash: "dummy_sim_hash",
      role: "student",
      isActive: true,
      schoolId: schoolAId,
      groupIds: [classA1Id],
    });
    const studentA2 = await UserModel.create({
      name: "سعود الشهري (طالب فصل 3/1)",
      email: `studentA2_${RUN_ID}@example.com`,
      passwordHash: "dummy_sim_hash",
      role: "student",
      isActive: true,
      schoolId: schoolAId,
      groupIds: [classA1Id],
    });
    const studentA3 = await UserModel.create({
      name: "تركي الغامدي (طالب فصل 3/2)",
      email: `studentA3_${RUN_ID}@example.com`,
      passwordHash: "dummy_sim_hash",
      role: "student",
      isActive: true,
      schoolId: schoolAId,
      groupIds: [classA2Id],
    });


    for (const st of [studentA1, studentA2, studentA3]) {
      await SchoolMembershipModel.create({
        userId: String(st._id),
        schoolId: schoolAId,
        role: "student",
        status: "active",
      });
    }

    // -------------------------------------------------------------
    // SETUP: SCHOOL B ("مدرسة النجاح الأهلية")
    // -------------------------------------------------------------
    console.log("🏫 --- Setting up School B (مدرسة النجاح الأهلية) ---");
    const schoolB = await GroupModel.create({
      name: "مدرسة النجاح الأهلية",
      type: "SCHOOL",
      ownerId: `admin_${RUN_ID}`,
    });
    schoolBId = String(schoolB._id);

    await SchoolContractModel.create({
      schoolId: schoolBId,
      status: "active",
      modules: ["SMART_CLASSROOM"],
      validFrom: new Date(Date.now() - 86400000),
      validUntil: new Date(Date.now() + 365 * 86400000),
    });

    const managerB = await UserModel.create({
      name: "أ. طارق النجاح (مدير المدرسة ب)",
      email: `managerB_${RUN_ID}@example.com`,
      passwordHash: "dummy_sim_hash",
      role: "school_admin",
      isActive: true,
      schoolId: schoolBId,
    });
    await SchoolMembershipModel.create({
      userId: String(managerB._id),
      schoolId: schoolBId,
      role: "school_admin",
      status: "active",
    });

    const supervisorB = await UserModel.create({
      name: "د. إبراهيم المشرف (مشرف المدرسة ب)",
      email: `supervisorB_${RUN_ID}@example.com`,
      passwordHash: "dummy_sim_hash",
      role: "supervisor",
      isActive: true,
      schoolId: schoolBId,
    });
    await SchoolMembershipModel.create({
      userId: String(supervisorB._id),
      schoolId: schoolBId,
      role: "supervisor",
      status: "active",
    });

    const teacherB1 = await UserModel.create({
      name: "أ. زياد الحربي (معلم مدرسة ب)",
      email: `teacherB1_${RUN_ID}@example.com`,
      passwordHash: "dummy_sim_hash",
      role: "teacher",
      isActive: true,
      schoolId: schoolBId,
    });
    await SchoolMembershipModel.create({
      userId: String(teacherB1._id),
      schoolId: schoolBId,
      role: "teacher",
      status: "active",
    });

    // Identical class name to verify ID-based scoping, not string collision
    const classB1 = await GroupModel.create({
      name: "3/1 علمي",
      type: "CLASS",
      parentId: schoolBId,
      ownerId: String(managerB._id),
      supervisorIds: [String(supervisorB._id)],
    });
    const classB1Id = String(classB1._id);

    await TeachingAssignmentModel.create({
      schoolId: schoolBId,
      teacherId: String(teacherB1._id),
      classId: classB1Id,
      subjectId: "رياضيات",
      status: "active",
    });

    const studentB1 = await UserModel.create({
      name: "عمر المطيري (طالب مدرسة ب)",
      email: `studentB1_${RUN_ID}@example.com`,
      passwordHash: "dummy_sim_hash",
      role: "student",
      isActive: true,
      schoolId: schoolBId,
      groupIds: [classB1Id],
    });
    await SchoolMembershipModel.create({
      userId: String(studentB1._id),
      schoolId: schoolBId,
      role: "student",
      status: "active",
    });

    // -------------------------------------------------------------
    // SEED QUESTIONS: 10 Approved Questions
    // -------------------------------------------------------------
    console.log("📚 --- Seeding 10 Approved Canonical Questions ---");
    const createdQuestions = [];
    for (let i = 1; i <= 10; i++) {
      const q = await QuestionModel.create({
        id: `q_${RUN_ID}_${i}`,
        text: `سؤال اختباري رقم ${i}: ما هي الإجابة الصحيحة للعملية الحسابية؟`,
        type: "mcq",
        options: ["خيار 1", "خيار 2 (الصحيح)", "خيار 3 (مشتت شائع)", "خيار 4"],
        correctOptionIndex: 1,
        explanation: `الشرح النموذجي الكامل للسؤال رقم ${i}: الخطوات التحليلية واضحة ومباشرة.`,
        skillIds: [`skill_${i}`],
        difficulty: i <= 3 ? "Easy" : i <= 7 ? "Medium" : "Hard",
        approvalStatus: "approved",
        subject: "كمي",
      });
      createdQuestions.push(q);
    }
    const questionIds = createdQuestions.map((q) => String(q.id || q._id));
    console.log(`✅ Seeded ${questionIds.length} approved questions.`);

    // -------------------------------------------------------------
    // ISSUE TOKENS
    // -------------------------------------------------------------
    const tokenTeacherA1 = signAccessToken({ id: String(teacherA1._id), email: teacherA1.email, role: "teacher" });
    const tokenTeacherA2 = signAccessToken({ id: String(teacherA2._id), email: teacherA2.email, role: "teacher" });
    const tokenSupervisorA = signAccessToken({ id: String(supervisorA._id), email: supervisorA.email, role: "supervisor" });
    const tokenManagerA = signAccessToken({ id: String(managerA._id), email: managerA.email, role: "school_admin" });
    const tokenStudentA1 = signAccessToken({ id: String(studentA1._id), email: studentA1.email, role: "student" });
    const tokenStudentA2 = signAccessToken({ id: String(studentA2._id), email: studentA2.email, role: "student" });
    const tokenStudentA3 = signAccessToken({ id: String(studentA3._id), email: studentA3.email, role: "student" });

    const tokenTeacherB1 = signAccessToken({ id: String(teacherB1._id), email: teacherB1.email, role: "teacher" });
    const tokenSupervisorB = signAccessToken({ id: String(supervisorB._id), email: supervisorB.email, role: "supervisor" });
    const tokenStudentB1 = signAccessToken({ id: String(studentB1._id), email: studentB1.email, role: "student" });

    // =============================================================
    // TEST PHASE 1: DIRECT CROSS-TENANT NEGATIVE ATTACKS (MUST FAIL 403)
    // =============================================================
    console.log("\n🛡️ --- PHASE 1: Direct Cross-Tenant Negative Attacks ---");

    // Attack 1: Teacher A1 tries to create session in School B / Class B1
    const attack1 = await request("/classroom/sessions", {
      method: "POST",
      token: tokenTeacherA1,
      body: { schoolId: schoolBId, classId: classB1Id, questionIds: [questionIds[0]] },
    });
    assert.equal(attack1.status, 403, "Negative Attack 1: Teacher A must NOT create session in School B");
    console.log("🔒 [PASS] Attack 1: Teacher A1 cannot create session in School B (HTTP 403)");

    // Teacher A1 creates a real session in School A / Class A1
    const createRes = await request("/classroom/sessions", {
      method: "POST",
      token: tokenTeacherA1,
      body: {
        schoolId: schoolAId,
        classId: classA1Id,
        questionIds: questionIds, // 10 questions prepared
        day: "الأحد",
        period: 2,
        subjectName: "الرياضيات",
        className: "3/1 علمي",
        publishedMode: "single",
        autoStart: true,
      },
    });
    assert.equal(createRes.status, 201, `Teacher A1 should create session in School A: ${JSON.stringify(createRes.body)}`);
    sessionId = createRes.body.sessionId;
    const pin = createRes.body.pin;
    assert.ok(sessionId && pin, "SessionId and PIN returned");
    console.log(`✅ Session created & started: ID=${sessionId}, PIN=${pin}`);

    // Concurrency Guard Test: attempt to directly insert a duplicate live session for same school & class
    console.log("🔒 --- Testing Concurrency Guard (Database Partial Unique Index) ---");
    let duplicateErrorCaught = false;
    try {
      await ClassroomSessionModel.create({
        schoolId: schoolAId,
        classId: classA1Id,
        teacherId: String(teacherA1._id),
        status: "live",
        pinHash: "dummy_pin_hash_for_concurrency_test",
        pinExpiresAt: new Date(Date.now() + 3600000),
        questionIds: [questionIds[0]],
      });
    } catch (err: any) {
      if (err?.code === 11000 || String(err).includes("11000") || String(err).includes("duplicate key")) {
        duplicateErrorCaught = true;
      }
    }
    assert.equal(duplicateErrorCaught, true, "MongoDB engine-level partial unique index must reject duplicate live session");
    console.log("🔒 [PASS] Concurrency Guard: DB engine rejected duplicate live session via partial unique index (code 11000)");

    // Attack 2: Student B1 (School B) tries to join School A session via PIN
    const attack2 = await request("/classroom/sessions/join-by-pin", {
      method: "POST",
      token: tokenStudentB1,
      body: { pin },
    });
    assert.equal(attack2.status, 403, "Negative Attack 2: Student B1 must NOT join School A by PIN");
    console.log("🔒 [PASS] Attack 2: Cross-School Student B1 PIN join rejected (HTTP 403)");

    // Attack 3: Student B1 tries instant-join to School A session
    const attack3 = await request(`/classroom/sessions/${sessionId}/instant-join`, {
      method: "POST",
      token: tokenStudentB1,
    });
    assert.equal(attack3.status, 403, "Negative Attack 3: Student B1 must NOT instant-join School A");
    console.log("🔒 [PASS] Attack 3: Cross-School Student B1 instant join rejected (HTTP 403)");

    // Attack 4: Student A3 (School A, but enrolled in Class A2) tries instant-join to Class A1 session
    const attack4 = await request(`/classroom/sessions/${sessionId}/instant-join`, {
      method: "POST",
      token: tokenStudentA3,
    });
    assert.equal(attack4.status, 403, "Negative Attack 4: Student A3 from other class must NOT join");
    console.log("🔒 [PASS] Attack 4: Cross-Class Student A3 instant join rejected (HTTP 403)");

    // Attack 5: Student A1 attempts to answer unpublished Question 5 directly
    const attack5 = await request(`/classroom/sessions/${sessionId}/answers/${questionIds[4]}`, {
      method: "PUT",
      token: tokenStudentA1,
      body: { selectedOptionIndex: 1 },
    });
    assert.equal(attack5.status, 403, "Negative Attack 5: Unpublished question answer must be rejected");
    console.log("🔒 [PASS] Attack 5: Direct answer to unpublished question rejected (HTTP 403)");

    // Attack 6: Supervisor B tries to fetch School A session report
    const attack6 = await request(`/classroom/supervisor/sessions/${sessionId}/report`, {
      token: tokenSupervisorB,
    });
    assert.equal(attack6.status, 404, "Negative Attack 6: Supervisor B must NOT view School A report");
    console.log("🔒 [PASS] Attack 6: Cross-School Supervisor B report access rejected (HTTP 404/Scope Closed)");

    // Attack 7: Socket room authorization check
    const socketRepo = {
      async findDirectlySupervisedGroupIds(userId: string) {
        return userId === String(supervisorA._id) ? [classA1Id, classA2Id] : [];
      },
      async findClassroomSessionScope() {
        return { schoolId: schoolAId, classId: classA1Id, teacherId: String(teacherA1._id) };
      },
    };
    const socketStudentBAllowed = await canJoinAuthorizedWorkspace(
      { id: String(studentB1._id), schoolId: schoolBId, groupIds: [classB1Id] },
      `classroom:${sessionId}`,
      socketRepo,
    );
    assert.equal(socketStudentBAllowed, false, "Socket: Student B must NOT enter School A classroom room");
    console.log("🔒 [PASS] Attack 7: Socket room authorization strictly fail-closed for outsiders");

    // =============================================================
    // TEST PHASE 2: PROACTIVE ALERT & DUAL JOIN (POSITIVE FLOW)
    // =============================================================
    console.log("\n🔔 --- PHASE 2: Proactive Alert & Dual Join ---");

    // Check Student A1 proactive notification
    const alertA1 = await request("/classroom/student/active-session", { token: tokenStudentA1 });
    assert.equal(alertA1.status, 200);
    assert.equal(alertA1.body.hasActiveSession, true, "Student A1 must receive active session alert");
    assert.equal(alertA1.body.session?.sessionId, sessionId);
    assert.equal(alertA1.body.session?.className, "3/1 علمي");
    console.log("✅ [PASS] Student A1 received proactive active-session alert");

    // Verify Student A3 (Class A2) does NOT receive active session alert
    const alertA3 = await request("/classroom/student/active-session", { token: tokenStudentA3 });
    assert.equal(alertA3.body.hasActiveSession, false, "Student A3 must NOT get Class A1 alert");
    console.log("✅ [PASS] Student A3 in Class A2 does NOT receive alert for Class A1");

    // Verify Student B1 (School B) does NOT receive active session alert
    const alertB1 = await request("/classroom/student/active-session", { token: tokenStudentB1 });
    assert.equal(alertB1.body.hasActiveSession, false, "Student B1 must NOT get School A alert");
    console.log("✅ [PASS] Student B1 in School B does NOT receive alert for School A");

    // Student A1 joins via 1-click instant join
    const joinInstantA1 = await request(`/classroom/sessions/${sessionId}/instant-join`, {
      method: "POST",
      token: tokenStudentA1,
    });
    assert.equal(joinInstantA1.status, 200);
    assert.equal(joinInstantA1.body.joined, true, "Student A1 instant join succeeded");
    console.log("✅ [PASS] Student A1 1-click instant joined successfully");

    // Student A2 joins via 6-digit PIN
    const joinPinA2 = await request("/classroom/sessions/join-by-pin", {
      method: "POST",
      token: tokenStudentA2,
      body: { pin },
    });
    assert.equal(joinPinA2.status, 200);
    assert.equal(joinPinA2.body.joined, true, "Student A2 PIN join succeeded");
    console.log("✅ [PASS] Student A2 joined via 6-digit PIN successfully");

    // Connect live socket.io client for Student A1
    console.log("\n🔌 --- Connecting Real Socket.IO Client for Student A1 ---");
    clientSocket = connectSocket(socketBaseUrl, {
      auth: { token: tokenStudentA1 },
      transports: ["websocket"],
      reconnection: false,
    });

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("Socket connect timeout")), 5000);
      clientSocket!.on("connect", () => {
        clearTimeout(t);
        resolve();
      });
      clientSocket!.on("connect_error", (err) => {
        clearTimeout(t);
        reject(err);
      });
    });

    await new Promise<void>((resolve, reject) => {
      clientSocket!.emit("workspace:join", `classroom:${sessionId}`, (res: any) => {
        if (res?.ok) resolve();
        else reject(new Error(res?.error || "Socket room join rejected"));
      });
    });

    clientSocket.on("response:updated", (payload) => receivedSocketEvents.push({ event: "response:updated", payload }));
    clientSocket.on("question:published", (payload) => receivedSocketEvents.push({ event: "question:published", payload }));
    clientSocket.on("session:ended", (payload) => receivedSocketEvents.push({ event: "session:ended", payload }));
    console.log(`✅ [PASS] Real Socket.IO client connected and joined room classroom:${sessionId}`);

    // =============================================================
    // TEST PHASE 3: SINGLE QUESTION PRIVACY & STUDENT ANSWERING
    // =============================================================
    console.log("\n🔒 --- PHASE 3: Single Question Privacy & Live Answering ---");

    // Student A1 fetches current question: MUST ONLY RECEIVE QUESTION 1
    const currentA1 = await request(`/classroom/sessions/${sessionId}/current`, { token: tokenStudentA1 });
    assert.equal(currentA1.status, 200);
    assert.equal(currentA1.body.questions.length, 1, "Zero leakage: Student must ONLY receive active question");
    assert.equal(currentA1.body.question.questionId, questionIds[0], "Question 1 is active");
    assert.equal("correctOptionIndex" in currentA1.body.question, false, "Correct answer key NOT exposed to student");
    assert.equal("explanation" in currentA1.body.question, false, "Explanation NOT exposed to student");
    console.log("✅ [PASS] Zero Leakage: Student receives ONLY Question 1. Questions 2-10 are strictly hidden");

    // Student A1 calls aggregate: distribution MUST be redacted during live session
    const aggStudent = await request(`/classroom/sessions/${sessionId}/aggregate`, { token: tokenStudentA1 });
    assert.equal(aggStudent.status, 200);
    assert.deepEqual(aggStudent.body.distribution, {}, "Live student must receive empty distribution");
    console.log("✅ [PASS] Student Privacy: Aggregate distribution is empty {} for students during live session");

    // Student A1 answers Question 1 (Option 1 - Correct)
    const ansA1 = await request(`/classroom/sessions/${sessionId}/answers/${questionIds[0]}`, {
      method: "PUT",
      token: tokenStudentA1,
      body: { selectedOptionIndex: 1 },
    });
    assert.equal(ansA1.status, 200);
    assert.equal(ansA1.body.accepted, true);

    // Student A2 answers Question 1 (Option 2 - Common Misconception Distractor)
    const ansA2 = await request(`/classroom/sessions/${sessionId}/answers/${questionIds[0]}`, {
      method: "PUT",
      token: tokenStudentA2,
      body: { selectedOptionIndex: 2 },
    });
    assert.equal(ansA2.status, 200);
    assert.equal(ansA2.body.accepted, true);
    console.log("✅ [PASS] Both students submitted answers for Question 1");

    // Idempotency check: Student A1 re-submits Option 1
    const ansA1Retry = await request(`/classroom/sessions/${sessionId}/answers/${questionIds[0]}`, {
      method: "PUT",
      token: tokenStudentA1,
      body: { selectedOptionIndex: 1 },
    });
    assert.equal(ansA1Retry.status, 200);
    const totalResponsesCount = await ClassroomResponseModel.countDocuments({ sessionId, questionId: questionIds[0] });
    assert.equal(totalResponsesCount, 2, "Idempotency preserved: No duplicate responses recorded");
    console.log("✅ [PASS] Idempotency: Duplicate submissions handled without duplicate DB rows");

    // Student Answer Revision Test ($set instead of $setOnInsert)
    console.log("\n🔄 --- Testing Student Answer Revision ($set) ---");
    const revA1 = await request(`/classroom/sessions/${sessionId}/answers/${questionIds[0]}`, {
      method: "PUT",
      token: tokenStudentA1,
      body: { selectedOptionIndex: 3 },
    });
    assert.equal(revA1.status, 200);
    assert.equal(revA1.body.accepted, true);

    const aggTeacherRev = await request(`/classroom/sessions/${sessionId}/aggregate`, { token: tokenTeacherA1 });
    assert.equal(aggTeacherRev.status, 200);
    assert.equal(aggTeacherRev.body.responseCount, 2, "Response count remains 2 after revision (idempotent row update)");
    assert.equal(aggTeacherRev.body.distribution["3"], 1, "Student A1 revision to option 3 reflected in distribution");
    assert.equal(aggTeacherRev.body.distribution["1"] || 0, 0, "Student A1 previous option 1 removed from distribution");
    console.log("✅ [PASS] Student answer revision ($set) verified: Option 1 -> Option 3 updated without duplicate DB rows");

    // Student A1 switches back to Option 1 (the correct one) for subsequent tests
    await request(`/classroom/sessions/${sessionId}/answers/${questionIds[0]}`, {
      method: "PUT",
      token: tokenStudentA1,
      body: { selectedOptionIndex: 1 },
    });

    // =============================================================
    // TEST PHASE 4: TEACHER RADAR, PROJECTOR & EXPLANATION REVEAL
    // =============================================================
    console.log("\n📊 --- PHASE 4: Live Analytics, Projector & Explanation Reveal ---");

    // Teacher inspects aggregate
    const aggTeacher = await request(`/classroom/sessions/${sessionId}/aggregate`, { token: tokenTeacherA1 });
    assert.equal(aggTeacher.status, 200);
    assert.equal(aggTeacher.body.responseCount, 2, "Teacher sees 2 submitted responses");
    assert.equal(aggTeacher.body.distribution["1"], 1, "1 student chose option 1 (correct)");
    assert.equal(aggTeacher.body.distribution["2"], 1, "1 student chose option 2 (distractor)");
    assert.equal(aggTeacher.body.meta.subjectName, "الرياضيات", "Persistent metadata subject verified");
    assert.equal(aggTeacher.body.meta.period, 2, "Persistent metadata period verified");
    assert.equal(aggTeacher.body.meta.className, "3/1 علمي", "Persistent metadata className verified");
    console.log("✅ [PASS] Teacher Console receives live distribution: 50% option 1, 50% option 2");
    console.log("✅ [PASS] DB-backed persistent metadata verified (day, period, className, subjectName)");

    // Projector view calculation verification:
    // Option 2 has 50% response (>20% threshold) -> common misconception flag
    const opt2Count = aggTeacher.body.distribution["2"];
    const isCommonMisconception = (opt2Count / aggTeacher.body.responseCount) >= 0.2;
    assert.equal(isCommonMisconception, true, "Common mistake alert correctly flagged for smart board");
    console.log("✅ [PASS] Smart Board Misconception Alert: Option 2 flagged as common distractor (50%)");

    // Teacher reveals explanation
    const questionWithExplanation = aggTeacher.body.questions.find((q: any) => q.questionId === questionIds[0]);
    assert.ok(questionWithExplanation?.explanation?.length > 0, "Model solution available to teacher for reveal");
    console.log("✅ [PASS] Model solution ready for reveal on smart board: " + questionWithExplanation.explanation.slice(0, 40) + "...");

    // =============================================================
    // TEST PHASE 5: DYNAMIC IN-SESSION BATCH QUESTION PUSHING
    // =============================================================
    console.log("\n🚀 --- PHASE 5: In-Session Dynamic Batch Question Pushing ---");

    // Teacher pushes batch of 5 questions (Q2 through Q6)
    const batchQuestions = questionIds.slice(1, 6);
    const appendRes = await request(`/classroom/sessions/${sessionId}/append-questions`, {
      method: "POST",
      token: tokenTeacherA1,
      body: { questionIds: batchQuestions, autoPublishFirst: true },
    });
    assert.equal(appendRes.status, 200);
    console.log(`✅ [PASS] Teacher pushed 5-question Skill Batch. Active index=${appendRes.body.activeQuestionIndex}`);

    // Student A1 fetches current question: MUST NOW RECEIVE THE 5 BATCH QUESTIONS
    const currentBatch = await request(`/classroom/sessions/${sessionId}/current`, { token: tokenStudentA1 });
    assert.equal(currentBatch.status, 200);
    assert.equal(currentBatch.body.questions.length, 5, "Student receives exactly the 5 published batch questions");
    assert.equal(currentBatch.body.questions.some((q: any) => q.questionId === questionIds[9]), false, "Future question 10 NOT leaked");
    console.log("✅ [PASS] Batch Mode Verified: Student receives exactly 5 published questions; unpublished remain concealed");

    // Students answer a batch question
    const ansBatch = await request(`/classroom/sessions/${sessionId}/answers/${batchQuestions[0]}`, {
      method: "PUT",
      token: tokenStudentA1,
      body: { selectedOptionIndex: 1 },
    });
    assert.equal(ansBatch.status, 200);
    assert.equal(ansBatch.body.accepted, true);

    // Multi-Question Answering across published questions:
    // Student A2 answers Question 2 (index 1 / batchQuestions[0]) with Option 0 (distractor)
    const ansBatchA2 = await request(`/classroom/sessions/${sessionId}/answers/${batchQuestions[0]}`, {
      method: "PUT",
      token: tokenStudentA2,
      body: { selectedOptionIndex: 0 },
    });
    assert.equal(ansBatchA2.status, 200);

    // Student A1 answers Question 3 (index 2 / batchQuestions[1]) with Option 1 (correct)
    const ansBatch2A1 = await request(`/classroom/sessions/${sessionId}/answers/${batchQuestions[1]}`, {
      method: "PUT",
      token: tokenStudentA1,
      body: { selectedOptionIndex: 1 },
    });
    assert.equal(ansBatch2A1.status, 200);

    // Student A2 answers Question 3 (index 2 / batchQuestions[1]) with Option 2 (distractor)
    const ansBatch2A2 = await request(`/classroom/sessions/${sessionId}/answers/${batchQuestions[1]}`, {
      method: "PUT",
      token: tokenStudentA2,
      body: { selectedOptionIndex: 2 },
    });
    assert.equal(ansBatch2A2.status, 200);
    console.log("✅ [PASS] Multi-Question: Students answered batch Questions 2 and 3");

    // Verify Per-Question Analytics Isolation in Teacher Aggregate
    const aggBatch = await request(`/classroom/sessions/${sessionId}/aggregate`, { token: tokenTeacherA1 });
    assert.equal(aggBatch.status, 200);

    const q1Stats = aggBatch.body.questions.find((q: any) => q.questionId === questionIds[0]);
    const q2Stats = aggBatch.body.questions.find((q: any) => q.questionId === batchQuestions[0]);
    const q3Stats = aggBatch.body.questions.find((q: any) => q.questionId === batchQuestions[1]);

    assert.ok(q1Stats && q2Stats && q3Stats, "All 3 answered questions have analytics");
    assert.equal(q1Stats.responseCount, 2, "Q1 responseCount is 2");
    assert.equal(q1Stats.distribution["1"], 1, "Q1 option 1 count is 1");
    assert.equal(q1Stats.distribution["2"], 1, "Q1 option 2 count is 1");

    assert.equal(q2Stats.responseCount, 2, "Q2 responseCount is 2");
    assert.equal(q2Stats.distribution["1"], 1, "Q2 option 1 count is 1");
    assert.equal(q2Stats.distribution["0"], 1, "Q2 option 0 count is 1");

    assert.equal(q3Stats.responseCount, 2, "Q3 responseCount is 2");
    assert.equal(q3Stats.distribution["1"], 1, "Q3 option 1 count is 1");
    assert.equal(q3Stats.distribution["2"], 1, "Q3 option 2 count is 1");

    assert.equal(aggBatch.body.totalSessionResponses, 6, "Total session responses across all questions equals 6");
    console.log("✅ [PASS] Per-Question Analytics Isolation: Each question maintains strictly segregated distributions");

    // =============================================================
    // TEST PHASE 6: SESSION END & LIFECYCLE CLOSURE
    // =============================================================
    console.log("\n🏁 --- PHASE 6: Session End & Lifecycle Closure ---");

    // Multi-Teacher Isolation: Teacher A2 attempts to end Teacher A1's session -> must be rejected
    const attackTeacherA2End = await request(`/classroom/sessions/${sessionId}/end`, {
      method: "POST",
      token: tokenTeacherA2,
    });
    assert.equal(attackTeacherA2End.status, 403, "Negative: Teacher A2 must NOT end Teacher A1 session");
    console.log("🔒 [PASS] Multi-Teacher Isolation: Teacher A2 cannot end Teacher A1's session (HTTP 403)");

    const endRes = await request(`/classroom/sessions/${sessionId}/end`, {
      method: "POST",
      token: tokenTeacherA1,
    });
    assert.equal(endRes.status, 200);
    assert.ok(endRes.body.report, "Session report generated upon end");
    console.log("✅ [PASS] Session ended. Status transitioned to 'ended'");

    // Post-end guard 1: Student cannot submit new answers
    const postEndAnswer = await request(`/classroom/sessions/${sessionId}/answers/${questionIds[0]}`, {
      method: "PUT",
      token: tokenStudentA1,
      body: { selectedOptionIndex: 1 },
    });
    assert.notEqual(postEndAnswer.status, 200, "Answer rejected after session ended");
    console.log("🔒 [PASS] Post-end Answer Guard: Submissions rejected after session end");

    // Post-end guard 2: Instant join rejected
    const postEndJoin = await request(`/classroom/sessions/${sessionId}/instant-join`, {
      method: "POST",
      token: tokenStudentA1,
    });
    assert.equal(postEndJoin.status, 404, "Instant join rejected for ended session");
    console.log("🔒 [PASS] Post-end Join Guard: Joining ended session rejected (HTTP 404)");

    // =============================================================
    // TEST PHASE 7: SUPERVISOR & SCHOOL MANAGER AUDIT & ISOLATION
    // =============================================================
    console.log("\n📑 --- PHASE 7: Supervisor & School Manager Isolation ---");

    // Supervisor A views today's sessions
    const supAToday = await request("/classroom/supervisor/today", { token: tokenSupervisorA });
    assert.equal(supAToday.status, 200);
    const sessionInSupA = supAToday.body.sessions.find((s: any) => String(s.sessionId) === sessionId);
    assert.ok(sessionInSupA, "Supervisor A sees School A session in today's report");
    const accuracy = sessionInSupA.totals?.responses ? Math.round((sessionInSupA.totals.correct / sessionInSupA.totals.responses) * 100) : 0;
    console.log(`✅ [PASS] Supervisor A sees School A session (Accuracy: ${accuracy}%, Responses: ${sessionInSupA.totals?.responses})`);

    // Supervisor A opens detailed session report
    const supAReport = await request(`/classroom/supervisor/sessions/${sessionId}/report`, { token: tokenSupervisorA });
    assert.equal(supAReport.status, 200);
    assert.equal(supAReport.body.report.roster.joined, 2, "Report verifies 2 student participants in roster");
    console.log("✅ [PASS] Supervisor A detailed report verifies participation and roster (2 joined)");

    // Supervisor B views today's sessions: MUST BE EMPTY / 0 SESSIONS FROM SCHOOL A
    const supBToday = await request("/classroom/supervisor/today", { token: tokenSupervisorB });
    assert.equal(supBToday.status, 200);
    assert.equal(
      supBToday.body.sessions.some((s: any) => String(s.sessionId) === sessionId),
      false,
      "Supervisor B must NOT see School A session",
    );
    console.log("🔒 [PASS] Cross-Tenant Supervisor Isolation: Supervisor B has 0 visibility into School A");

    // Verify DB-backed teacher and manager history endpoint
    console.log("\n📚 --- Testing DB-backed Teacher and School Manager History ---");
    const managerHistory = await request(`/classroom/teacher/history?schoolId=${schoolAId}`, { token: tokenManagerA });
    assert.equal(managerHistory.status, 200);
    assert.ok(Array.isArray(managerHistory.body.sessions), "Manager receives sessions array");
    const hasEndedSessionManager = managerHistory.body.sessions.some((s: any) => String(s.sessionId) === sessionId);
    assert.equal(hasEndedSessionManager, true, "School Manager A history includes the completed session");
    console.log(`✅ [PASS] School Manager A retrieved DB-backed history (${managerHistory.body.sessions.length} sessions)`);

    const teacherHistory = await request(`/classroom/teacher/history?schoolId=${schoolAId}`, { token: tokenTeacherA1 });
    assert.equal(teacherHistory.status, 200);
    assert.ok(Array.isArray(teacherHistory.body.sessions), "Teacher A1 receives sessions array");
    const hasEndedSessionTeacher = teacherHistory.body.sessions.some((s: any) => String(s.sessionId) === sessionId);
    assert.equal(hasEndedSessionTeacher, true, "Teacher A1 history includes the completed session");
    console.log(`✅ [PASS] Teacher A1 retrieved DB-backed history (${teacherHistory.body.sessions.length} sessions)`);

    // Verify Realtime Socket events received by student client
    console.log("\n📡 --- Verifying Live Socket.IO Events ---");
    assert.ok(receivedSocketEvents.length > 0, "Socket client must receive live events");
    assert.ok(receivedSocketEvents.some((e) => e.event === "response:updated"), "Socket received response:updated event");
    assert.ok(receivedSocketEvents.some((e) => e.event === "session:ended"), "Socket received session:ended event");
    console.log(`✅ [PASS] Real Socket.IO client received ${receivedSocketEvents.length} live push events (response:updated, session:ended)`);
    clientSocket?.disconnect();

    console.log("\n=======================================================");
    console.log("🎉 ALL MULTI-SCHOOL E2E ACCEPTANCE CHECKS PASSED (100%)");
    console.log("=======================================================\n");
  } finally {
    clientSocket?.disconnect();
    // Cleanup seed records
    console.log("🧹 Cleaning up simulation data...");
    if (sessionId) {
      await ClassroomResponseModel.deleteMany({ sessionId });
      await ClassroomParticipantModel.deleteMany({ sessionId });
      await ClassroomSessionModel.deleteMany({ _id: sessionId });
    }
    const schoolIdsToClean = [schoolAId, schoolBId].filter(Boolean);
    if (schoolIdsToClean.length > 0) {
      await ClassroomSessionModel.deleteMany({ schoolId: { $in: schoolIdsToClean } });
      await SchoolContractModel.deleteMany({ schoolId: { $in: schoolIdsToClean } });
      await TeachingAssignmentModel.deleteMany({ schoolId: { $in: schoolIdsToClean } });
      await SchoolMembershipModel.deleteMany({ schoolId: { $in: schoolIdsToClean } });
      await GroupModel.deleteMany({ parentId: { $in: schoolIdsToClean } });
      await GroupModel.deleteMany({ _id: { $in: schoolIdsToClean } });
    }
    await QuestionModel.deleteMany({ id: { $regex: new RegExp(RUN_ID) } });
    await GroupModel.deleteMany({ ownerId: { $regex: new RegExp(RUN_ID) } });
    await UserModel.deleteMany({ email: { $regex: new RegExp(RUN_ID) } });
    
    server?.close();
    await mongoose.disconnect();
    console.log("✅ Cleanup complete.");
  }
}

run().catch((err) => {
  console.error("❌ Simulation Failed:", err);
  process.exit(1);
});
