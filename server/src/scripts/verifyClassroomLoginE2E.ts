/// <reference path="../types/express.d.ts" />
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../app.js";
import { env } from "../config/env.js";
import { UserModel } from "../models/User.js";
import { NotificationDeliveryModel } from "../models/NotificationDelivery.js";
import { closeRedisClients, createRedisClient } from "../config/redis.js";
import { ipKeyGenerator } from "express-rate-limit";

const dbName = env.MONGODB_URI.split("?")[0].split("/").pop() || "";
assert(env.NODE_ENV === "test" && /(?:test|ci|sandbox)/i.test(dbName), "isolated test database required; no production override");
assert.equal(env.RATE_LIMIT_AUTH_LIMIT, 20, "test actual default failure budget");
assert.equal(env.RATE_LIMIT_LOGIN_ACCOUNT_LIMIT, 10);
assert.equal(env.RATE_LIMIT_LOGIN_SOURCE_FAILURE_LIMIT, 10);
const run = `class_login_${Date.now()}`;
const password = "Classroom-test-password-42!";
const emails = Array.from({ length: 40 }, (_, i) => `${run}_${i}@example.invalid`);
await mongoose.connect(env.MONGODB_URI);
const server = createApp().listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const mailbox: any[] = [];
const mailServer = http.createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  mailbox.push(JSON.parse(Buffer.concat(chunks).toString()));
  res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ id: "isolated-mail-delivery" }));
}).listen(0, "127.0.0.1");
await new Promise<void>((resolve) => mailServer.once("listening", resolve));
process.env.EMAIL_PROVIDER = "http";
process.env.EMAIL_WEBHOOK_URL = `http://127.0.0.1:${(mailServer.address() as AddressInfo).port}`;
process.env.EMAIL_WEBHOOK_TOKEN = "";
try {
  const passwordHash = await bcrypt.hash(password, 10);
  await UserModel.insertMany(emails.map((email, i) => ({ email, name: `CI classroom ${i}`, passwordHash, role: "student", isActive: true })));
  const csrfResponse = await fetch(`${base}/api/auth/csrf-token`);
  const { csrfToken } = await csrfResponse.json() as { csrfToken: string };
  const login = (email: string, inputPassword = password, source = "198.51.100.1", path = "/api/auth/login") => fetch(base + path, {
    method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": source, "x-csrf-token": csrfToken, cookie: `almeaa_csrf_token=${csrfToken}` },
    body: JSON.stringify({ email, password: inputPassword }),
  });
  const results = await Promise.all(emails.map(async (email) => {
    const response = await login(email);
    assert.equal(response.status, 200);
    assert(response.headers.get("set-cookie")?.includes("almeaa_access_token="), "normal cookie issued");
    const body = await response.json() as any;
    assert.equal(body.user.email, email); assert.equal(body.user.role, "student");
    assert.equal(body.user.passwordHash, undefined);
    return email;
  }));
  assert.equal(new Set(results).size, 40);
  for (let i = 0; i < 10; i++) assert.equal((await login(emails[0], "wrong-password", "198.51.100.2")).status, 401);
  assert.equal((await login(emails[0], password, "198.51.100.3", "/auth/login")).status, 429);
  const locked = await UserModel.findOne({ email: emails[0] }).lean();
  assert(locked && Number(locked.loginLockedUntil) > Date.now(), "existing persisted password lock survives");
  for (let i = 0; i < 10; i++) assert.equal((await login(`${run}_missing${i}@example.invalid`, "wrong-password", "198.51.100.4")).status, 401);
  const denied = await login(emails[1], password, "198.51.100.4");
  assert.equal(denied.status, 429); assert(Number(denied.headers.get("retry-after")) > 0);
  if (env.RATE_LIMIT_REDIS_ENABLED && env.REDIS_URL) {
    const redis = createRedisClient("rate-limit")!;
    const key = "login-failures:" + createHash("sha256").update(ipKeyGenerator("198.51.100.4")).digest("hex");
    assert.equal(await redis.get(key), "10", "actual Redis failure counter shares ioredis key prefix");
    assert((await redis.pttl(key)) > 0, "distributed failure keys expire");
  }
  assert.equal((await login(emails[1], password, "198.51.100.5")).status, 200);
  const forgot = await fetch(`${base}/api/auth/forgot-password`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.2", "x-csrf-token": csrfToken, cookie: `almeaa_csrf_token=${csrfToken}` }, body: JSON.stringify({ email: emails[0] }) });
  assert.equal(forgot.status, 200); assert.equal(mailbox.length, 1, "forgot-password must actually dispatch its own email");
  assert.equal(mailbox[0].recipientEmail, emails[0]);
  const recoveryUrl = new URL(String(mailbox[0].body).match(/https?:\/\/\S+/)![0]);
  assert.equal(recoveryUrl.origin, new URL(env.CLIENT_URL).origin);
  assert.equal(recoveryUrl.pathname, "/reset-password");
  const recoveryToken = recoveryUrl.searchParams.get("token")!;
  assert(recoveryToken.length >= 32);
  assert.equal((await NotificationDeliveryModel.findOne({ recipientEmail: emails[0], channel: "email" }).lean())?.status, "sent");
  const reset = (token: string) => fetch(`${base}/api/auth/reset-password`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.2", "x-csrf-token": csrfToken, cookie: `almeaa_csrf_token=${csrfToken}` }, body: JSON.stringify({ token, password: "Recovered-classroom-password-43!" }) });
  assert.equal((await reset("x".repeat(64))).status, 400, "invalid reset cannot release login protection");
  await UserModel.updateOne({ email: emails[0] }, { $set: { passwordResetExpiresAt: Date.now() - 1 } });
  assert.equal((await reset(recoveryToken)).status, 400, "expired reset cannot release login protection");
  await UserModel.updateOne({ email: emails[0] }, { $set: { passwordResetExpiresAt: Date.now() + 60000 } });
  assert.equal((await login(emails[0], password, "198.51.100.2")).status, 429);
  assert.equal((await reset(recoveryToken)).status, 200);
  assert.equal((await login(emails[0], "Recovered-classroom-password-43!", "198.51.100.2")).status, 200, "secure recovery releases account and recovery source immediately");
  assert.equal((await reset(recoveryToken)).status, 400, "reset token is single-use");
  assert.equal((await login(emails[1], password, "198.51.100.4")).status, 429, "other blocked source is unchanged");
  await UserModel.updateOne({ email: emails[2] }, { $set: { isActive: false } });
  assert.equal((await login(emails[2], password, "198.51.100.6")).status, 403);
  const noCsrf = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.7" }, body: JSON.stringify({ email: emails[3], password }) });
  assert.equal(noCsrf.status, 403);
  console.log("PASS: actual 40 concurrent Mongo/Redis/bcrypt/cookie/CSRF student logins; 10/10 budgets; secure single-use recovery; source isolation; disabled account and CSRF rejection");
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await new Promise<void>((resolve, reject) => mailServer.close((error) => error ? reject(error) : resolve()));
  await NotificationDeliveryModel.deleteMany({ recipientEmail: { $in: emails } });
  await UserModel.deleteMany({ email: { $in: emails } });
  await mongoose.disconnect(); await closeRedisClients();
}
