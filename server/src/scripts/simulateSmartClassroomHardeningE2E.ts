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
const LOAD_STUDENT_COUNT = Math.max(0, Math.min(118, Number.parseInt(process.env.SMART_CLASSROOM_LOAD_STUDENTS || "23", 10) || 23));
const SCENARIO_NAME = process.env.SMART_CLASSROOM_SCENARIO || `single-class-${LOAD_STUDENT_COUNT + 2}`;
const createdSchoolIds: string[] = [];
const sockets: Socket[] = [];
const requestMetrics: Array<{ durationMs: number; responseBytes: number }> = [];
let server: http.Server | null = null;
let apiBaseUrl = "";
let socketBaseUrl = "";
let csrfToken = "";
let csrfCookie = "";

function databaseName(uri: string) {
  const withoutQuery = uri.split("?")[0] || "";
  const slash = withoutQuery.lastIndexOf("/");
  return slash >= 0 ? withoutQuery.slice(slash + 1) : "";
}

function assertSafeDatabase() {
  const name = databaseName(env.MONGODB_URI);
  if (env.NODE_ENV === "production") {
    throw new Error("Smart Classroom E2E must never run with NODE_ENV=production");
  }
  if (!/(?:test|ci|dev|local|sandbox)/i.test(name) && process.env.ALLOW_SMART_CLASSROOM_E2E_UNSAFE_DB !== "1") {
    throw new Error(`Refusing Smart Classroom E2E against database '${name || "<default>"}'. Use a test/dev/ci database.`);
  }
}

async function request(endpoint: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const startedAt = performance.now();
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
  const metric = { durationMs: performance.now() - startedAt, responseBytes: Buffer.byteLength(text, "utf8") };
  requestMetrics.push(metric);
  return { status: response.status, body, ...metric };
}

const percentile = (values: number[], ratio: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))];
};

const emitMetrics = () => {
  const durations = requestMetrics.map((metric) => metric.durationMs);
  const bytes = requestMetrics.reduce((total, metric) => total + metric.responseBytes, 0);
  const memory = process.memoryUsage();
  console.log(JSON.stringify({
    kind: "smart-classroom-load-metrics",
    scenario: SCENARIO_NAME,
    students: LOAD_STUDENT_COUNT + 2,
    http: { requests: durations.length, p50Ms: percentile(durations, 0.5), p95Ms: percentile(durations, 0.95), p99Ms: percentile(durations, 0.99), responseBytes: bytes },
    process: { rssBytes: memory.rss, heapUsedBytes: memory.heapUsed },
    socketsOpened: sockets.length,
  }));
};

function tokenFor(user: any) {
  return signAccessToken({
    id: String(user._id),
    email: String(user.email),
    role: user.role,
    name: String(user.name || "Simulation User"),
  });
}

async function initCsrf() {
  const response = await fetch(`${apiBaseUrl}/auth/csrf-token`);
  assert.equal(response.status, 200, "CSRF bootstrap should succeed");
  const body: any = await response.json();
  csrfToken = body.csrfToken;
  csrfCookie = (response.headers.get("set-cookie") || "").split(";")[0] || `almeaa_csrf_token=${csrfToken}`;
}

async function joinSocket(token: string, room: string) {
  const socket = connectSocket(socketBaseUrl, { auth: { token }, transports: ["websocket"], reconnection: false });
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Socket connection timeout")), 5000);
    socket.once("connect", () => { clearTimeout(timeout); resolve(); });
    socket.once("connect_error", (error) => { clearTimeout(timeout); reject(error); });
  });
  const result = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
    socket.emit("workspace:join", room, (response: { ok: boolean; error?: string }) => resolve(response));
  });
  return result;
}

async function cleanup() {
  sockets.splice(0).forEach((socket) => socket.disconnect());
  if (createdSchoolIds.length) {
    const sessions = await ClassroomSessionModel.find({ schoolId: { $in: createdSchoolIds } }).select("_id").lean();
    const sessionIds = sessions.map((session: any) => String(session._id));
    if (sessionIds.length) {
      await ClassroomParticipantModel.deleteMany({ sessionId: { $in: sessionIds } });
      await ClassroomResponseModel.deleteMany({ sessionId: { $in: sessionIds } });
    }
    await Promise.all([
      ClassroomTemplateModel.deleteMany({ schoolId: { $in: createdSchoolIds } }),
      ClassroomSessionModel.deleteMany({ schoolId: { $in: createdSchoolIds } }),
      TeachingAssignmentModel.deleteMany({ schoolId: { $in: createdSchoolIds } }),
      SchoolMembershipModel.deleteMany({ schoolId: { $in: createdSchoolIds } }),
      SchoolContractModel.deleteMany({ schoolId: { $in: createdSchoolIds } }),
      GroupModel.deleteMany({ parentId: { $in: createdSchoolIds } }),
      GroupModel.deleteMany({ _id: { $in: createdSchoolIds.filter((id) => mongoose.isValidObjectId(id)) } }),
    ]);
  }
  await Promise.all([
    QuestionModel.deleteMany({ id: { $regex: RUN_ID } }),
    UserModel.deleteMany({ email: { $regex: RUN_ID } }),
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
  createdSchoolIds.push(schoolAId, schoolBId);

  await Promise.all([
    SchoolContractModel.create({ schoolId: schoolAId, status: "active", modules: ["SCHOOL_CORE", "SMART_CLASSROOM"] }),
    SchoolContractModel.create({ schoolId: schoolBId, status: "active", modules: ["SCHOOL_CORE", "SMART_CLASSROOM"] }),
  ]);

  const [managerA, managerB, teacherA, teacherA2, studentA, studentA2, studentB] = await Promise.all([
    UserModel.create({ name: "Manager A", email: `manager_a_${RUN_ID}@example.com`, passwordHash: "x", role: "school_admin", schoolId: schoolAId, isActive: true }),
    UserModel.create({ name: "Manager B", email: `manager_b_${RUN_ID}@example.com`, passwordHash: "x", role: "school_admin", schoolId: schoolBId, isActive: true }),
    UserModel.create({ name: "Teacher A", email: `teacher_a_${RUN_ID}@example.com`, passwordHash: "x", role: "teacher", schoolId: schoolAId, isActive: true }),
    UserModel.create({ name: "Teacher A2", email: `teacher_a2_${RUN_ID}@example.com`, passwordHash: "x", role: "teacher", schoolId: schoolAId, isActive: true }),
    UserModel.create({ name: "Student A", email: `student_a_${RUN_ID}@example.com`, passwordHash: "x", role: "student", schoolId: schoolAId, groupIds: [], isActive: true }),
    UserModel.create({ name: "Student A2", email: `student_a2_${RUN_ID}@example.com`, passwordHash: "x", role: "student", schoolId: schoolAId, groupIds: [], isActive: true }),
    UserModel.create({ name: "Student B", email: `student_b_${RUN_ID}@example.com`, passwordHash: "x", role: "student", schoolId: schoolBId, groupIds: [], isActive: true }),
  ]);

  const loadStudents = await UserModel.insertMany(Array.from({ length: LOAD_STUDENT_COUNT }, (_, index) => ({
    name: `Load Student ${index + 1}`,
    email: `load_student_${index + 1}_${RUN_ID}@example.com`,
    passwordHash: "x",
    role: "student",
    schoolId: schoolAId,
    groupIds: [],
    isActive: true,
  })));
  const classAStudentIds = [studentA, studentA2, ...loadStudents].map((student) => String(student._id));

  const classA = await GroupModel.create({ name: `Class A ${RUN_ID}`, type: "CLASS", parentId: schoolAId, ownerId: String(managerA._id), studentIds: classAStudentIds });
  const classB = await GroupModel.create({ name: `Class B ${RUN_ID}`, type: "CLASS", parentId: schoolBId, ownerId: String(managerB._id), studentIds: [String(studentB._id)] });
  const classAId = String(classA._id);
  const classBId = String(classB._id);
  await Promise.all([
    UserModel.updateMany({ _id: { $in: classAStudentIds } }, { $set: { groupIds: [classAId] } }),
    UserModel.updateOne({ _id: studentB._id }, { $set: { groupIds: [classBId] } }),
  ]);

  await Promise.all([
    SchoolMembershipModel.create({ userId: String(managerA._id), schoolId: schoolAId, role: "school_admin", status: "active", permissions: ["SCHOOL_SMART_CLASSROOM_VIEW"] }),
    SchoolMembershipModel.create({ userId: String(managerB._id), schoolId: schoolBId, role: "school_admin", status: "active", permissions: ["SCHOOL_SMART_CLASSROOM_VIEW"] }),
    SchoolMembershipModel.create({ userId: String(teacherA._id), schoolId: schoolAId, role: "teacher", status: "active" }),
    SchoolMembershipModel.create({ userId: String(teacherA2._id), schoolId: schoolAId, role: "teacher", status: "active" }),
    SchoolMembershipModel.create({ userId: String(studentA._id), schoolId: schoolAId, role: "student", status: "active" }),
    SchoolMembershipModel.create({ userId: String(studentA2._id), schoolId: schoolAId, role: "student", status: "active" }),
    SchoolMembershipModel.create({ userId: String(studentB._id), schoolId: schoolBId, role: "student", status: "active" }),
    TeachingAssignmentModel.create({ schoolId: schoolAId, teacherId: String(teacherA._id), classId: classAId, subjectId: `subject_${RUN_ID}`, status: "active" }),
    TeachingAssignmentModel.create({ schoolId: schoolAId, teacherId: String(teacherA2._id), classId: classAId, subjectId: `subject2_${RUN_ID}`, status: "active" }),
  ]);
  await SchoolMembershipModel.insertMany(loadStudents.map((student) => ({
    userId: String(student._id), schoolId: schoolAId, role: "student", status: "active",
  })));

  const [platformQ1, platformQ2, platformQ3, schoolAQ, schoolBQ] = await Promise.all([
    QuestionModel.create({ id: `platform_q1_${RUN_ID}`, text: "Platform Q1", options: ["A", "B", "C", "D"], correctOptionIndex: 1, subject: "general", type: "mcq", approvalStatus: "approved", ownerType: "platform", skillIds: ["skill-one"], pathId: "path-one" }),
    QuestionModel.create({ id: `platform_q2_${RUN_ID}`, text: "Platform Q2", options: ["A", "B", "C", "D"], correctOptionIndex: 2, subject: "general", type: "mcq", approvalStatus: "approved", ownerType: "platform", skillIds: ["skill-two"], pathId: "path-two" }),
    QuestionModel.create({ id: `platform_q3_${RUN_ID}`, text: "Platform Q3", options: ["A", "B", "C", "D"], correctOptionIndex: 0, subject: "general", type: "mcq", approvalStatus: "approved", ownerType: "platform", skillIds: ["skill-three"], pathId: "path-three" }),
    QuestionModel.create({ id: `school_a_q_${RUN_ID}`, text: "School A private", options: ["A", "B"], correctOptionIndex: 0, subject: "general", type: "mcq", approvalStatus: "approved", ownerType: "school", ownerId: schoolAId }),
    QuestionModel.create({ id: `school_b_q_${RUN_ID}`, text: "School B private", options: ["A", "B"], correctOptionIndex: 0, subject: "general", type: "mcq", approvalStatus: "approved", ownerType: "school", ownerId: schoolBId }),
  ]);
  const q1 = String(platformQ1.id); const q2 = String(platformQ2.id); const q3 = String(platformQ3.id);

  const teacherToken = tokenFor(teacherA);
  const teacher2Token = tokenFor(teacherA2);
  const managerAToken = tokenFor(managerA);
  const managerBToken = tokenFor(managerB);
  const studentAToken = tokenFor(studentA);
  const studentA2Token = tokenFor(studentA2);
  const studentBToken = tokenFor(studentB);
  const loadStudentTokens = loadStudents.map(tokenFor);

  const bank = await request(`/classroom/questions?schoolId=${schoolAId}`, { token: teacherToken });
  assert.equal(bank.status, 200);
  const visible = new Set(bank.body.questions.map((question: any) => question.questionId));
  assert.ok(visible.has(q1));
  assert.ok(visible.has(String(schoolAQ.id)));
  assert.equal(visible.has(String(schoolBQ.id)), false, "School B private question leaked into School A bank");

  const draft = await request("/classroom/sessions", { method: "POST", token: teacherToken, body: { schoolId: schoolAId, classId: classAId, questionIds: [q3], className: `Draft ${RUN_ID}` } });
  assert.equal(draft.status, 201);
  assert.equal((await request("/classroom/sessions/join-by-pin", { method: "POST", token: studentAToken, body: { pin: draft.body.pin } })).status, 404);
  assert.equal((await request(`/classroom/sessions/${draft.body.sessionId}/instant-join`, { method: "POST", token: studentAToken })).status, 404);

  const live = await request("/classroom/sessions", { method: "POST", token: teacherToken, body: { schoolId: schoolAId, classId: classAId, questionIds: [q1], className: `Live ${RUN_ID}`, subjectName: "General", day: "الأحد", period: 1, autoStart: true } });
  assert.equal(live.status, 201, JSON.stringify(live.body));
  const liveSessionId = live.body.sessionId;
  const pin = live.body.pin;

  assert.equal((await request(`/classroom/teacher/history?schoolId=${schoolAId}`, { token: managerAToken })).status, 200);
  assert.equal((await request(`/classroom/teacher/history?schoolId=${schoolAId}`, { token: managerBToken })).status, 403, "Manager B read School A history");
  assert.equal((await request(`/classroom/sessions/${liveSessionId}/aggregate`, { token: managerAToken })).status, 200);
  assert.equal((await request(`/classroom/sessions/${liveSessionId}/aggregate`, { token: managerBToken })).status, 403);
  assert.equal((await request(`/classroom/sessions/${liveSessionId}/aggregate`, { token: studentAToken })).status, 403, "Student read staff aggregate");
  assert.equal((await request(`/classroom/supervisor/sessions/${liveSessionId}/report`, { token: studentAToken })).status, 403, "Student read staff report");
  assert.equal((await request(`/classroom/sessions/${liveSessionId}/instant-join`, { method: "POST", token: studentBToken })).status, 403);
  assert.equal((await request("/classroom/sessions/join-by-pin", { method: "POST", token: studentAToken, body: { pin } })).status, 200);
  assert.equal((await request("/classroom/sessions/join-by-pin", { method: "POST", token: studentA2Token, body: { pin } })).status, 200);
  const concurrentJoins = await Promise.all(loadStudentTokens.map((token) => request("/classroom/sessions/join-by-pin", {
    method: "POST", token, body: { pin },
  })));
  assert.ok(concurrentJoins.every((result) => result.status === 200), `All ${LOAD_STUDENT_COUNT + 2} class students should join concurrently`);

  assert.equal((await joinSocket(studentAToken, `classroom:${liveSessionId}`)).ok, true);
  assert.equal((await joinSocket(studentBToken, `classroom:${liveSessionId}`)).ok, false);
  assert.equal((await joinSocket(managerAToken, `classroom:${liveSessionId}`)).ok, true);
  assert.equal((await joinSocket(teacher2Token, `classroom:${liveSessionId}`)).ok, false);

  assert.equal((await request(`/classroom/sessions/${liveSessionId}/append-questions`, { method: "POST", token: teacherToken, body: { questionIds: [q2, q3], autoPublishFirst: true } })).status, 409, "A new batch cannot silently close the active batch");
  const initialBatchId = (await request(`/classroom/sessions/${liveSessionId}/aggregate`, { token: teacherToken })).body.activeBatchId;
  const initialBatchEnd = await request(`/classroom/sessions/${liveSessionId}/batches/${initialBatchId}/end`, { method: "POST", token: teacherToken });
  assert.equal(initialBatchEnd.status, 200);
  assert.equal(initialBatchEnd.body.miniReport.questionCount, 1);

  const append = await request(`/classroom/sessions/${liveSessionId}/append-questions`, { method: "POST", token: teacherToken, body: { questionIds: [q2, q3], autoPublishFirst: true } });
  assert.equal(append.status, 200, JSON.stringify(append.body));
  assert.deepEqual(new Set(append.body.publishedQuestionIds), new Set([q2, q3]));
  assert.equal((await request(`/classroom/sessions/${liveSessionId}/append-questions`, { method: "POST", token: teacherToken, body: { questionIds: [q2, q3], autoPublishFirst: true } })).status, 409);

  const current = await request(`/classroom/sessions/${liveSessionId}/current`, { token: studentAToken });
  assert.equal(current.status, 200);
  assert.equal(current.body.questions.length, 2);
  assert.equal(current.body.currentIndex, 0);
  assert.equal("correctOptionIndex" in current.body.questions[0], false);
  assert.equal("explanation" in current.body.questions[0], false);

  await request(`/classroom/sessions/${liveSessionId}/answers/${q2}`, { method: "PUT", token: studentAToken, body: { selectedOptionIndex: 2 } });
  await request(`/classroom/sessions/${liveSessionId}/answers/${q2}`, { method: "PUT", token: studentA2Token, body: { selectedOptionIndex: 0 } });
  await request(`/classroom/sessions/${liveSessionId}/answers/${q3}`, { method: "PUT", token: studentAToken, body: { selectedOptionIndex: 0 } });
  const concurrentAnswers = await Promise.all(loadStudentTokens.map((token, index) => request(`/classroom/sessions/${liveSessionId}/answers/${q2}`, {
    method: "PUT", token, body: { selectedOptionIndex: index % 4 },
  })));
  assert.ok(concurrentAnswers.every((result) => result.status === 200), `Concurrent answers from a ${LOAD_STUDENT_COUNT + 2}-student class should all be accepted`);

  const aggregate = await request(`/classroom/sessions/${liveSessionId}/aggregate`, { token: teacherToken });
  assert.equal(aggregate.status, 200);
  const q2Stats = aggregate.body.questions.find((question: any) => question.questionId === q2);
  const q3Stats = aggregate.body.questions.find((question: any) => question.questionId === q3);
  assert.equal(q2Stats.responseCount, LOAD_STUDENT_COUNT + 2);
  assert.equal(Object.values(q2Stats.distribution).reduce((sum: number, count: any) => sum + Number(count), 0), LOAD_STUDENT_COUNT + 2);
  assert.equal(q3Stats.responseCount, 1);
  assert.equal(q3Stats.distribution["0"], 1);
  assert.equal(q2Stats.pathId, "path-two");

  const template = await request("/classroom/templates", { method: "POST", token: teacherToken, body: { schoolId: schoolAId, title: `Template ${RUN_ID}`, questionIds: [q1, q2], challengeIds: [q2] } });
  assert.equal(template.status, 201, JSON.stringify(template.body));
  const templates = await request(`/classroom/templates?schoolId=${schoolAId}`, { token: teacherToken });
  assert.equal(templates.status, 200);
  assert.ok(templates.body.templates.some((entry: any) => entry.title === `Template ${RUN_ID}`));

  const secondBatchEnd = await request(`/classroom/sessions/${liveSessionId}/batches/${append.body.batchId}/end`, { method: "POST", token: teacherToken });
  assert.equal(secondBatchEnd.status, 200);
  assert.equal(secondBatchEnd.body.miniReport.answered, LOAD_STUDENT_COUNT + 3);
  assert.equal(secondBatchEnd.body.miniReport.correct + secondBatchEnd.body.miniReport.wrong, LOAD_STUDENT_COUNT + 3);
  const secondBatchEndAgain = await request(`/classroom/sessions/${liveSessionId}/batches/${append.body.batchId}/end`, { method: "POST", token: teacherToken });
  assert.equal(secondBatchEndAgain.status, 200, "Repeated end-batch should be idempotent");
  assert.deepEqual(secondBatchEndAgain.body.miniReport, secondBatchEnd.body.miniReport);

  const ended = await request(`/classroom/sessions/${liveSessionId}/end`, { method: "POST", token: teacherToken });
  assert.equal(ended.status, 200);
  assert.equal(ended.body.report.roster.expected, LOAD_STUDENT_COUNT + 2);
  assert.equal(ended.body.report.roster.joined, LOAD_STUDENT_COUNT + 2);
  assert.equal(ended.body.report.totals.responses, LOAD_STUDENT_COUNT + 3);
  assert.ok(ended.body.report.questions.some((question: any) => question.questionId === q2 && question.answered === LOAD_STUDENT_COUNT + 2));
  const endedAgain = await request(`/classroom/sessions/${liveSessionId}/end`, { method: "POST", token: teacherToken });
  assert.equal(endedAgain.status, 200, "Repeated end-session should be idempotent");
  assert.deepEqual(endedAgain.body.report, ended.body.report, "Repeated end-session must return the immutable stored snapshot");
  assert.equal((await request(`/classroom/sessions/${liveSessionId}/instant-join`, { method: "POST", token: studentAToken })).status, 404);

  emitMetrics();
  console.log("Smart Classroom hardening E2E: PASS");
}

run()
  .catch((error) => {
    console.error("Smart Classroom hardening E2E: FAIL", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await cleanup(); } catch (error) { console.error("Smart Classroom E2E cleanup failed", error); }
    if (server) {
      server.closeAllConnections?.();
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    await mongoose.disconnect();
  });
