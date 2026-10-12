import assert from "node:assert/strict";
import express from "express";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { courseRouter } from "../routes/course.routes.js";
import { certificateRouter } from "../routes/certificates.routes.js";
import { discussionRouter } from "../routes/discussions.routes.js";
import { contentBootstrapRouter, clearContentBootstrapCache } from "../modules/content/http/contentBootstrapRoutes.js";
import { canSubmitQuiz } from "../modules/quizzes/application/quizAccessPolicy.js";
import { CourseModel } from "../models/Course.js";
import { UserModel } from "../models/User.js";
import { AccessGrantModel } from "../models/AccessGrant.js";
import { LessonModel } from "../models/Lesson.js";
import { LibraryItemModel } from "../models/LibraryItem.js";
import { PathModel } from "../models/Path.js";
import { CertificateModel } from "../models/Certificate.js";
import { signAccessToken } from "../utils/jwt.js";
import { authRouter } from "../routes/auth.routes.js";
import { getEffectivePurchaseIds, hasActivePremium, isActiveGrant } from "../services/entitlementPolicy.js";

// Removing read-time expiry/provenance checks, exact completion, relationship
// checks, or bootstrap redaction must make these real Mongo/HTTP cases fail.
async function main() {
  console.log("Access protection gate starting");
  assert.equal(env.NODE_ENV, "test");
  assert.match(env.MONGODB_URI, /^mongodb:\/\/(127\.0\.0\.1|localhost):27017\/almeaa_platform_v3_ci_/);
  await mongoose.connect(env.MONGODB_URI);
  console.log("Isolated Mongo connected");
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/courses", courseRouter);
  app.use("/certificates", certificateRouter);
  app.use("/discussions", discussionRouter);
  app.use("/content", contentBootstrapRouter);
  app.use("/auth", authRouter);
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error.statusCode || 500).json({ message: error.message }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const prefix = `access-${Date.now()}`;
  const courseId = `${prefix}-course`;
  const pathId = `${prefix}-path`;
  const secret = "https://private.example.invalid/locked";
  const preview = "https://public.example.invalid/preview";
  const users: any[] = [];
  const failures: string[] = [];
  let passed = 0;
  const check = async (name: string, fn: () => Promise<void>) => {
    try { await fn(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failures.push(name); console.error(`FAIL ${name}: ${(error as Error).message}`); }
  };
  const request = async (path: string, user?: any, body?: any, method?: string) => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (body && path.startsWith("/auth/")) {
      const csrf = await fetch(`${base}/auth/csrf-token`);
      headers.cookie = (csrf.headers.get("set-cookie") || "").split(";")[0];
      headers["x-csrf-token"] = (await csrf.json() as any).csrfToken;
    }
    if (user) headers.authorization = `Bearer ${signAccessToken({ id: String(user._id), name: user.name, email: user.email, role: "student" })}`;
    const res = await fetch(`${base}${path}`, { headers, method: method || (body ? "POST" : "GET"), body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json() as any, cacheControl: res.headers.get("cache-control"), vary: res.headers.get("vary") };
  };
  const createUser = async (name: string, subscription: any = {}, enrolled = [courseId]) => {
    const user = await UserModel.create({ name, email: `${prefix}-${name}@example.invalid`, passwordHash: await bcrypt.hash("fixture-access-password", 4), role: "student", emailVerified: true, enrolledCourses: enrolled, subscription });
    users.push(user); return user;
  };
  const grant = async (user: any, overrides: any = {}) => AccessGrantModel.create({ id: `${prefix}-${user.name}`, userId: String(user._id), sourceType: "access_code", sourceId: `${prefix}-${user.name}`, idempotencyKey: `${prefix}-${user.name}`, courseIds: [courseId], contentTypes: ["courses"], ...overrides });
  try {
    await PathModel.create({ _id: pathId, name: "Fixture" });
    const course = await CourseModel.create({ _id: courseId, id: courseId, title: "Protected course", instructor: "Fixture", price: 99, isPublished: true, showOnPlatform: true, approvalStatus: "approved", certificateEnabled: true, modules: [{ title: "Module", lessons: [{ id: "preview", accessControl: "public", videoUrl: preview }, { id: "locked", accessControl: "enrolled", videoUrl: secret, quizId: `${prefix}-quiz` }] }] });
    const legacy = await createUser("legacy", { purchasedCourses: [courseId] });
    const expired = await createUser("expired", { purchasedCourses: [courseId] });
    const revoked = await createUser("revoked", { purchasedCourses: [courseId] });
    const active = await createUser("active", { purchasedCourses: [courseId] });
    const premiumExpired = await createUser("premium-expired", { plan: "premium", expiresAt: new Date(Date.now() - 1000) }, []);
    const premiumActive = await createUser("premium-active", { plan: "premium", expiresAt: new Date(Date.now() + 60000) }, []);
    await grant(expired, { expiresAt: Date.now() - 1000 });
    await grant(revoked, { status: "revoked" });
    await grant(active, { expiresAt: Date.now() + 60000 });
    await check("expiry equality denies subscription and grant without a scheduler", async () => {
      assert.equal(hasActivePremium({ subscription: { plan: "premium", expiresAt: new Date(10000) } }, 10000), false);
      assert.equal(isActiveGrant({ status: "active", expiresAt: 10000 }, 10000), false);
      assert.equal(hasActivePremium({ subscription: { plan: "premium" } }, 10000), true);
    });
    await check("all grant provenance rejects expired package and accepts independent permanent ownership", async () => {
      const effective = getEffectivePurchaseIds({ enrolledCourses: ["old", "same"], subscription: { purchasedCourses: ["old", "same"], purchasedPackages: ["finite-package", "legacy-package"] } }, [
        { courseIds: ["same"], status: "expired", expiresAt: 1 },
        { courseIds: ["same"], status: "active", expiresAt: null, sourceType: "payment_request" },
        { packageId: "finite-package", status: "revoked" },
      ], 10000);
      assert.deepEqual(effective.purchasedPackages, ["legacy-package"]);
      assert.deepEqual(effective.purchasedCourses, ["old", "same"]);
    });
    await check("profile removes expired mirrors without changing stored history", async () => {
      const result = await request("/auth/me", expired);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body.user.enrolledCourses, []);
      assert.deepEqual(result.body.user.subscription.purchasedCourses, []);
      const stored = await UserModel.findById(expired._id).lean();
      assert.deepEqual(stored?.enrolledCourses, [courseId]);
      assert.deepEqual(stored?.subscription?.purchasedCourses, [courseId]);
    });
    await check("profile reports expired premium as free and preserves original date", async () => {
      const result = await request("/auth/me", premiumExpired);
      assert.equal(result.status, 200);
      assert.equal(result.body.user.subscription.plan, "free");
      assert.ok(premiumExpired.subscription?.expiresAt);
      assert.equal(result.body.user.subscription.expiresAt, premiumExpired.subscription.expiresAt.toISOString());
      assert.equal((await UserModel.findById(premiumExpired._id).lean())?.subscription?.plan, "premium");
    });
    await check("login reports expired mirror as unavailable", async () => {
      const result = await request("/auth/login", undefined, { email: expired.email, password: "fixture-access-password" });
      assert.equal(result.status, 200);
      assert.deepEqual(result.body.user.enrolledCourses, []);
    });
    await check("profile update cannot reintroduce revoked mirror", async () => {
      const result = await request("/auth/me/profile", revoked, { name: "Updated fixture" }, "PATCH");
      assert.equal(result.status, 200);
      assert.deepEqual(result.body.user.enrolledCourses, []);
      assert.deepEqual((await UserModel.findById(revoked._id).lean())?.enrolledCourses, [courseId]);
    });
    await check("profile preserves legacy permanent purchase", async () => {
      const result = await request("/auth/me", legacy);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body.user.enrolledCourses, [courseId]);
      assert.deepEqual(result.body.user.subscription.purchasedCourses, [courseId]);
    });
    for (const [name, user, allowed] of [["guest", undefined, false], ["legacy", legacy, true], ["expired mirror", expired, false], ["revoked mirror", revoked, false], ["active grant", active, true], ["expired premium", premiumExpired, false], ["active premium", premiumActive, true]] as const) {
      await check(`course ${name}`, async () => {
        const result = await request(`/courses/${courseId}`, user);
        assert.equal(result.status, 200);
        const payload = result.body.course || result.body;
        assert.equal(payload.modules[0].lessons[1].videoUrl === secret, allowed);
        assert.equal(payload.modules[0].lessons[0].videoUrl, preview);
      });
    }
    for (const [name, user, allowed] of [["legacy", legacy, true], ["expired", expired, false], ["revoked", revoked, false]] as const) {
      await check(`discussion ${name}`, async () => assert.equal((await request(`/discussions/course/${courseId}`, user)).status, allowed ? 200 : 403));
    }
    const quiz = { id: `${prefix}-quiz`, isPublished: true, approvalStatus: "approved", access: { type: "course_only" } };
    await check("direct purchase opens attached quiz", async () => assert.equal(await canSubmitQuiz(quiz, legacy.toObject(), "course"), true));
    await check("direct purchase cannot open unrelated quiz", async () => assert.equal(await canSubmitQuiz({ ...quiz, id: `${prefix}-unrelated` }, legacy.toObject(), "course"), false));
    await check("expired mirror cannot open attached quiz", async () => assert.equal(await canSubmitQuiz(quiz, expired.toObject(), "course"), false));
    await check("expired premium cannot open paid quiz", async () => assert.equal(await canSubmitQuiz({ ...quiz, access: { type: "paid" } }, premiumExpired.toObject()), false));
    await LessonModel.create({ id: `${prefix}-lesson`, title: "Protected", type: "video", pathId, subjectId: "fixture", approvalStatus: "approved", isLocked: true, content: "PRIVATE", videoUrl: secret, fileUrl: secret });
    await LessonModel.create({ id: `${prefix}-preview`, title: "Preview", type: "video", pathId, subjectId: "fixture", approvalStatus: "approved", isLocked: false, videoUrl: preview });
    await LibraryItemModel.create({ id: `${prefix}-library`, title: "Protected", pathId, subjectId: "fixture", approvalStatus: "approved", isLocked: true, url: secret });
    const contentActive = await createUser("content-active", {}, []);
    const contentExpired = await createUser("content-expired", {}, []);
    const contentRevoked = await createUser("content-revoked", {}, []);
    const contentUnrelated = await createUser("content-unrelated", {}, []);
    await grant(contentActive, { courseIds: [courseId], contentTypes: ["courses", "foundation", "library"], pathIds: [pathId] });
    await grant(contentExpired, { courseIds: [], contentTypes: ["foundation", "library"], pathIds: [pathId], expiresAt: Date.now() - 1000 });
    await grant(contentRevoked, { courseIds: [], contentTypes: ["foundation", "library"], pathIds: [pathId], status: "revoked" });
    await grant(contentUnrelated, { courseIds: [], contentTypes: ["foundation", "library"], pathIds: ["other"] });
    clearContentBootstrapCache();
    for (const [name, user, allowed] of [["guest first", undefined, false], ["entitled after guest", contentActive, true], ["guest after entitled", undefined, false], ["expired premium", premiumExpired, false], ["expired grant", contentExpired, false], ["revoked grant", contentRevoked, false], ["unrelated scope", contentUnrelated, false]] as const) {
      await check(`bootstrap ${name}`, async () => {
        const result = await request(`/content/bootstrap?scope=learning&phase=full&pathId=${pathId}`, user);
        assert.equal(result.status, 200);
        assert.equal(result.body.lessons.find((l: any) => l.id === `${prefix}-lesson`).videoUrl === secret, allowed);
        assert.equal(result.body.libraryItems[0].url === secret, allowed);
        assert.equal(result.body.lessons.find((l: any) => l.id === `${prefix}-preview`).videoUrl, preview);
        if (!allowed) assert.equal(JSON.stringify(result.body).includes("PRIVATE"), false);
        if (user) assert.equal(result.cacheControl, "private, no-store");
        assert.ok(result.vary?.includes("Cookie"));
      });
    }
    const lessons = Array.from({ length: 200 }, (_, i) => ({ id: `${prefix}-cert-${i}` }));
    await CourseModel.updateOne({ _id: courseId }, { $set: { modules: [{ title: "Module", lessons }] } });
    await UserModel.updateOne({ _id: legacy._id }, { $set: { completedLessons: lessons.slice(0, 199).map(l => l.id) } });
    await check("199 of 200 cannot issue certificate", async () => {
      assert.equal((await request("/certificates/generate", legacy, { courseId })).status, 400);
      assert.equal(await CertificateModel.countDocuments({ courseId }), 0);
    });
    await UserModel.updateOne({ _id: legacy._id }, { $set: { completedLessons: lessons.map(l => l.id) } });
    await check("200 of 200 issues certificate", async () => assert.equal((await request("/certificates/generate", legacy, { courseId })).status, 201));
    await check("revoked mirror cannot issue certificate", async () => {
      await UserModel.updateOne({ _id: revoked._id }, { $set: { completedLessons: lessons.map(l => l.id) } });
      assert.equal((await request("/certificates/generate", revoked, { courseId })).status, 403);
    });
    await CourseModel.updateOne({ _id: courseId }, { $set: { price: 0, modules: [{ title: "Module", lessons: [{ id: "free-locked", accessControl: "enrolled", videoUrl: secret }] }] } });
    await check("free enrollment remains after finite grant expiry", async () => {
      const result = await request(`/courses/${courseId}`, expired);
      assert.equal(result.status, 200);
      assert.equal((result.body.course || result.body).modules[0].lessons[0].videoUrl, secret);
      assert.deepEqual((await request("/auth/me", expired)).body.user.enrolledCourses, [courseId]);
    });
    console.log(`Access protection: ${passed} PASS / ${failures.length} FAIL`);
    assert.equal(failures.length, 0, failures.join(", "));
  } finally {
    // Delete only this run's fixtures; never drop a database.
    await Promise.all([UserModel.deleteMany({ _id: { $in: users.map(u => u._id) } }), CourseModel.deleteMany({ _id: courseId }), AccessGrantModel.deleteMany({ id: { $regex: `^${prefix}-` } }), LessonModel.deleteMany({ id: { $regex: `^${prefix}-` } }), LibraryItemModel.deleteMany({ id: { $regex: `^${prefix}-` } }), PathModel.deleteMany({ _id: pathId }), CertificateModel.deleteMany({ courseId })]);
    await new Promise<void>(resolve => server.close(() => resolve()));
    await mongoose.disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
