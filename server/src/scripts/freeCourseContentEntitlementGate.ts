import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { CourseModel } from "../models/Course.js";
import { UserModel } from "../models/User.js";

const API_BASE = `http://127.0.0.1:${env.PORT}/api`;
const marker = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
const courseId = `free-entitlement-${marker}`;
const publicLessonId = `free-preview-${marker}`;
const enrolledLessonId = `free-enrolled-${marker}`;
const studentEmail = `free-entitlement-student-${marker}@example.invalid`;
const studentPassword = randomBytes(24).toString("base64url");
const privateVideo = `https://private.example.invalid/${marker}/video.mp4`;
const privateFile = `https://private.example.invalid/${marker}/worksheet.pdf`;
const previewVideo = `https://preview.example.invalid/${marker}/preview.mp4`;

type CsrfContext = { token: string; cookie: string };
type JsonResult = { status: number; body: any };

async function jsonRequest(
  path: string,
  options: { method?: string; token?: string; csrf?: CsrfContext; body?: unknown } = {},
): Promise<JsonResult> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.csrf) {
    headers.cookie = options.csrf.cookie;
    headers["x-csrf-token"] = options.csrf.token;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: response.status, body };
}

async function getCsrf(): Promise<CsrfContext> {
  const response = await fetch(`${API_BASE}/auth/csrf-token`, { signal: AbortSignal.timeout(15_000) });
  assert.equal(response.status, 200, "CSRF endpoint failed");
  const body = (await response.json()) as any;
  const cookie = (response.headers.get("set-cookie") || "").split(";")[0] || "";
  assert.ok(body?.csrfToken && cookie.startsWith("almeaa_csrf_token="), "CSRF context missing");
  return { token: String(body.csrfToken), cookie };
}

const findLesson = (body: any, id: string) =>
  (body?.modules?.[0]?.lessons || []).find((lesson: any) => lesson?.id === id);

async function main() {
  assert.equal(env.NODE_ENV, "test", "Free course entitlement gate requires NODE_ENV=test");
  assert.ok(
    env.MONGODB_URI.startsWith("mongodb://127.0.0.1:27017/almeaa_platform_v3_ci_") ||
      env.MONGODB_URI.startsWith("mongodb://localhost:27017/almeaa_platform_v3_ci_"),
    "Free course entitlement gate requires isolated localhost CI Mongo",
  );

  await mongoose.connect(env.MONGODB_URI);
  try {
    const student = await UserModel.create({
      name: `free-entitlement-student-${marker}`,
      email: studentEmail,
      passwordHash: await bcrypt.hash(studentPassword, 10),
      role: "student",
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: Date.now(),
      enrolledCourses: [],
      completedLessons: [],
      subscription: { plan: "free", purchasedCourses: [], purchasedPackages: [] },
    });

    await CourseModel.create({
      _id: courseId,
      id: courseId,
      title: "Free Entitlement Journey",
      instructor: "ALMEAA CI",
      thumbnail: "https://preview.example.invalid/course-cover.jpg",
      price: 0,
      currency: "SAR",
      duration: 1,
      level: "Beginner",
      rating: 0,
      progress: 0,
      category: "integration",
      subject: "integration-subject",
      features: [],
      description: "Free course with enrolled-only content",
      isPublished: true,
      showOnPlatform: true,
      approvalStatus: "approved",
      ownerType: "platform",
      ownerId: "ci",
      createdBy: "ci",
      files: [
        {
          id: `preview-file-${marker}`,
          title: "Preview file",
          type: "pdf",
          url: `https://preview.example.invalid/${marker}/sample.pdf`,
          size: "1 MB",
          access: "free_preview",
        },
        {
          id: `enrolled-file-${marker}`,
          title: "Enrolled file",
          type: "pdf",
          url: privateFile,
          size: "2 MB",
          access: "enrolled_paid",
        },
      ],
      modules: [
        {
          id: `module-${marker}`,
          title: "Free module",
          order: 1,
          lessons: [
            {
              id: publicLessonId,
              title: "Public preview",
              type: "video",
              order: 1,
              duration: "3 دقيقة",
              accessControl: "public",
              videoUrl: previewVideo,
              content: "PUBLIC PREVIEW",
              isCompleted: false,
              skillIds: [],
            },
            {
              id: enrolledLessonId,
              title: "Enrolled lesson",
              type: "video",
              order: 2,
              duration: "12 دقيقة",
              accessControl: "enrolled",
              videoUrl: privateVideo,
              content: "ENROLLED ONLY CONTENT",
              fileUrl: privateFile,
              interactiveQuestions: [
                {
                  id: `iq-${marker}`,
                  timestamp: 5,
                  inlineQuestion: { text: "Ready?", options: ["Yes", "No"], correctOptionIndex: 0 },
                  mustPass: false,
                  actionOnFail: "continue",
                },
              ],
              isCompleted: false,
              skillIds: [],
            },
          ],
        },
      ],
    });

    const anonymous = await jsonRequest(`/courses/${courseId}`);
    assert.equal(anonymous.status, 200, "anonymous free course detail failed");
    assert.equal(findLesson(anonymous.body, publicLessonId)?.videoUrl, previewVideo, "public preview was redacted");
    const anonymousRestricted = findLesson(anonymous.body, enrolledLessonId);
    assert.equal(anonymousRestricted?.isLocked, true, "enrolled-only free lesson was not locked for anonymous viewer");
    assert.equal(anonymousRestricted?.videoUrl, undefined, "enrolled-only video leaked to anonymous viewer");
    assert.equal(anonymousRestricted?.content, undefined, "enrolled-only content leaked to anonymous viewer");
    assert.equal(anonymousRestricted?.interactiveQuestions, undefined, "enrolled-only answers leaked to anonymous viewer");
    assert.equal(
      anonymous.body?.files?.find((file: any) => file.id === `enrolled-file-${marker}`)?.url,
      "",
      "enrolled-only file leaked to anonymous viewer",
    );

    const csrf = await getCsrf();
    const login = await jsonRequest("/auth/login", {
      method: "POST",
      csrf,
      body: { email: studentEmail, password: studentPassword },
    });
    assert.equal(login.status, 200, `student login failed: ${JSON.stringify(login.body)}`);
    const token = String(login.body?.token || "");
    assert.ok(token, "student token missing");

    const beforeEnroll = await jsonRequest(`/courses/${courseId}`, { token });
    assert.equal(beforeEnroll.status, 200, "student free course detail before enrollment failed");
    assert.equal(findLesson(beforeEnroll.body, enrolledLessonId)?.videoUrl, undefined, "student received enrolled-only video before enrollment");

    const enroll = await jsonRequest(`/courses/${courseId}/enroll`, {
      method: "POST",
      token,
      csrf,
      body: {},
    });
    assert.equal(enroll.status, 200, `free enrollment failed: ${JSON.stringify(enroll.body)}`);
    assert.equal(enroll.body?.alreadyEnrolled, false, "first enrollment was not new");

    const persistedStudent = await UserModel.findById(student._id).lean();
    assert.ok((persistedStudent as any)?.enrolledCourses?.includes(courseId), "free enrollment missing from enrolledCourses");
    assert.ok(
      !(persistedStudent as any)?.subscription?.purchasedCourses?.includes(courseId),
      "free enrollment incorrectly created purchase ownership",
    );

    const afterEnroll = await jsonRequest(`/courses/${courseId}`, { token });
    assert.equal(afterEnroll.status, 200, "student free course detail after enrollment failed");
    const enrolledLesson = findLesson(afterEnroll.body, enrolledLessonId);
    assert.equal(enrolledLesson?.videoUrl, privateVideo, "enrolled student did not receive enrolled-only video");
    assert.equal(enrolledLesson?.content, "ENROLLED ONLY CONTENT", "enrolled student did not receive enrolled-only content");
    assert.equal(enrolledLesson?.interactiveQuestions?.[0]?.inlineQuestion?.correctOptionIndex, 0, "enrolled interactive payload missing");
    assert.equal(
      afterEnroll.body?.files?.find((file: any) => file.id === `enrolled-file-${marker}`)?.url,
      privateFile,
      "enrolled student did not receive enrolled-only file",
    );

    const enrollAgain = await jsonRequest(`/courses/${courseId}/enroll`, {
      method: "POST",
      token,
      csrf,
      body: {},
    });
    assert.equal(enrollAgain.status, 200, "repeat free enrollment failed");
    assert.equal(enrollAgain.body?.alreadyEnrolled, true, "repeat free enrollment was not idempotent");

    console.log("Free course content entitlement journey PASS");
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

main().catch(async (error) => {
  console.error("Free course content entitlement journey FAIL:", error instanceof Error ? error.stack || error.message : String(error));
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
