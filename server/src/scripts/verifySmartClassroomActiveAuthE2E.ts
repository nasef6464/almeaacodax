import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";
import { io as connectSocket, type Socket } from "socket.io-client";
import { createApp } from "../app.js";
import { env } from "../config/env.js";
import { ClassroomSessionModel } from "../models/ClassroomSession.js";
import { SchoolContractModel } from "../models/SchoolContract.js";
import { SchoolMembershipModel } from "../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../models/TeachingAssignment.js";
import { UserModel } from "../models/User.js";
import { createSocketServer } from "../sockets/index.js";
import { signAccessToken } from "../utils/jwt.js";

const RUN_ID = `active_auth_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const studentEmail = `student_${RUN_ID}@example.com`;
const teacherEmail = `teacher_${RUN_ID}@example.com`;
const supervisorEmail = `supervisor_${RUN_ID}@example.com`;
const schoolId = new mongoose.Types.ObjectId().toString();
const classId = new mongoose.Types.ObjectId().toString();
let server: http.Server | null = null;
const sockets: Socket[] = [];
let sessionId = "";

function databaseName(uri: string) {
  const withoutQuery = uri.split("?")[0] || "";
  const slash = withoutQuery.lastIndexOf("/");
  return slash >= 0 ? withoutQuery.slice(slash + 1) : "";
}

function assertSafeDatabase() {
  const name = databaseName(env.MONGODB_URI);
  if (env.NODE_ENV === "production") throw new Error("Smart Classroom active-auth E2E must never run in production");
  if (!/(?:test|ci|dev|local|sandbox)/i.test(name) && process.env.ALLOW_SMART_CLASSROOM_E2E_UNSAFE_DB !== "1") {
    throw new Error(`Refusing active-auth E2E against database '${name || "<default>"}'`);
  }
}

function tokenFor(user: any) {
  return signAccessToken({
    id: String(user._id),
    email: String(user.email),
    role: user.role,
    name: String(user.name),
  });
}

async function connectAuthorized(baseUrl: string, token: string) {
  const socket = connectSocket(baseUrl, {
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

async function expectConnectionRejected(baseUrl: string, token: string) {
  const socket = connectSocket(baseUrl, {
    auth: { token },
    transports: ["websocket"],
    reconnection: false,
  });
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Expected disabled socket connection to be rejected")), 5000);
    socket.once("connect", () => {
      clearTimeout(timeout);
      reject(new Error("Disabled account unexpectedly connected to Smart Classroom socket"));
    });
    socket.once("connect_error", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
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

async function get(url: string, token: string) {
  return fetch(url, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
}

async function run() {
  assertSafeDatabase();
  await mongoose.connect(env.MONGODB_URI);
  const testEmails = [studentEmail, teacherEmail, supervisorEmail];
  await Promise.all([
    UserModel.deleteMany({ email: { $in: testEmails } }),
    SchoolContractModel.deleteMany({ schoolId }),
    TeachingAssignmentModel.deleteMany({ schoolId }),
  ]);

  const [student, teacher, supervisor] = await Promise.all([
    UserModel.create({
      name: "Smart Classroom Revoked Student",
      email: studentEmail,
      passwordHash: "x",
      role: "student",
      schoolId,
      groupIds: [classId],
      isActive: true,
    }),
    UserModel.create({
      name: "Smart Classroom Revoked Teacher",
      email: teacherEmail,
      passwordHash: "x",
      role: "teacher",
      schoolId,
      groupIds: [],
      isActive: true,
    }),
    UserModel.create({
      name: "Smart Classroom Revoked Supervisor",
      email: supervisorEmail,
      passwordHash: "x",
      role: "supervisor",
      schoolId,
      groupIds: [],
      isActive: true,
    }),
  ]);
  const studentId = String(student._id);
  const teacherId = String(teacher._id);
  const supervisorId = String(supervisor._id);
  const testUserIds = [studentId, teacherId, supervisorId];

  await SchoolMembershipModel.deleteMany({ userId: { $in: testUserIds }, schoolId });
  await Promise.all([
    SchoolContractModel.create({ schoolId, status: "active", modules: ["SCHOOL_CORE", "SMART_CLASSROOM"] }),
    SchoolMembershipModel.create({ userId: studentId, schoolId, role: "student", status: "active" }),
    SchoolMembershipModel.create({ userId: teacherId, schoolId, role: "teacher", status: "active" }),
    SchoolMembershipModel.create({ userId: supervisorId, schoolId, role: "supervisor", status: "active" }),
    TeachingAssignmentModel.create({ schoolId, teacherId, classId, subjectId: `subject_${RUN_ID}`, status: "active" }),
  ]);

  const session = await ClassroomSessionModel.create({
    schoolId,
    classId,
    teacherId,
    status: "live",
    questionSnapshots: [],
    publishedQuestionIds: [],
    pinHash: `active-auth-${RUN_ID}`,
    pinExpiresAt: new Date(Date.now() + 30 * 60_000),
  });
  sessionId = String(session._id);

  const studentToken = tokenFor(student);
  const teacherToken = tokenFor(teacher);
  const supervisorToken = tokenFor(supervisor);

  const app = createApp();
  server = http.createServer(app);
  createSocketServer(server);
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const studentEndpoint = `${baseUrl}/api/classroom/student/active-session`;
  const teacherEndpoint = `${baseUrl}/api/classroom/sessions/${sessionId}/aggregate`;
  const teacherHistoryEndpoint = `${baseUrl}/api/classroom/teacher/history`;
  const scopedTeacherHistoryEndpoint = `${teacherHistoryEndpoint}?schoolId=${encodeURIComponent(schoolId)}`;

  assert.equal((await get(studentEndpoint, studentToken)).status, 200, "active student should reach Smart Classroom HTTP routes");
  assert.equal((await get(teacherEndpoint, teacherToken)).status, 200, "active assigned session owner should reach its classroom HTTP route");
  assert.equal((await get(teacherEndpoint, supervisorToken)).status, 200, "active entitled supervisor should reach scoped classroom aggregate data");
  assert.equal((await get(teacherHistoryEndpoint, teacherToken)).status, 400, "teacher history must require an explicit school scope");
  assert.equal((await get(scopedTeacherHistoryEndpoint, teacherToken)).status, 200, "active teacher should read history for an active school membership");

  const activeStudentSocket = await connectAuthorized(baseUrl, studentToken);
  assert.equal((await joinWorkspace(activeStudentSocket, `class:${classId}`)).ok, true, "active student should join its class discovery room");
  activeStudentSocket.disconnect();

  const activeTeacherSocket = await connectAuthorized(baseUrl, teacherToken);
  assert.equal((await joinWorkspace(activeTeacherSocket, `classroom:${sessionId}`)).ok, true, "active assigned session owner should join its classroom room");
  activeTeacherSocket.disconnect();

  const activeSupervisorSocket = await connectAuthorized(baseUrl, supervisorToken);
  assert.equal((await joinWorkspace(activeSupervisorSocket, `classroom:${sessionId}`)).ok, true, "active entitled supervisor should join classroom realtime");
  activeSupervisorSocket.disconnect();

  await SchoolMembershipModel.updateOne(
    { userId: studentId, schoolId, role: "student" },
    { $set: { status: "inactive" } },
  );
  assert.equal(
    (await get(studentEndpoint, studentToken)).status,
    403,
    "inactive explicit student membership must override legacy User.schoolId",
  );
  const membershipRevokedStudentSocket = await connectAuthorized(baseUrl, studentToken);
  assert.equal(
    (await joinWorkspace(membershipRevokedStudentSocket, `class:${classId}`)).ok,
    false,
    "student with inactive school membership must not rejoin the class discovery room",
  );
  membershipRevokedStudentSocket.disconnect();

  await SchoolMembershipModel.updateOne(
    { userId: teacherId, schoolId, role: "teacher" },
    { $set: { status: "inactive" } },
  );
  assert.equal(
    (await get(teacherEndpoint, teacherToken)).status,
    403,
    "inactive teacher membership must revoke access to an already-owned classroom session",
  );
  assert.equal(
    (await get(scopedTeacherHistoryEndpoint, teacherToken)).status,
    403,
    "inactive teacher membership must revoke access to historical classroom reports",
  );
  const membershipRevokedTeacherSocket = await connectAuthorized(baseUrl, teacherToken);
  assert.equal(
    (await joinWorkspace(membershipRevokedTeacherSocket, `classroom:${sessionId}`)).ok,
    false,
    "teacher ownership must not bypass revoked school membership on reconnect",
  );
  membershipRevokedTeacherSocket.disconnect();

  await SchoolMembershipModel.updateMany(
    { userId: { $in: [studentId, teacherId] }, schoolId },
    { $set: { status: "active" } },
  );
  await SchoolContractModel.updateOne(
    { schoolId },
    { $set: { status: "active", modules: ["SCHOOL_CORE"] } },
  );

  assert.equal((await get(studentEndpoint, studentToken)).status, 403, "student HTTP access must stop when SMART_CLASSROOM is removed from the school contract");
  assert.equal((await get(teacherEndpoint, teacherToken)).status, 403, "teacher runtime access must stop when SMART_CLASSROOM is removed from the school contract");
  assert.equal((await get(teacherEndpoint, supervisorToken)).status, 403, "supervisor aggregate access must stop when SMART_CLASSROOM is removed from the school contract");
  assert.equal((await get(scopedTeacherHistoryEndpoint, teacherToken)).status, 403, "teacher classroom history must respect the school module entitlement");

  const entitlementRevokedStudentSocket = await connectAuthorized(baseUrl, studentToken);
  assert.equal(
    (await joinWorkspace(entitlementRevokedStudentSocket, `class:${classId}`)).ok,
    false,
    "student must not rejoin class discovery after SMART_CLASSROOM entitlement is removed",
  );
  entitlementRevokedStudentSocket.disconnect();

  const entitlementRevokedTeacherSocket = await connectAuthorized(baseUrl, teacherToken);
  assert.equal(
    (await joinWorkspace(entitlementRevokedTeacherSocket, `classroom:${sessionId}`)).ok,
    false,
    "teacher must not rejoin classroom realtime after SMART_CLASSROOM entitlement is removed",
  );
  entitlementRevokedTeacherSocket.disconnect();

  const entitlementRevokedSupervisorSocket = await connectAuthorized(baseUrl, supervisorToken);
  assert.equal(
    (await joinWorkspace(entitlementRevokedSupervisorSocket, `classroom:${sessionId}`)).ok,
    false,
    "supervisor must not rejoin classroom realtime after SMART_CLASSROOM entitlement is removed",
  );
  entitlementRevokedSupervisorSocket.disconnect();

  await SchoolContractModel.updateOne(
    { schoolId },
    { $set: { status: "active", modules: ["SCHOOL_CORE", "SMART_CLASSROOM"] } },
  );
  assert.equal((await get(studentEndpoint, studentToken)).status, 200, "restoring SMART_CLASSROOM should restore eligible student HTTP access");
  assert.equal((await get(teacherEndpoint, teacherToken)).status, 200, "restoring SMART_CLASSROOM should restore eligible teacher HTTP access");
  assert.equal((await get(teacherEndpoint, supervisorToken)).status, 200, "restoring SMART_CLASSROOM should restore eligible supervisor HTTP access");

  await TeachingAssignmentModel.updateOne(
    { schoolId, teacherId, classId },
    { $set: { status: "inactive" } },
  );
  assert.equal(
    (await get(teacherEndpoint, teacherToken)).status,
    403,
    "inactive teaching assignment must revoke runtime access to an already-owned classroom session",
  );
  assert.equal(
    (await get(scopedTeacherHistoryEndpoint, teacherToken)).status,
    200,
    "assignment revocation must not erase the teacher's historical school reports while school membership remains active",
  );
  const assignmentRevokedTeacherSocket = await connectAuthorized(baseUrl, teacherToken);
  assert.equal(
    (await joinWorkspace(assignmentRevokedTeacherSocket, `classroom:${sessionId}`)).ok,
    false,
    "teacher ownership must not bypass an inactive class assignment on reconnect",
  );
  assignmentRevokedTeacherSocket.disconnect();

  await TeachingAssignmentModel.updateOne(
    { schoolId, teacherId, classId },
    { $set: { status: "active" } },
  );
  assert.equal((await get(teacherEndpoint, teacherToken)).status, 200, "restoring the teaching assignment should restore eligible runtime access");
  const restoredTeacherSocket = await connectAuthorized(baseUrl, teacherToken);
  assert.equal((await joinWorkspace(restoredTeacherSocket, `classroom:${sessionId}`)).ok, true, "restoring the teaching assignment should restore realtime ownership access");
  restoredTeacherSocket.disconnect();

  await UserModel.updateMany(
    { _id: { $in: [student._id, teacher._id, supervisor._id] } },
    { $set: { isActive: false } },
  );

  assert.equal((await get(studentEndpoint, studentToken)).status, 401, "disabled student must lose classroom HTTP access with an unexpired JWT");
  assert.equal((await get(teacherEndpoint, teacherToken)).status, 401, "disabled teacher must lose classroom HTTP access with an unexpired JWT");
  assert.equal((await get(teacherEndpoint, supervisorToken)).status, 401, "disabled supervisor must lose classroom HTTP access with an unexpired JWT");
  assert.equal((await get(scopedTeacherHistoryEndpoint, teacherToken)).status, 401, "disabled teacher must lose classroom history access with an unexpired JWT");
  await expectConnectionRejected(baseUrl, studentToken);
  await expectConnectionRejected(baseUrl, teacherToken);
  await expectConnectionRejected(baseUrl, supervisorToken);

  console.log("Smart Classroom account, membership, assignment and module-entitlement revocation E2E: PASS");
}

run()
  .catch((error) => {
    console.error("Smart Classroom account, membership, assignment and module-entitlement revocation E2E: FAIL", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    sockets.splice(0).forEach((socket) => socket.disconnect());
    try {
      if (sessionId) await ClassroomSessionModel.deleteOne({ _id: sessionId });
      const users = await UserModel.find({ email: { $in: [studentEmail, teacherEmail, supervisorEmail] } }).select("_id").lean();
      const userIds = users.map((user: any) => String(user._id));
      if (userIds.length) await SchoolMembershipModel.deleteMany({ userId: { $in: userIds }, schoolId });
      await TeachingAssignmentModel.deleteMany({ schoolId });
      await SchoolContractModel.deleteMany({ schoolId });
      await UserModel.deleteMany({ email: { $in: [studentEmail, teacherEmail, supervisorEmail] } });
    } catch (error) {
      console.error("Active-auth E2E cleanup failed", error);
    }
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await mongoose.disconnect();
  });
