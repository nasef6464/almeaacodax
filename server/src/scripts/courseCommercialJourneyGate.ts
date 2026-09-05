import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { CourseModel } from "../models/Course.js";
import { UserModel } from "../models/User.js";

const API_BASE = `http://127.0.0.1:${env.PORT}/api`;
const RUN_MARKER = `${Date.now().toString(36)}-${randomBytes(5).toString("hex")}`;

const ADMIN_EMAIL = `course-admin-${RUN_MARKER}@example.invalid`;
const TEACHER_EMAIL = `course-teacher-${RUN_MARKER}@example.invalid`;
const STUDENT_EMAIL = `course-student-${RUN_MARKER}@example.invalid`;
const PACKAGE_STUDENT_EMAIL = `course-package-student-${RUN_MARKER}@example.invalid`;

const FREE_COURSE_ID = `course-free-${RUN_MARKER}`;
const PAID_COURSE_ID = `course-paid-${RUN_MARKER}`;
const PACKAGE_ID = `course-package-${RUN_MARKER}`;
const TEACHER_DRAFT_ID = `course-teacher-draft-${RUN_MARKER}`;

const FREE_LESSON_ID = `free-lesson-${RUN_MARKER}`;
const PAID_PREVIEW_LESSON_ID = `paid-preview-${RUN_MARKER}`;
const PAID_LOCKED_LESSON_ID = `paid-locked-${RUN_MARKER}`;
const PAID_LOCKED_VIDEO = `https://private.example.invalid/${RUN_MARKER}/video.mp4`;
const PAID_LOCKED_FILE = `https://private.example.invalid/${RUN_MARKER}/worksheet.pdf`;
const PAID_LOCKED_RECORDING = `https://private.example.invalid/${RUN_MARKER}/recording.mp4`;
const PAID_COURSE_FILE = `https://private.example.invalid/${RUN_MARKER}/course-file.pdf`;
const PAID_PREVIEW_VIDEO = `https://preview.example.invalid/${RUN_MARKER}/preview.mp4`;

const passwords = {
  admin: randomBytes(24).toString("base64url"),
  teacher: randomBytes(24).toString("base64url"),
  student: randomBytes(24).toString("base64url"),
  packageStudent: randomBytes(24).toString("base64url"),
};

const tokens = new Map<string, string>();

type CsrfContext = { token: string; cookie: string };
type JsonResult = { status: number; body: any };

const pass = (label: string) => console.log(`PASS ${label}`);

const expectStatus = (label: string, result: JsonResult, expected: number) => {
  assert.equal(result.status, expected, `${label}: expected ${expected}, got ${result.status}\n${JSON.stringify(result.body)}`);
  pass(`${label} -> ${expected}`);
};

async function getCsrf(): Promise<CsrfContext> {
  const response = await fetch(`${API_BASE}/auth/csrf-token`, { signal: AbortSignal.timeout(15_000) });
  assert.equal(response.status, 200, "CSRF endpoint failed");
  const body = await response.json() as any;
  const setCookie = response.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";")[0] || "";
  assert.ok(body?.csrfToken && cookie.startsWith("almeaa_csrf_token="), "CSRF context missing");
  return { token: String(body.csrfToken), cookie };
}

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
    try { body = JSON.parse(text); } catch { body = text; }
  }
  return { status: response.status, body };
}

async function createUser(email: string, password: string, role: "admin" | "teacher" | "student") {
  return UserModel.create({
    name: `${role}-${RUN_MARKER}`,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role,
    isActive: true,
    emailVerified: true,
    emailVerifiedAt: Date.now(),
    enrolledCourses: [],
    completedLessons: [],
    subscription: {
      plan: "free",
      purchasedCourses: [],
      purchasedPackages: [],
    },
  });
}

async function login(label: string, email: string, password: string, csrf: CsrfContext) {
  const result = await jsonRequest("/auth/login", {
    method: "POST",
    csrf,
    body: { email, password },
  });
  expectStatus(`${label} login`, result, 200);
  assert.equal(typeof result.body?.token, "string", `${label} token missing`);
  tokens.set(label, result.body.token);
}

const baseCourse = (id: string, title: string, price: number) => ({
  id,
  title,
  thumbnail: "https://preview.example.invalid/course-cover.jpg",
  instructor: "ALMEAA CI",
  price,
  currency: "SAR",
  duration: 2,
  level: "Beginner",
  rating: 0,
  progress: 0,
  category: "integration",
  subject: "integration-subject",
  pathId: "integration-path",
  subjectId: "integration-subject",
  features: ["journey proof"],
  description: `${title} description`,
  isPublished: true,
  showOnPlatform: true,
  modules: [],
});

async function main() {
  assert.equal(env.NODE_ENV, "test", "Course commercial journey requires NODE_ENV=test");
  assert.ok(
    env.MONGODB_URI.startsWith("mongodb://127.0.0.1:27017/almeaa_platform_v3_ci_") ||
      env.MONGODB_URI.startsWith("mongodb://localhost:27017/almeaa_platform_v3_ci_"),
    "Course commercial journey requires isolated localhost CI Mongo",
  );

  await mongoose.connect(env.MONGODB_URI);
  try {
    await Promise.all([
      createUser(ADMIN_EMAIL, passwords.admin, "admin"),
      createUser(TEACHER_EMAIL, passwords.teacher, "teacher"),
      createUser(STUDENT_EMAIL, passwords.student, "student"),
      createUser(PACKAGE_STUDENT_EMAIL, passwords.packageStudent, "student"),
    ]);

    const csrf = await getCsrf();
    await login("admin", ADMIN_EMAIL, passwords.admin, csrf);
    await login("teacher", TEACHER_EMAIL, passwords.teacher, csrf);
    await login("student", STUDENT_EMAIL, passwords.student, csrf);
    await login("packageStudent", PACKAGE_STUDENT_EMAIL, passwords.packageStudent, csrf);

    const teacherDraft = await jsonRequest("/courses", {
      method: "POST",
      token: tokens.get("teacher"),
      csrf,
      body: {
        ...baseCourse(TEACHER_DRAFT_ID, "Teacher Draft Course", 90),
        isPublished: true,
      },
    });
    expectStatus("teacher creates course", teacherDraft, 201);
    assert.equal(teacherDraft.body?.approvalStatus, "pending_review", "teacher course did not enter review");
    assert.equal(teacherDraft.body?.isPublished, false, "teacher bypassed publication review");
    pass("teacher authoring remains review-gated");

    const freeCourse = await jsonRequest("/courses", {
      method: "POST",
      token: tokens.get("admin"),
      csrf,
      body: {
        ...baseCourse(FREE_COURSE_ID, "Free Journey Course", 0),
        modules: [{
          id: `free-module-${RUN_MARKER}`,
          title: "Free module",
          order: 1,
          lessons: [{
            id: FREE_LESSON_ID,
            title: "Free lesson",
            type: "video",
            duration: "10 دقيقة",
            isCompleted: false,
            order: 1,
            skillIds: [],
            accessControl: "public",
            videoUrl: `https://preview.example.invalid/${RUN_MARKER}/free.mp4`,
          }],
        }],
      },
    });
    expectStatus("admin publishes free course", freeCourse, 201);

    const paidCourse = await jsonRequest("/courses", {
      method: "POST",
      token: tokens.get("admin"),
      csrf,
      body: {
        ...baseCourse(PAID_COURSE_ID, "Paid Journey Course", 120),
        certificateEnabled: true,
        files: [
          { id: `file-preview-${RUN_MARKER}`, title: "Preview file", type: "pdf", url: `https://preview.example.invalid/${RUN_MARKER}/sample.pdf`, size: "1 MB", access: "free_preview" },
          { id: `file-paid-${RUN_MARKER}`, title: "Paid file", type: "pdf", url: PAID_COURSE_FILE, size: "2 MB", access: "enrolled_paid" },
        ],
        modules: [{
          id: `paid-module-${RUN_MARKER}`,
          title: "Paid module",
          order: 1,
          lessons: [
            {
              id: PAID_PREVIEW_LESSON_ID,
              title: "Preview lesson",
              type: "video",
              duration: "5 دقيقة",
              isCompleted: false,
              order: 1,
              skillIds: [],
              accessControl: "public",
              videoUrl: PAID_PREVIEW_VIDEO,
              content: "Public preview content",
            },
            {
              id: PAID_LOCKED_LESSON_ID,
              title: "Paid lesson",
              type: "video",
              duration: "20 دقيقة",
              isCompleted: false,
              order: 2,
              skillIds: [],
              accessControl: "enrolled",
              videoUrl: PAID_LOCKED_VIDEO,
              content: "PRIVATE LESSON CONTENT",
              fileUrl: PAID_LOCKED_FILE,
              meetingUrl: `https://private.example.invalid/${RUN_MARKER}/meeting`,
              recordingUrl: PAID_LOCKED_RECORDING,
              joinInstructions: "PRIVATE JOIN INSTRUCTIONS",
              interactiveQuestions: [{
                id: `iq-${RUN_MARKER}`,
                timestamp: 12,
                inlineQuestion: { text: "2+2?", options: ["3", "4"], correctOptionIndex: 1 },
                mustPass: true,
                actionOnFail: "rewatch",
              }],
            },
          ],
        }],
      },
    });
    expectStatus("admin publishes paid course", paidCourse, 201);

    const packageCourse = await jsonRequest("/courses", {
      method: "POST",
      token: tokens.get("admin"),
      csrf,
      body: {
        ...baseCourse(PACKAGE_ID, "Course Package", 180),
        isPackage: true,
        packageType: "courses",
        packageContentTypes: ["courses"],
        includedCourses: [PAID_COURSE_ID],
      },
    });
    expectStatus("admin publishes course package", packageCourse, 201);

    const anonymousLearning = await jsonRequest("/courses?kind=learning&limit=50");
    expectStatus("anonymous reads learning catalog", anonymousLearning, 200);
    const learningItems = Array.isArray(anonymousLearning.body?.courses) ? anonymousLearning.body.courses : [];
    assert.ok(learningItems.some((item: any) => item.id === FREE_COURSE_ID), "free course missing from catalog");
    assert.ok(learningItems.some((item: any) => item.id === PAID_COURSE_ID), "paid course missing from catalog");
    assert.ok(!learningItems.some((item: any) => item.id === PACKAGE_ID), "package leaked into learning catalog");
    assert.ok(!learningItems.some((item: any) => item.id === TEACHER_DRAFT_ID), "teacher draft leaked into public catalog");
    const paidCatalogItem = learningItems.find((item: any) => item.id === PAID_COURSE_ID);
    const paidCatalogLessons = paidCatalogItem?.modules?.[0]?.lessons || [];
    const catalogPreview = paidCatalogLessons.find((lesson: any) => lesson.id === PAID_PREVIEW_LESSON_ID);
    const catalogLocked = paidCatalogLessons.find((lesson: any) => lesson.id === PAID_LOCKED_LESSON_ID);
    assert.equal(catalogPreview?.videoUrl, PAID_PREVIEW_VIDEO, "public preview video was unexpectedly redacted");
    assert.equal(catalogLocked?.isLocked, true, "paid catalog lesson was not marked locked");
    assert.equal(catalogLocked?.videoUrl, undefined, "paid video leaked through catalog");
    assert.equal(catalogLocked?.interactiveQuestions, undefined, "interactive answers leaked through catalog");
    assert.equal(paidCatalogItem?.files?.find((file: any) => file.id.includes("file-paid"))?.url, "", "paid file URL leaked through catalog");
    pass("public catalog exposes metadata/previews but not paid lesson payload");

    const anonymousPaidDetail = await jsonRequest(`/courses/${PAID_COURSE_ID}`);
    expectStatus("anonymous reads paid course overview", anonymousPaidDetail, 200);
    const anonymousLocked = anonymousPaidDetail.body?.modules?.[0]?.lessons?.find((lesson: any) => lesson.id === PAID_LOCKED_LESSON_ID);
    assert.equal(anonymousLocked?.videoUrl, undefined, "paid detail leaked video before entitlement");
    assert.equal(anonymousLocked?.content, undefined, "paid detail leaked content before entitlement");
    assert.equal(anonymousLocked?.recordingUrl, undefined, "paid detail leaked recording before entitlement");

    const studentPaidBefore = await jsonRequest(`/courses/${PAID_COURSE_ID}`, { token: tokens.get("student") });
    expectStatus("student reads paid overview before purchase", studentPaidBefore, 200);
    assert.equal(studentPaidBefore.body?.modules?.[0]?.lessons?.[1]?.videoUrl, undefined, "student received paid video before purchase");

    const paidDirectEnroll = await jsonRequest(`/courses/${PAID_COURSE_ID}/enroll`, {
      method: "POST",
      token: tokens.get("student"),
      csrf,
      body: {},
    });
    expectStatus("student cannot bypass paid purchase", paidDirectEnroll, 403);
    assert.equal(paidDirectEnroll.body?.code, "COURSE_PURCHASE_REQUIRED", "paid enroll returned wrong guard code");

    const freeEnroll = await jsonRequest(`/courses/${FREE_COURSE_ID}/enroll`, {
      method: "POST",
      token: tokens.get("student"),
      csrf,
      body: {},
    });
    expectStatus("student enrolls free course", freeEnroll, 200);
    assert.equal(freeEnroll.body?.alreadyEnrolled, false, "first free enrollment was not new");

    const freeEnrollAgain = await jsonRequest(`/courses/${FREE_COURSE_ID}/enroll`, {
      method: "POST",
      token: tokens.get("student"),
      csrf,
      body: {},
    });
    expectStatus("free enrollment is idempotent", freeEnrollAgain, 200);
    assert.equal(freeEnrollAgain.body?.alreadyEnrolled, true, "repeat free enrollment was not idempotent");
    const freeCourseDoc = await CourseModel.findById(FREE_COURSE_ID).lean();
    assert.equal(Number(freeCourseDoc?.studentCount || 0), 1, "free enrollment inflated studentCount");

    const noEvidencePayment = await jsonRequest("/payments/requests", {
      method: "POST",
      token: tokens.get("student"),
      csrf,
      body: {
        itemType: "course",
        itemId: PAID_COURSE_ID,
        paymentMethod: "transfer",
      },
    });
    expectStatus("payment request requires evidence", noEvidencePayment, 400);

    const paymentRequest = await jsonRequest("/payments/requests", {
      method: "POST",
      token: tokens.get("student"),
      csrf,
      body: {
        itemType: "course",
        itemId: PAID_COURSE_ID,
        itemName: "tampered title",
        amount: 1,
        currency: "USD",
        paymentMethod: "transfer",
        transferReference: `BANK-${RUN_MARKER}`,
        paymentProviderCode: "tampered-provider",
      },
    });
    expectStatus("student creates server-priced payment request", paymentRequest, 201);
    const paymentRequestId = String(paymentRequest.body?.request?.id || paymentRequest.body?.request?._id || "");
    assert.ok(paymentRequestId, "payment request id missing");
    assert.equal(Number(paymentRequest.body?.request?.amount), 120, "client amount overrode trusted course price");
    assert.equal(paymentRequest.body?.request?.itemName, "Paid Journey Course", "client item name overrode server item title");
    assert.equal(paymentRequest.body?.request?.currency, "SAR", "client currency overrode trusted course currency");

    const studentBeforeApproval = await UserModel.findOne({ email: STUDENT_EMAIL }).lean();
    assert.equal((studentBeforeApproval as any)?.subscription?.plan, "free", "pending purchase upgraded subscription");
    assert.ok(!(studentBeforeApproval as any)?.subscription?.purchasedCourses?.includes(PAID_COURSE_ID), "pending purchase unlocked paid course");

    const approvePayment = await jsonRequest(`/payments/requests/${encodeURIComponent(paymentRequestId)}/review`, {
      method: "PATCH",
      token: tokens.get("admin"),
      csrf,
      body: {
        status: "approved",
        approvalEvidence: `CI-PROOF-${RUN_MARKER}`,
      },
    });
    expectStatus("admin approves paid course purchase", approvePayment, 200);

    const studentAfterApproval = await UserModel.findOne({ email: STUDENT_EMAIL }).lean();
    assert.equal((studentAfterApproval as any)?.subscription?.plan, "free", "single course purchase incorrectly promoted global premium plan");
    assert.ok((studentAfterApproval as any)?.subscription?.purchasedCourses?.includes(PAID_COURSE_ID), "approved course not mirrored to purchasedCourses");
    assert.ok((studentAfterApproval as any)?.enrolledCourses?.includes(PAID_COURSE_ID), "approved course not mirrored to enrolledCourses");
    pass("direct course purchase remains scoped and does not grant global premium");

    const studentPaidAfter = await jsonRequest(`/courses/${PAID_COURSE_ID}`, { token: tokens.get("student") });
    expectStatus("entitled student receives paid course", studentPaidAfter, 200);
    const paidLessonAfter = studentPaidAfter.body?.modules?.[0]?.lessons?.find((lesson: any) => lesson.id === PAID_LOCKED_LESSON_ID);
    assert.equal(paidLessonAfter?.videoUrl, PAID_LOCKED_VIDEO, "entitled student did not receive paid video");
    assert.equal(paidLessonAfter?.content, "PRIVATE LESSON CONTENT", "entitled student did not receive paid content");
    assert.equal(paidLessonAfter?.interactiveQuestions?.[0]?.inlineQuestion?.correctOptionIndex, 1, "entitled interactive question payload missing");
    assert.equal(studentPaidAfter.body?.files?.find((file: any) => file.id.includes("file-paid"))?.url, PAID_COURSE_FILE, "entitled paid file URL missing");

    const paidEnrollAfterPurchase = await jsonRequest(`/courses/${PAID_COURSE_ID}/enroll`, {
      method: "POST",
      token: tokens.get("student"),
      csrf,
      body: {},
    });
    expectStatus("approved buyer enroll endpoint is idempotent", paidEnrollAfterPurchase, 200);
    assert.equal(paidEnrollAfterPurchase.body?.alreadyEnrolled, true, "approved buyer was not recognized as enrolled");

    const packageRequest = await jsonRequest("/payments/requests", {
      method: "POST",
      token: tokens.get("packageStudent"),
      csrf,
      body: {
        itemType: "package",
        itemId: PACKAGE_ID,
        paymentMethod: "transfer",
        transferReference: `PACKAGE-BANK-${RUN_MARKER}`,
      },
    });
    expectStatus("student creates package payment request", packageRequest, 201);
    assert.equal(Number(packageRequest.body?.request?.amount), 180, "package price was not server authoritative");
    const packageRequestId = String(packageRequest.body?.request?.id || packageRequest.body?.request?._id || "");

    const approvePackage = await jsonRequest(`/payments/requests/${encodeURIComponent(packageRequestId)}/review`, {
      method: "PATCH",
      token: tokens.get("admin"),
      csrf,
      body: {
        status: "approved",
        approvalEvidence: `CI-PACKAGE-PROOF-${RUN_MARKER}`,
      },
    });
    expectStatus("admin approves package purchase", approvePackage, 200);

    const packageStudent = await UserModel.findOne({ email: PACKAGE_STUDENT_EMAIL }).lean();
    assert.equal((packageStudent as any)?.subscription?.plan, "free", "package purchase incorrectly promoted global premium plan");
    assert.ok((packageStudent as any)?.subscription?.purchasedPackages?.includes(PACKAGE_ID), "package id missing from purchasedPackages");
    assert.ok((packageStudent as any)?.subscription?.purchasedCourses?.includes(PAID_COURSE_ID), "included course missing from purchasedCourses");
    assert.ok((packageStudent as any)?.enrolledCourses?.includes(PAID_COURSE_ID), "included course missing from enrolledCourses");

    const packageStudentPaid = await jsonRequest(`/courses/${PAID_COURSE_ID}`, { token: tokens.get("packageStudent") });
    expectStatus("package buyer receives included course payload", packageStudentPaid, 200);
    assert.equal(packageStudentPaid.body?.modules?.[0]?.lessons?.[1]?.videoUrl, PAID_LOCKED_VIDEO, "package entitlement did not expose included course");

    const packageCatalog = await jsonRequest("/courses?kind=package&limit=50");
    expectStatus("anonymous reads package marketplace", packageCatalog, 200);
    assert.ok((packageCatalog.body?.courses || []).some((item: any) => item.id === PACKAGE_ID), "package missing from package marketplace");

    const adminPaidDetail = await jsonRequest(`/courses/${PAID_COURSE_ID}`, { token: tokens.get("admin") });
    expectStatus("admin receives full course authoring payload", adminPaidDetail, 200);
    assert.equal(adminPaidDetail.body?.modules?.[0]?.lessons?.[1]?.videoUrl, PAID_LOCKED_VIDEO, "staff course payload was unexpectedly redacted");

    console.log("Course commercial journey PASS");
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

main().catch(async (error) => {
  console.error("Course commercial journey FAIL:", error instanceof Error ? error.stack || error.message : String(error));
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect().catch(() => undefined);
  }
  process.exit(1);
});
