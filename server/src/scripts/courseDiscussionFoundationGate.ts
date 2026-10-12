import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { discussionRouter } from "../routes/discussions.routes.js";
import { courseRouter } from "../routes/course.routes.js";
import { authRouter } from "../routes/auth.routes.js";
import { UserModel } from "../models/User.js";
import { CourseModel } from "../models/Course.js";
import { AccessGrantModel } from "../models/AccessGrant.js";
import { PathModel } from "../models/Path.js";
import { AdminAuditLogModel } from "../models/AdminAuditLog.js";
import { signAccessToken } from "../utils/jwt.js";

// Catches removal of the discussion-only foundation scope, expiry bypass,
// cross-subject authorization, course-content widening and admin history masking.
async function main() {
  assert.equal(env.NODE_ENV, "test");
  assert.match(env.MONGODB_URI, /^mongodb:\/\/(127\.0\.0\.1|localhost):27017\/almeaa_platform_v3_ci_/);
  await mongoose.connect(env.MONGODB_URI);
  const app = express();
  app.use(express.json(), cookieParser());
  app.use("/discussions", discussionRouter);
  app.use("/courses", courseRouter);
  app.use("/auth", authRouter);
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error.statusCode || 500).json({ message: error.message }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const prefix = `discussion-review-${Date.now()}`;
  const courseId = `${prefix}-course`;
  const pathId = `${prefix}-path`;
  const users: any[] = [];
  const failures: string[] = [];
  let passed = 0;
  const check = async (name: string, fn: () => Promise<void>) => {
    try { await fn(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failures.push(name); console.error(`FAIL ${name}: ${(error as Error).message}`); }
  };
  const user = async (label: string, role = "student", subscription: any = { plan: "free" }) => {
    const created = await UserModel.create({ name: label, email: `${prefix}-${label}@example.invalid`, passwordHash: "unused-test-fixture", role, subscription, enrolledCourses: [] });
    users.push(created); return created;
  };
  const request = async (path: string, principal: any, body?: any) => {
    const headers: Record<string, string> = { "content-type": "application/json", authorization: `Bearer ${signAccessToken({ id: String(principal._id), role: principal.role, name: principal.name, email: principal.email })}` };
    if (body) {
      const csrf = await fetch(`${base}/auth/csrf-token`);
      headers.cookie = (csrf.headers.get("set-cookie") || "").split(";")[0];
      headers["x-csrf-token"] = (await csrf.json() as any).csrfToken;
    }
    const result = await fetch(`${base}${path}`, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined });
    return { status: result.status, body: await result.json() as any };
  };
  try {
    await PathModel.create({ _id: pathId, name: "Review fixture" });
    await CourseModel.create({ _id: courseId, title: "Paid discussion", instructor: "Fixture", price: 99, pathId, subjectId: "matching", isPublished: true, showOnPlatform: true, approvalStatus: "approved", modules: [{ title: "Module", lessons: [{ id: "locked", accessControl: "enrolled", videoUrl: "https://private.example.invalid/review" }] }] });
    let active: any;
    for (const [label, status, expiresAt, subjectId, expected] of [
      ["active", "active", Date.now() + 60000, "matching", 200],
      ["expired", "active", Date.now() - 1000, "matching", 403],
      ["revoked", "revoked", Date.now() + 60000, "matching", 403],
      ["unrelated", "active", Date.now() + 60000, "other-subject", 403],
    ] as const) {
      const principal = await user(label);
      if (label === "active") active = principal;
      await AccessGrantModel.create({ id: `${prefix}-${label}`, userId: String(principal._id), sourceType: "admin_manual", sourceId: `${prefix}-${label}`, idempotencyKey: `${prefix}-${label}`, courseIds: [], contentTypes: ["foundation"], pathIds: [pathId], subjectIds: [subjectId], status, expiresAt });
      await check(`foundation-only discussion ${label}`, async () => assert.equal((await request(`/discussions/course/${courseId}`, principal)).status, expected));
    }
    await check("foundation discussion access never opens paid course content", async () => {
      const result = await request(`/courses/${courseId}`, active);
      assert.equal(result.status, 200);
      assert.equal((result.body.course || result.body).modules[0].lessons[0].videoUrl, undefined);
    });
    const admin = await user("admin", "admin");
    const historical = await user("historical", "student", { plan: "premium", expiresAt: new Date(Date.now() - 1000) });
    await check("admin upsert response preserves historical premium plan", async () => {
      const result = await request("/auth/admin/users", admin, { name: historical.name, email: historical.email, password: "FixturePassword42!", role: "student" });
      assert.equal(result.status, 201);
      assert.equal(result.body.user.subscription.plan, "premium");
      assert.equal((await UserModel.findById(historical._id).lean())?.subscription?.plan, "premium");
    });
    console.log(`Discussion review: ${passed} PASS / ${failures.length} FAIL`);
    assert.equal(failures.length, 0, failures.join(", "));
  } finally {
    await Promise.all([UserModel.deleteMany({ _id: { $in: users.map(u => u._id) } }), CourseModel.deleteMany({ _id: courseId }), PathModel.deleteMany({ _id: pathId }), AccessGrantModel.deleteMany({ id: { $regex: `^${prefix}-` } }), AdminAuditLogModel.deleteMany({ resourceId: { $in: users.map(u => String(u._id)) } })]);
    await new Promise<void>(resolve => server.close(() => resolve()));
    await mongoose.disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
