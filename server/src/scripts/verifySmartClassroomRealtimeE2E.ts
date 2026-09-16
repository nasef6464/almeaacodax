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

const RUN_ID = `realtime_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const sockets: Socket[] = [];
const sessionIds: string[] = [];
const userIds: string[] = [];
const classIds: string[] = [];
let schoolId = "";
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
  if (env.NODE_ENV === "production") throw new Error("Smart Classroom realtime E2E must never run in production");
  if (!/(?:test|ci|dev|local|sandbox)/i.test(name) && process.env.ALLOW_SMART_CLASSROOM_E2E_UNSAFE_DB !== "1") {
    throw new Error(`Refusing realtime E2E against database '${name || "<default>"}'`);
  }
}

function tokenFor(user: any) {
  return signAccessToken({
    id: String(user._id),
    email: String(user.email),
    role: user.role,
    name: String(user.name || "Realtime Test User"),
  });
}

async function request(endpoint: string, options: { method?: string; token?: string; body?: unknown } = {}) {
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
}

async function initCsrf() {
  const response = await fetch(`${apiBaseUrl}/auth/csrf-token`);
  assert.equal(response.status, 200);
  const body: any = await response.json();
  csrfToken = body.csrfToken;
  csrfCookie = (response.headers.get("set-cookie") || "").split(";")[0] || `almeaa_csrf_token=${csrfToken}`;
}

async function connectAuthorized(token: string) {
  const socket = connectSocket(socketBaseUrl, {
    auth: { token },
    transports: ["websocket"],
    reconnection: false,
  });
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Socket connection timeout")), 5000);
    socket.once("connect", () => { clearTimeout(timeout); resolve(); });
    socket.once("connect_error", (error) => { clearTimeout(timeout); reject(error); });
  });
  return socket;
}

async function joinWorkspace(socket: Socket, room: string) {
  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const timeout = setTimeout(() => resolve({ ok: false, error: "join timeout" }), 5000);
    socket.emit("workspace:join", room, (result: { ok: boolean; error?: string }) => {
      clearTimeout(timeout);
      resolve(result);
    });
  });
}

function waitForEvent<T = any>(socket: Socket, event: string, timeoutMs = 5000) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const handler = (payload: T) => {
      clearTimeout(timeout);
      resolve(payload);
    };
    socket.once(event, handler);
  });
}

function assertNoEvent(socket: Socket, event: string, timeoutMs = 350) {
  return new Promise<void>((resolve, reject) => {
    const handler = () => {
      clearTimeout(timeout);
      reject(new Error(`Unexpected ${event} event`));
    };
    const timeout = setTimeout(() => {
      socket.off(event, handler);
      resolve();
    }, timeoutMs);
    socket.once(event, handler);
  });
}

async function cleanup() {
  sockets.splice(0).forEach((socket) => socket.disconnect());
  if (sessionIds.length) {
    await Promise.all([
      ClassroomResponseModel.deleteMany({ sessionId: { $in: sessionIds } }),
      ClassroomParticipantModel.deleteMany({ sessionId: { $in: sessionIds } }),
      ClassroomSessionModel.deleteMany({ _id: { $in: sessionIds.filter((id) => mongoose.isValidObjectId(id)) } }),
    ]);
  }
  await Promise.all([
    TeachingAssignmentModel.deleteMany({ schoolId }),
    SchoolMembershipModel.deleteMany({ schoolId }),
    SchoolContractModel.deleteMany({ schoolId }),
    QuestionModel.deleteMany({ id: { $regex: RUN_ID } }),
    classIds.length ? GroupModel.deleteMany({ _id: { $in: classIds } }) : Promise.resolve(),
    schoolId ? GroupModel.deleteMany({ _id: schoolId }) : Promise.resolve(),
    userIds.length ? UserModel.deleteMany({ _id: { $in: userIds } }) : Promise.resolve(),
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

  const school = await GroupModel.create({ name: `Realtime School ${RUN_ID}`, type: "SCHOOL", ownerId: RUN_ID });
  schoolId = String(school._id);
  await SchoolContractModel.create({ schoolId, status: "active", modules: ["SCHOOL_CORE", "SMART_CLASSROOM"] });

  const [teacherA, teacherA2, student] = await Promise.all([
    UserModel.create({ name: "Realtime Teacher A", email: `teacher_a_${RUN_ID}@example.com`, passwordHash: "x", role: "teacher", schoolId, isActive: true }),
    UserModel.create({ name: "Realtime Teacher A2", email: `teacher_a2_${RUN_ID}@example.com`, passwordHash: "x", role: "teacher", schoolId, isActive: true }),
    UserModel.create({ name: "Realtime Student", email: `student_${RUN_ID}@example.com`, passwordHash: "x", role: "student", schoolId, groupIds: [], isActive: true }),
  ]);
  userIds.push(String(teacherA._id), String(teacherA2._id), String(student._id));

  const [classA, classA2] = await Promise.all([
    GroupModel.create({ name: `Realtime Class A ${RUN_ID}`, type: "CLASS", parentId: schoolId, ownerId: String(teacherA._id), studentIds: [String(student._id)] }),
    GroupModel.create({ name: `Realtime Class A2 ${RUN_ID}`, type: "CLASS", parentId: schoolId, ownerId: String(teacherA2._id), studentIds: [] }),
  ]);
  const classAId = String(classA._id);
  const classA2Id = String(classA2._id);
  classIds.push(classAId, classA2Id);
  await UserModel.updateOne({ _id: student._id }, { $set: { groupIds: [classAId] } });

  await Promise.all([
    SchoolMembershipModel.create({ userId: String(teacherA._id), schoolId, role: "teacher", status: "active" }),
    SchoolMembershipModel.create({ userId: String(teacherA2._id), schoolId, role: "teacher", status: "active" }),
    SchoolMembershipModel.create({ userId: String(student._id), schoolId, role: "student", status: "active" }),
    TeachingAssignmentModel.create({ schoolId, teacherId: String(teacherA._id), classId: classAId, subjectId: "general", status: "active" }),
    TeachingAssignmentModel.create({ schoolId, teacherId: String(teacherA2._id), classId: classA2Id, subjectId: "general", status: "active" }),
  ]);

  const [question1, question2] = await Promise.all([
    QuestionModel.create({ id: `rt_q1_${RUN_ID}`, text: "Realtime Q1", options: ["A", "B"], correctOptionIndex: 1, subject: "general", type: "mcq", approvalStatus: "approved", ownerType: "platform", skillIds: ["rt-skill-1"] }),
    QuestionModel.create({ id: `rt_q2_${RUN_ID}`, text: "Realtime Q2", options: ["A", "B"], correctOptionIndex: 0, subject: "general", type: "mcq", approvalStatus: "approved", ownerType: "platform", skillIds: ["rt-skill-2"] }),
  ]);
  const q1 = String(question1.id);
  const q2 = String(question2.id);

  const teacherAToken = tokenFor(teacherA);
  const teacherA2Token = tokenFor(teacherA2);
  const studentToken = tokenFor(student);

  const studentSocket = await connectAuthorized(studentToken);
  assert.equal((await joinWorkspace(studentSocket, `class:${classAId}`)).ok, true, "student should join own class room");

  const startedEvent = waitForEvent<any>(studentSocket, "classroom:started");
  const live = await request("/classroom/sessions", {
    method: "POST",
    token: teacherAToken,
    body: { schoolId, classId: classAId, questionIds: [q1], autoStart: true, className: "Realtime A" },
  });
  assert.equal(live.status, 201, JSON.stringify(live.body));
  const sessionAId = String(live.body.sessionId);
  sessionIds.push(sessionAId);
  const started = await startedEvent;
  assert.equal(String(started.sessionId), sessionAId);
  assert.equal(String(started.classId), classAId);

  assert.equal((await request(`/classroom/sessions/${sessionAId}/instant-join`, { method: "POST", token: studentToken })).status, 200);
  assert.equal((await joinWorkspace(studentSocket, `classroom:${sessionAId}`)).ok, true);

  const teacherASocket = await connectAuthorized(teacherAToken);
  assert.equal((await joinWorkspace(teacherASocket, `classroom:${sessionAId}`)).ok, true);

  const teacherA2Socket = await connectAuthorized(teacherA2Token);
  assert.equal((await joinWorkspace(teacherA2Socket, `classroom:${sessionAId}`)).ok, false, "second teacher must not join another teacher's session room");
  assert.equal((await request(`/classroom/sessions/${sessionAId}/aggregate`, { token: teacherA2Token })).status, 403, "second teacher must not read another teacher's live aggregate");
  assert.equal((await request(`/classroom/sessions/${sessionAId}/append-questions`, { method: "POST", token: teacherA2Token, body: { questionIds: [q2], autoPublishFirst: true } })).status, 403, "second teacher must not mutate another teacher's session");

  const activeSessionBeforeAppend = await ClassroomSessionModel.findById(sessionAId).select("activeBatchId").lean() as any;
  const firstBatchId = String(activeSessionBeforeAppend?.activeBatchId || "");
  assert.ok(firstBatchId, "auto-started session should have an active initial batch");
  const firstBatchEnd = await request(`/classroom/sessions/${sessionAId}/batches/${firstBatchId}/end`, {
    method: "POST",
    token: teacherAToken,
  });
  assert.equal(firstBatchEnd.status, 200, JSON.stringify(firstBatchEnd.body));

  const publishedEvent = waitForEvent<any>(studentSocket, "question:published");
  const append = await request(`/classroom/sessions/${sessionAId}/append-questions`, {
    method: "POST",
    token: teacherAToken,
    body: { questionIds: [q2], autoPublishFirst: true },
  });
  assert.equal(append.status, 200, JSON.stringify(append.body));
  const published = await publishedEvent;
  assert.equal(String(published.questionId), q2);

  const responseEvent = waitForEvent<any>(teacherASocket, "response:updated");
  const noStudentResponseEvent = assertNoEvent(studentSocket, "response:updated");
  const answer = await request(`/classroom/sessions/${sessionAId}/answers/${q2}`, {
    method: "PUT",
    token: studentToken,
    body: { selectedOptionIndex: 0 },
  });
  assert.equal(answer.status, 200, JSON.stringify(answer.body));
  const responseUpdated = await responseEvent;
  await noStudentResponseEvent;
  assert.equal(String(responseUpdated.questionId), q2);
  assert.equal("studentId" in responseUpdated, false, "staff realtime aggregate must not expose student identity");
  assert.equal("selectedOptionIndex" in responseUpdated, false, "staff realtime aggregate must not expose a student's answer");
  assert.equal("isCorrect" in responseUpdated, false, "staff realtime aggregate must not expose a student's correctness");

  const teacherEndedOnSession = waitForEvent<any>(teacherASocket, "session:ended");
  const studentEndedOnSession = waitForEvent<any>(studentSocket, "session:ended");
  const endedOnClass = waitForEvent<any>(studentSocket, "classroom:ended");
  const ended = await request(`/classroom/sessions/${sessionAId}/end`, { method: "POST", token: teacherAToken });
  assert.equal(ended.status, 200, JSON.stringify(ended.body));
  assert.ok(ended.body?.report, "authorized HTTP end response should return the finalized report to the teacher");
  const [teacherSessionEnd, studentSessionEnd, classEndPayload] = await Promise.all([
    teacherEndedOnSession,
    studentEndedOnSession,
    endedOnClass,
  ]);
  for (const payload of [teacherSessionEnd, studentSessionEnd]) {
    assert.equal(String(payload.sessionId), sessionAId);
    assert.equal(String(payload.status), "ended");
    assert.equal("report" in payload, false, "shared classroom session room must not broadcast the finalized report");
  }
  assert.equal(String(classEndPayload.sessionId), sessionAId);

  const ownSession = await request("/classroom/sessions", {
    method: "POST",
    token: teacherA2Token,
    body: { schoolId, classId: classA2Id, questionIds: [q1], autoStart: true, className: "Realtime A2" },
  });
  assert.equal(ownSession.status, 201, JSON.stringify(ownSession.body));
  const sessionA2Id = String(ownSession.body.sessionId);
  sessionIds.push(sessionA2Id);
  assert.equal((await request(`/classroom/sessions/${sessionA2Id}/aggregate`, { token: teacherA2Token })).status, 200, "second teacher should access own assigned-class session");
  assert.equal((await joinWorkspace(teacherA2Socket, `classroom:${sessionA2Id}`)).ok, true, "second teacher should join own session room");

  const reconnectingStudent = await connectAuthorized(studentToken);
  assert.equal((await joinWorkspace(reconnectingStudent, `class:${classAId}`)).ok, true, "authorized student should rejoin own class room after reconnect");

  assert.equal((await request(`/classroom/sessions/${sessionA2Id}/end`, { method: "POST", token: teacherA2Token })).status, 200);
  console.log("Smart Classroom realtime delivery and teacher isolation E2E: PASS");
}

run()
  .catch((error) => {
    console.error("Smart Classroom realtime delivery and teacher isolation E2E: FAIL", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await cleanup(); } catch (error) { console.error("Realtime E2E cleanup failed", error); }
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await mongoose.disconnect();
  });