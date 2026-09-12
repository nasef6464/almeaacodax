import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";
import { io as connectSocket, type Socket } from "socket.io-client";
import { createApp } from "../app.js";
import { env } from "../config/env.js";
import { SchoolMembershipModel } from "../models/SchoolMembership.js";
import { UserModel } from "../models/User.js";
import { createSocketServer } from "../sockets/index.js";
import { signAccessToken } from "../utils/jwt.js";

const RUN_ID = `active_auth_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const email = `${RUN_ID}@example.com`;
const schoolId = new mongoose.Types.ObjectId().toString();
const classId = new mongoose.Types.ObjectId().toString();
let server: http.Server | null = null;
const sockets: Socket[] = [];

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

async function run() {
  assertSafeDatabase();
  await mongoose.connect(env.MONGODB_URI);
  await UserModel.deleteMany({ email });

  const student = await UserModel.create({
    name: "Smart Classroom Revoked Student",
    email,
    passwordHash: "x",
    role: "student",
    schoolId,
    groupIds: [classId],
    isActive: true,
  });
  const studentId = String(student._id);
  await SchoolMembershipModel.deleteMany({ userId: studentId, schoolId });
  await SchoolMembershipModel.create({ userId: studentId, schoolId, role: "student", status: "active" });

  const token = signAccessToken({
    id: studentId,
    email: student.email,
    role: student.role,
    name: student.name,
  });

  const app = createApp();
  server = http.createServer(app);
  createSocketServer(server);
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const endpoint = `${baseUrl}/api/classroom/student/active-session`;

  const activeResponse = await fetch(endpoint, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  assert.equal(activeResponse.status, 200, "active student should reach Smart Classroom HTTP routes");

  const activeSocket = await connectAuthorized(baseUrl, token);
  assert.equal((await joinWorkspace(activeSocket, `class:${classId}`)).ok, true, "active student should join its class discovery room");
  activeSocket.disconnect();

  await SchoolMembershipModel.updateOne(
    { userId: studentId, schoolId, role: "student" },
    { $set: { status: "inactive" } },
  );

  const inactiveMembershipResponse = await fetch(endpoint, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  assert.equal(inactiveMembershipResponse.status, 403, "inactive explicit membership must override legacy User.schoolId");

  const membershipRevokedSocket = await connectAuthorized(baseUrl, token);
  assert.equal(
    (await joinWorkspace(membershipRevokedSocket, `class:${classId}`)).ok,
    false,
    "student with inactive school membership must not rejoin the class discovery room",
  );
  membershipRevokedSocket.disconnect();

  await SchoolMembershipModel.updateOne(
    { userId: studentId, schoolId, role: "student" },
    { $set: { status: "active" } },
  );
  await UserModel.updateOne({ _id: student._id }, { $set: { isActive: false } });

  const revokedResponse = await fetch(endpoint, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  assert.equal(revokedResponse.status, 401, "disabled student must lose Smart Classroom HTTP access even with an unexpired JWT");
  await expectConnectionRejected(baseUrl, token);

  console.log("Smart Classroom account and school-membership revocation E2E: PASS");
}

run()
  .catch((error) => {
    console.error("Smart Classroom account and school-membership revocation E2E: FAIL", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    sockets.splice(0).forEach((socket) => socket.disconnect());
    try {
      const user = await UserModel.findOne({ email }).select("_id").lean();
      if (user) await SchoolMembershipModel.deleteMany({ userId: String(user._id), schoolId });
      await UserModel.deleteMany({ email });
    } catch (error) {
      console.error("Active-auth E2E cleanup failed", error);
    }
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await mongoose.disconnect();
  });
