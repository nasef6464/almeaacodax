import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";
import { io as connectSocket, type Socket } from "socket.io-client";
import { createApp } from "../app.js";
import { env } from "../config/env.js";
import { createSocketServer } from "../sockets/index.js";
import { signAccessToken } from "../utils/jwt.js";
import { GroupModel } from "../models/Group.js";
import { UserModel } from "../models/User.js";
import { SchoolContractModel } from "../models/SchoolContract.js";
import { SchoolMembershipModel } from "../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../models/TeachingAssignment.js";
import { QuestionModel } from "../models/Question.js";
import { ClassroomSessionModel } from "../models/ClassroomSession.js";
import { ClassroomParticipantModel } from "../models/ClassroomParticipant.js";
import { ClassroomResponseModel } from "../models/ClassroomResponse.js";
import { ClassroomTemplateModel } from "../models/ClassroomTemplate.js";

const RUN_ID = `hardening_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const assertSafeDatabase = () => {
  const uri = new URL(env.MONGODB_URI.replace(/^mongodb\+srv:/, "mongodb:"));
  const dbName = uri.pathname.replace(/^\//, "");
  const safeName = /(?:test|ci|dev|local|sandbox)/i.test(dbName);
  if (env.NODE_ENV === "production") {
    throw new Error("Smart Classroom hardening E2E must never run with NODE_ENV=production");
  }
  if (!safeName && process.env.ALLOW_SMART_CLASSROOM_E2E_UNSAFE_DB !== "1") {
    throw new Error(`Refusing to run E2E against database '${dbName || "<default>"}'. Use a test/dev/ci database.`);
  }
};

let server: http.Server | null = null;
let apiBaseUrl = "";
let socketBaseUrl = "";
let csrfToken = "";
let csrfCookie = "";

const request = async (endpoint: string, options: { method?: string; token?: string; body?: unknown } = {}) => {
  const method = (options.method || "GET").toUpperCase();
  const headers: Record<string, string> = { accept: "application/json" };
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers["x-csrf-token"] = csrfToken;
    headers.cookie = csrfCookie;
  }
  const response = await fetch(`${apiBaseUrl}${endpoint}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  return { status: response.status, body };
};

const tokenFor = (user: any) => signAccessToken({ id: String(user._id), email: user.email, role: user.role });

const socketJoin = async (token: string, room: string) => {
  const socket = connectSocket(socketBaseUrl, { auth: { token }, transports: ["websocket"], reconnection: false });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Socket connection timeout")), 5000);
    socket.once("connect", () => { clearTimeout(timeout); resolve(); });
    socket.once("connect_error", (error) => { clearTimeout(timeout); reject(error); });
  });
  const result = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
    socket.emit("workspace:join", room, (response: { ok: boolean; error?: string }) => resolve(response));
  });
  return { socket, result };
};

async function initCsrf() {
  const response = await fetch(`${apiBaseUrl}/auth/csrf-token`);
  assert.equal(response.status, 200);
  const body: any = await response.json();
  csrfToken = body.csrfToken;
  csrfCookie = (response.headers.get("set-cookie") || "").split(";")[0] || `almeaa_csrf_token=${csrfToken}`;
}

async function cleanup() {
  const sessionIds = (await ClassroomSessionModel.find({ className: { $regex: RUN_ID } }).select("_id").lean()).map((entry: any) => String(entry._id));
  if (sessionIds.length) {
    await Promise.all([
      ClassroomParticipantModel.deleteMany({ sessionId: { $in: sessionIds } }),
      ClassroomResponseModel.deleteMany({ sessionId: { $in: sessionIds } }),
    ]);
  }
  await Promise.all([
    ClassroomTemplateModel.deleteMany({ title: { $regex: RUN_ID } }),
    ClassroomSessionModel.deleteMany({ className: { $regex: RUN_ID } }),
    QuestionModel.deleteMany({ id: { $regex: RUN_ID } }),
    TeachingAssignmentModel.deleteMany({ subjectId: { $regex: RUN_ID } }),
    SchoolMembershipModel.deleteMany({ schoolId: { $regex: RUN_ID } }),
    SchoolContractModel.deleteMany({ schoolId: { $regex: RUN_ID } }),
    UserModel.deleteMany({ email: { $regex: RUN_ID } }),
    GroupModel.deleteMany({ name: { $regex: RUN_ID } }),
  ]);
}

async function run() {
  assertSafeDatabase();
  await mongoose.connect(env.MONGODB_URI);
  await cleanup();
  await ClassroomSessionModel.syncIndexes();

  const app = createApp();
  server = http.createServer(app);
  createSocketServer(server);
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as any).port;
  socketBaseUrl = `http://127.0.0.1:${port}`;
  apiBaseUrl = `${socketBaseUrl}/api`;
  await initCsrf();

  const schoolA = await GroupModel.create({ name: `School A ${RUN_ID}`, type: "SCHOOL", ownerId: `owner_${RUN_ID}` });
  const schoolB = await GroupModel.create({ name: `School B ${RUN_ID}`, type: "SCHOOL", ownerId: `owner_${RUN_ID}` });
  const schoolAId = String(schoolA._id);
  const schoolBId = String(schoolB._id);
  await SchoolContractModel.create({ schoolId: schoolAId, status: "active", modules: ["SCHOOL_CORE", "SMART_CLASSROOM"] });
  await SchoolContractModel.create({ schoolId: schoolBId, status: "active", modules: ["SCHOOL_CORE", "SMART_CLASSROOM"] });

  const managerA = await UserModel.create({ name: "Manager A", email: `manager_a_${RUN_ID}@example.com`, passwordHash: "x", role: "school_admin", schoolId: schoolAId, isActive: true });
  const managerB = await UserModel.create({ name: "Manager B", email: `manager_b_${RUN_ID}@example.com`, passwordHash: "x", role: "school_admin", schoolId: schoolBId, isActive: true });
  const teacherA = await UserModel.create({ name: "Teacher A", email: `teacher_a_${RUN_ID}@example.com`, passwordHash: "x", role: "teacher", schoolId: schoolAId, isActive: true });
  const teacherA2 = await UserModel.create({ name: "Teacher A2", email: `teacher_a2_${RUN_ID}@example.com`, passwordHash: "x", role: "teacher", schoolId: schoolAId, isActive: true });
  const studentA = await UserModel.create({ name: "Student A", email: `student_a_${RUN_ID}@example.com`, passwordHash: "x", role: "student", schoolId: schoolAId, groupIds: [], isActive: true });
  const studentA2 = await UserModel.create({ name: "Student A2", email: `student_a2_${RUN_ID}@example.com`, passwordHash: "x", role: "student", schoolId: schoolAId, groupIds: [], isActive: true });
  const studentB = await UserModel.create({ name: "Student B", email: `student_b_${RUN_ID}@example.com`, passwordHash: "x", role: "student", schoolId: schoolBId, groupIds: [], isActive: true });

  const classA = await GroupModel.create({ name: `Class A ${RUN_ID}`, type: "CLASS", parentId: schoolAId, ownerId: String(managerA._id), studentIds: [String(studentA._id), String(studentA2._id)] });
  const classB = await GroupModel.create({ name: `Class B ${RUN_ID}`, type: "CLASS", parentId: schoolBId, ownerId: String(managerB._id), studentIds: [String(studentB._id)] });
  const classAId = String(classA._id);
  const classBId = String(classB._id);
  await UserModel.updateMany({ _id: { $in: [studentA._id, studentA2._id] } }, { $set: { groupIds: [classAId] } });
  await UserModel.updateOne({ _id: studentB._id }, { $set: { groupIds: [classBId] } });

  await Promise.all([
    SchoolMembershipModel.create({ userId: String(managerA._id), schoolId: schoolAId, role: "school_admin", status: "active", permissions: ["SCHOOL_SMART_CLASSROOM_VIEW"] }),
    SchoolMembershipModel.create({ userId: String(managerB._id), schoolId: schoolBId, role: "school_admin", status: "active", permissions: ["SCHOOL_SMART_CLASSROOM_VIEW"] }),
    SchoolMembershipModel.create({ userId: String(teacherA._id), schoolId: schoolAId, role: "teacher", status: "active" }),
    SchoolMembershipModel.create({ userId: String(teacherA2._id), schoolId: schoolAId, role: "teacher", status: "active" }),
    SchoolMembershipModel.create({ userId: String(studentA._id), schoolId: schoolAId, role: "student", status: "active" }),
    SchoolMembershipModel.create({ userId: String(studentA2._id), schoolId: schoolAId, role: "student", status: "active" }),
    SchoolMembershipModel.create({ userId: String(studentB._id), schoolId: schoolBId, role: "student", status: "active" }),
  ]);
  await TeachingAssignmentModel.create({ schoolId: schoolAId, teacherId: String(teacherA._id), classId: classAId, subjectId: `subject_${RUN_ID}`, status: "active" });
  await TeachingAssignmentModel.create({ schoolId: schoolAId, teacherId: String(teacherA2._id), classId: classAId, subjectId: `subject2_${RUN_ID}`, status: "active" });

  const platformQ1 = await QuestionModel.create({ id: `platform_q1_${RUN_ID}`, text: "Platform Q1", options: ["A", "B", "C", "D"], correctOptionIndex: 1, subject: "general", type: "mcq", approvalStatus: "approved", ownerType: "platform", skillIds: ["skill-one"], pathId: "path-one" });
  const platformQ2 = await QuestionModel.create({ id: `platform_q2_${RUN_ID}`, text: "Platform Q2", options: ["A", "B", "C", "D"], correctOptionIndex: 2, subject: "general", type: "mcq", approvalStatus: "approved", ownerType: "platform", skillIds: ["skill-two"], pathId: "path-two" });
  const platformQ3 = await QuestionModel.create({ id: `platform_q3_${RUN_ID}`, text: "Platform Q3", options: ["A", "B", "C", "D"], correctOptionIndex: 0, subject: "general", type: "mcq", approvalStatus: "approved", ownerType: "platform", skillIds: ["skill-three"], pathId: "path-three" });
  const schoolAQ = await QuestionModel.create({ id: `school_a_q_${RUN_ID}`, text: "School A private", options: ["A", "B"], correctOptionIndex: 0, subject: "general", type: "mcq", approvalStatus: "approved", ownerType: "school", ownerId: schoolAId });
  const schoolBQ = await QuestionModel.create({ id: `school_b_q_${RUN_ID}`, text: "School B private", options: ["A", "B"], correctOptionIndex: 0, subject: "general", type: "mcq", approvalStatus: "approved", ownerType: "school", ownerId: schoolBId });
  const q1 = String(platformQ1.id); const q2 = String(platformQ2.id); const q3 = String(platformQ3.id);

  const teacherToken = tokenFor(teacherA);
  const teacher2Token = tokenFor(teacherA2);
  const managerAToken = tokenFor(managerA);
  const managerBToken = tokenFor(managerB);
  const studentAToken = tokenFor(studentA);
  const studentA2Token = tokenFor(studentA2);
  const studentBToken = tokenFor(studentB);

  const questionBank = await request(`/classroom/questions?schoolId=${schoolAId}`, { token: teacherToken });
  assert.equal(questionBank.status, 200);
  const visibleQuestionIds = new Set(questionBank.body.questions.map((question: any) => question.questionId));
  assert.ok(visibleQuestionIds.has(q1));
  assert.ok(visibleQuestionIds.has(String(schoolAQ.id)));
  assert.equal(visibleQuestionIds.has(String(schoolBQ.id)), false, "School B private question leaked into School A bank");

  const draft = await request("/classroom/sessions", { method: "POST", token: teacherToken, body: { schoolId: schoolAId, classId: classAId, questionIds: [q3], className: `Draft ${RUN_ID}` } });
  assert.equal(draft.status, 201);
  assert.equal((await request("/classroom/sessions/join-by-pin", { method: "POST", token: studentAToken, body: { pin: draft.body.pin } })).status, 404, "Draft PIN join must fail");
  assert.equal((await request(`/classroom/sessions/${draft.body.sessionId}/instant-join`, { method: "POST", token: studentAToken })).status, 404, "Draft instant join must fail");

  const created = await request("/classroom/sessions", { method: "POST", token: teacherToken, body: { schoolId: schoolAId, classId: classAId, questionIds: [q1], className: `Live ${RUN_ID}`, subjectName: "General", day: "الأحد", period: 1, autoStart: true } });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const liveSessionId = created.body.sessionId;
  const pin = created.body.pin;

  assert.equal((await request(`/classroom/teacher/history?schoolId=${schoolAId}`, { token: managerAToken })).status, 200, "Manager A should read own school history");
  assert.equal((await request(`/classroom/teacher/history?schoolId=${schoolAId}`, { token: managerBToken })).status, 403, "Manager B must not read School A history");
  assert.equal((await request(`/classroom/sessions/${liveSessionId}/aggregate`, { token: managerAToken })).status, 200, "Authorized director aggregate should work");
  assert.equal((await request(`/classroom/sessions/${liveSessionId}/aggregate`, { token: managerBToken })).status, 403, "Cross-school director aggregate must fail");

  assert.equal((await request(`/classroom/sessions/${liveSessionId}/instant-join`, { method: "POST", token: studentBToken })).status, 403, "Cross-school student instant join must fail");
  assert.equal((await request("/classroom/sessions/join-by-pin", { method: "POST", token: studentAToken, body: { pin } })).status, 200);
  assert.equal((await request("/classroom/sessions/join-by-pin", { method: "POST", token: studentA2Token, body: { pin } })).status, 200);

  const socketStudentA = await socketJoin(studentAToken, `classroom:${liveSessionId}`);
  assert.equal(socketStudentA.result.ok, true, "Student A should join its live room");
  const socketStudentB = await socketJoin(studentBToken, `classroom:${liveSessionId}`);
  assert.equal(socketStudentB.result.ok, false, "Student B must be rejected from School A socket room");
  const socketManagerA = await socketJoin(managerAToken, `classroom:${liveSessionId}`);
  assert.equal(socketManagerA.result.ok, true, "Manager A should join School A classroom room");
  const socketTeacher2 = await socketJoin(teacher2Token, `classroom:${liveSessionId}`);
  assert.equal(socketTeacher2.result.ok, false, "Non-owner teacher must not subscribe to another teacher's room");

  const append = await request(`/classroom/sessions/${liveSessionId}/append-questions`, { method: "POST", token: teacherToken, body: { questionIds: [q2, q3], autoPublishFirst: true } });
  assert.equal(append.status, 200, JSON.stringify(append.body));
  assert.deepEqual(new Set(append.body.publishedQuestionIds), new Set([q2, q3]));
  const repeatAppend = await request(`/classroom/sessions/${liveSessionId}/append-questions`, { method: "POST", token: teacherToken, body: { questionIds: [q2, q3], autoPublishFirst: true } });
  assert.equal(repeatAppend.status, 409, "All-duplicate append must be idempotently rejected");

  const current = await request(`/classroom/sessions/${liveSessionId}/current`, { token: studentAToken });
  assert.equal(current.status, 200);
  assert.equal(current.body.questions.length, 2);
  assert.equal(current.body.currentIndex, 0, "First newly published batch question must be current position 0");
  assert.equal("correctOptionIndex" in current.body.questions[0], false);
  assert.equal("explanation" in current.body.questions[0], false);

  await request(`/classroom/sessions/${liveSessionId}/answers/${q2}`, { method: "PUT", token: studentAToken, body: { selectedOptionIndex: 2 } });
  await request(`/classroom/sessions/${liveSessionId}/answers/${q2}`, { method: "PUT", token: studentA2Token, body: { selectedOptionIndex: 0 } });
  await request(`/classroom/sessions/${liveSessionId}/answers/${q3}`, { method: "PUT", token: studentAToken, body: { selectedOptionIndex: 0 } });
  const aggregate = await request(`/classroom/sessions/${liveSessionId}/aggregate`, { token: teacherToken });
  assert.equal(aggregate.status, 200);
  const q2Stats = aggregate.body.questions.find((question: any) => question.questionId === q2);
  const q3Stats = aggregate.body.questions.find((question: any) => question.questionId === q3);
  assert.equal(q2Stats.responseCount, 2);
  assert.equal(q2Stats.distribution["2"], 1);
  assert.equal(q2Stats.distribution["0"], 1);
  assert.equal(q3Stats.responseCount, 1);
  assert.equal(q3Stats.distribution["0"], 1);
  assert.equal(q2Stats.pathId, "path-two");

  const templateCreate = await request("/classroom/templates", { method: "POST", token: teacherToken, body: { schoolId: schoolAId, title: `Template ${RUN_ID}`, questionIds: [q1, q2], challengeIds: [q2] } });
  assert.equal(templateCreate.status, 201, JSON.stringify(templateCreate.body));
  const templateList = await request(`/classroom/templates?schoolId=${schoolAId}`, { token: teacherToken });
  assert.equal(templateList.status, 200);
  assert.ok(templateList.body.templates.some((template: any) => template.title === `Template ${RUN_ID}`));

  const end = await request(`/classroom/sessions/${liveSessionId}/end`, { method: "POST", token: teacherToken });
  assert.equal(end.status, 200);
  assert.equal(end.body.report.roster.expected, 2);
  assert.equal(end.body.report.roster.joined, 2);
  assert.equal(end.body.report.totals.responses, 3);
  assert.ok(Array.isArray(end.body.report.questions));
  assert.ok(end.body.report.questions.some((question: any) => question.questionId === q2 && question.answered === 2));
  assert.equal((await request(`/classroom/sessions/${liveSessionId}/instant-join`, { method: "POST", token: studentAToken })).status, 404);

  socketStudentA.socket.disconnect();
  socketStudentB.socket.disconnect();
  socketManagerA.socket.disconnect();
  socketTeacher2.socket.disconnect();

  console.log("Smart Classroom hardening E2E: PASS");
}

run()
  .catch((error) => {
    console.error("Smart Classroom hardening E2E: FAIL", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await cleanup(); } catch (error) { console.error("cleanup failed", error); }
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await mongoose.disconnect();
  });
