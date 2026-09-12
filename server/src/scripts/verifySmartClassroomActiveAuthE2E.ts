import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { env } from "../config/env.js";
import { UserModel } from "../models/User.js";
import { signAccessToken } from "../utils/jwt.js";

const RUN_ID = `active_auth_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const email = `${RUN_ID}@example.com`;
let server: http.Server | null = null;

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

async function run() {
  assertSafeDatabase();
  await mongoose.connect(env.MONGODB_URI);
  await UserModel.deleteMany({ email });

  const student = await UserModel.create({
    name: "Smart Classroom Revoked Student",
    email,
    passwordHash: "x",
    role: "student",
    groupIds: [],
    isActive: true,
  });
  const token = signAccessToken({
    id: String(student._id),
    email: student.email,
    role: student.role,
    name: student.name,
  });

  const app = createApp();
  server = http.createServer(app);
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as any).port;
  const endpoint = `http://127.0.0.1:${port}/api/classroom/student/active-session`;

  const activeResponse = await fetch(endpoint, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  assert.equal(activeResponse.status, 200, "active student should reach Smart Classroom HTTP routes");

  await UserModel.updateOne({ _id: student._id }, { $set: { isActive: false } });

  const revokedResponse = await fetch(endpoint, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  assert.equal(revokedResponse.status, 401, "disabled student must lose Smart Classroom HTTP access even with an unexpired JWT");

  console.log("Smart Classroom active-account revocation E2E: PASS");
}

run()
  .catch((error) => {
    console.error("Smart Classroom active-account revocation E2E: FAIL", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await UserModel.deleteMany({ email }); } catch (error) { console.error("Active-auth E2E cleanup failed", error); }
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await mongoose.disconnect();
  });
