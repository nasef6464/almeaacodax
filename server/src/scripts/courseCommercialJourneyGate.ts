import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { CourseModel } from "../models/Course.js";
import { UserModel } from "../models/User.js";

const API_BASE = `http://127.0.0.1:${env.PORT}/api`;
const RUN_MARKER = `${Date.now().toString(36)}-${randomBytes(5).toString("hex")}`;
const ids = {
  freeCourse: `course-free-${RUN_MARKER}`,
  paidCourse: `course-paid-${RUN_MARKER}`,
  package: `course-package-${RUN_MARKER}`,
  teacherDraft: `course-teacher-draft-${RUN_MARKER}`,
  freeLesson: `free-lesson-${RUN_MARKER}`,
  paidPreviewLesson: `paid-preview-${RUN_MARKER}`,
  paidLockedLesson: `paid-locked-${RUN_MARKER}`,
};
const emails = {
  admin: `course-admin-${RUN_MARKER}@example.invalid`,
  teacher: `course-teacher-${RUN_MARKER}@example.invalid`,
  student: `course-student-${RUN_MARKER}@example.invalid`,
  packageStudent: `course-package-student-${RUN_MARKER}@example.invalid`,
};
const passwords = Object.fromEntries(
  Object.keys(emails).map((key) => [key, randomBytes(24).toString("base64url")]),
) as Record<keyof typeof emails, string>;
const paidUrls = {
  video: `https://private.example.invalid/${RUN_MARKER}/video.mp4`,
  file: `https://private.example.invalid/${RUN_MARKER}/worksheet.pdf`,
  recording: `https://private.example.invalid/${RUN_MARKER}/recording.mp4`,
  courseFile: `https://private.example.invalid/${RUN_MARKER}/course-file.pdf`,
  previewVideo: `https://preview.example.invalid/${RUN_MARKER}/preview.mp4`,
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
  const cookie = (response.headers.get("set-cookie") || "").split(";")[0] || "";
  assert.ok(body?.csrfToken && cookie.startsWith("almeaa_csrf_token="), "CSRF context missing");
  return { token: String(body.csrfToken), cookie };
}

async function jsonRequest(path: string, options: { method?: string; token?: string; csrf?: CsrfContext; body?: unknown } = {}): Promise<JsonResult> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.csrf) { headers.cookie = options.csrf.cookie; headers["x-csrf-token"] = options.csrf.token; }
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET", headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let body: any = null;
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { status: response.status, body };
}

async function createUser(email: string, password: string, role: "admin" | "teacher" | "student") {
  return UserModel.create({
    name: `${role}-${RUN_MARKER}`, email, passwordHash: await bcrypt.hash(password, 10), role,
    isActive: true, emailVerified: true, emailVerifiedAt: Date.now(), enrolledCourses: [], completedLessons: [],
    subscription: { plan: "free", purchasedCourses: [], purchasedPackages: [] },
  });
}
async function login(label: string, email: string, password: string, csrf: CsrfContext) {
  const result = await jsonRequest("/auth/login", { method: "POST", csrf, body: { email, password } });
  expectStatus(`${label} login`, result, 200);
  assert.equal(typeof result.body?.token, "string", `${label} token missing`);
  tokens.set(label, result.body.token);
}
const baseCourse = (id: string, title: string, price: number) => ({
  id, title, thumbnail: "https://preview.example.invalid/course-cover.jpg", instructor: "ALMEAA CI",
  price, currency: "SAR", duration: 2, level: "Beginner", rating: 0, progress: 0,
  category: "integration", subject: "integration-subject", pathId: "", subjectId: "",
  features: ["journey proof"], description: `${title} description`, isPublished: true, showOnPlatform: true, modules: [],
});

async function main() {
  assert.equal(env.NODE_ENV, "test", "Course commercial journey requires NODE_ENV=test");
  assert.ok(
    env.MONGODB_URI.startsWith("mongodb://127.0.0.1:27017/almeaa_platform_v3_ci_") || env.MONGODB_URI.startsWith("mongodb://localhost:27017/almeaa_platform_v3_ci_"),
    "Course commercial journey requires isolated localhost CI Mongo",
  );
  await mongoose.connect(env.MONGODB_URI);
  try {
    await Promise.all([
      createUser(emails.admin, passwords.admin, "admin"), createUser(emails.teacher, passwords.teacher, "teacher"),
      createUser(emails.student, passwords.student, "student"), createUser(emails.packageStudent, passwords.packageStudent, "student"),
    ]);
    const csrf = await getCsrf();
    await login("admin", emails.admin, passwords.admin, csrf);
    await login("teacher", emails.teacher, passwords.teacher, csrf);
    await login("student", emails.student, passwords.student, csrf);
    await login("packageStudent", emails.packageStudent, passwords.packageStudent, csrf);

    const teacherDraft = await jsonRequest("/courses", { method: "POST", token: tokens.get("teacher"), csrf, body: { ...baseCourse(ids.teacherDraft, "Teacher Draft Course", 90), isPublished: true } });
    expectStatus("teacher creates course", teacherDraft, 201);
    assert.equal(teacherDraft.body?.approvalStatus, "pending_review", "teacher course did not enter review");
    assert.equal(teacherDraft.body?.isPublished, false, "teacher bypassed publication review");
    pass("teacher authoring remains review-gated");

    const freeCourse = await jsonRequest("/courses", { method: "POST", token: tokens.get("admin"), csrf, body: {
      ...baseCourse(ids.freeCourse, "Free Journey Course", 0),
      modules: [{ id: `free-module-${RUN_MARKER}`, title: "Free module", order: 1, lessons: [{
        id: ids.freeLesson, title: "Free lesson", type: "video", duration: "10 دقيقة", isCompleted: false,
        order: 1, skillIds: [], accessControl: "public", videoUrl: `https://preview.example.invalid/${RUN_MARKER}/free.mp4`,
      }] }],
    } });
    expectStatus("admin publishes free course", freeCourse, 201);

    const paidCourse = await jsonRequest("/courses", { method: "POST", token: tokens.get("admin"), csrf, body: {
      ...baseCourse(ids.paidCourse, "Paid Journey Course", 120), certificateEnabled: true,
      files: [
        { id: `file-preview-${RUN_MARKER}`, title: "Preview file", type: "pdf", url: `https://preview.example.invalid/${RUN_MARKER}/sample.pdf`, size: "1 MB", access: "free_preview" },
        { id: `file-paid-${RUN_MARKER}`, title: "Paid file", type: "pdf", url: paidUrls.courseFile, size: "2 MB", access: "enrolled_paid" },
      ],
      modules: [{ id: `paid-module-${RUN_MARKER}`, title: "Paid module", order: 1, lessons: [
        { id: ids.paidPreviewLesson, title: "Preview lesson", type: "video", duration: "5 دقيقة", isCompleted: false, order: 1, skillIds: [], accessControl: "public", videoUrl: paidUrls.previewVideo, content: "Public preview content" },
        { id: ids.paidLockedLesson, title: "Paid lesson", type: "video", duration: "20 دقيقة", isCompleted: false, order: 2, skillIds: [], accessControl: "enrolled", videoUrl: paidUrls.video, content: "PRIVATE LESSON CONTENT", fileUrl: paidUrls.file, meetingUrl: `https://private.example.invalid/${RUN_MARKER}/meeting`, recordingUrl: paidUrls.recording, joinInstructions: "PRIVATE JOIN INSTRUCTIONS", interactiveQuestions: [{ id: `iq-${RUN_MARKER}`, timestamp: 12, inlineQuestion: { text: "2+2?", options: ["3", "4"], correctOptionIndex: 1 }, mustPass: true, actionOnFail: "rewatch" }] },
      ] }],
    } });
    expectStatus("admin publishes paid course", paidCourse, 201);

    const packageCourse = await jsonRequest("/courses", { method: "POST", token: tokens.get("admin"), csrf, body: {
      ...baseCourse(ids.package, "Course Package", 180), isPackage: true, packageType: "courses", packageContentTypes: ["courses"], includedCourses: [ids.paidCourse],
    } });
    expectStatus("admin publishes course package", packageCourse, 201);

    const anonymousLearning = await jsonRequest("/courses?kind=learning&limit=50");
    expectStatus("anonymous reads learning catalog", anonymousLearning, 200);
    const learningItems = Array.isArray(anonymousLearning.body?.courses) ? anonymousLearning.body.courses : [];
    assert.ok(learningItems.some((item: any) => item.id === ids.freeCourse), "free course missing from catalog");
    assert.ok(learningItems.some((item: any) => item.id === ids.paidCourse), "paid course missing from catalog");
    assert.ok(!learningItems.some((item: any) => item.id === ids.package), "package leaked into learning catalog");
    assert.ok(!learningItems.some((item: any) => item.id === ids.teacherDraft), "teacher draft leaked into public catalog");
    const paidCatalogItem = learningItems.find((item: any) => item.id === ids.paidCourse);
    const paidCatalogLessons = paidCatalogItem?.modules?.[0]?.lessons || [];
    const catalogPreview = paidCatalogLessons.find((lesson: any) => lesson.id === ids.paidPreviewLesson);
    const catalogLocked = paidCatalogLessons.find((lesson: any) => lesson.id === ids.paidLockedLesson);
    assert.equal(catalogPreview?.videoUrl, paidUrls.previewVideo, "public preview video was unexpectedly redacted");
    assert.equal(catalogLocked?.isLocked, true, "paid catalog lesson was not marked locked");
    assert.equal(catalogLocked?.videoUrl, undefined, "paid video leaked through catalog");
    assert.equal(catalogLocked?.interactiveQuestions, undefined, "interactive answers leaked through catalog");
    assert.equal(paidCatalogItem?.files?.find((file: any) => file.id.includes("file-paid"))?.url, "", "paid file URL leaked through catalog");
    pass("public catalog exposes metadata/previews but not paid lesson payload");

    const anonymousPaidDetail = await jsonRequest(`/courses/${ids.paidCourse}`);
    expectStatus("anonymous reads paid course overview", anonymousPaidDetail, 200);
    const anonymousLocked = anonymousPaidDetail.body?.modules?.[0]?.lessons?.find((lesson: any) => lesson.id === ids.paidLockedLesson);
    assert.equal(anonymousLocked?.videoUrl, undefined, "paid detail leaked video before entitlement");
    assert.equal(anonymousLocked?.content, undefined, "paid detail leaked content before entitlement");
    assert.equal(anonymousLocked?.recordingUrl, undefined, "paid detail leaked recording before entitlement");
    const studentPaidBefore = await jsonRequest(`/courses/${ids.paidCourse}`, { token: tokens.get("student") });
    expectStatus("student reads paid overview before purchase", studentPaidBefore, 200);
    assert.equal(studentPaidBefore.body?.modules?.[0]?.lessons?.[1]?.videoUrl, undefined, "student received paid video before purchase");

    const paidDirectEnroll = await jsonRequest(`/courses/${ids.paidCourse}/enroll`, { method: "POST", token: tokens.get("student"), csrf, body: {} });
    expectStatus("student cannot bypass paid purchase", paidDirectEnroll, 403);
    assert.equal(paidDirectEnroll.body?.code, "COURSE_PURCHASE_REQUIRED", "paid enroll returned wrong guard code");
    const freeEnroll = await jsonRequest(`/courses/${ids.freeCourse}/enroll`, { method: "POST", token: tokens.get("student"), csrf, body: {} });
    expectStatus("student enrolls free course", freeEnroll, 200);
    assert.equal(freeEnroll.body?.alreadyEnrolled, false, "first free enrollment was not new");
    const freeEnrollAgain = await jsonRequest(`/courses/${ids.freeCourse}/enroll`, { method: "POST", token: tokens.get("student"), csrf, body: {} });
    expectStatus("free enrollment is idempotent", freeEnrollAgain, 200);
    assert.equal(freeEnrollAgain.body?.alreadyEnrolled, true, "repeat free enrollment was not idempotent");
    const freeCourseDoc = await CourseModel.findById(ids.freeCourse).lean();
    assert.equal(Number(freeCourseDoc?.studentCount || 0), 1, "free enrollment inflated studentCount");

    const noEvidencePayment = await jsonRequest("/payments/requests", { method: "POST", token: tokens.get("student"), csrf, body: { itemType: "course", itemId: ids.paidCourse, paymentMethod: "transfer" } });
    expectStatus("payment request requires evidence", noEvidencePayment, 400);
    const paymentRequest = await jsonRequest("/payments/requests", { method: "POST", token: tokens.get("student"), csrf, body: {
      itemType: "course", itemId: ids.paidCourse, itemName: "tampered title", amount: 1, currency: "USD", paymentMethod: "transfer", transferReference: `BANK-${RUN_MARKER}`, paymentProviderCode: "tampered-provider",
    } });
    expectStatus("student creates server-priced payment request", paymentRequest, 201);
    const paymentRequestId = String(paymentRequest.body?.request?.id || paymentRequest.body?.request?._id || "");
    assert.ok(paymentRequestId, "payment request id missing");
    assert.equal(Number(paymentRequest.body?.request?.amount), 120, "client amount overrode trusted course price");
    assert.equal(paymentRequest.body?.request?.itemName, "Paid Journey Course", "client item name overrode server item title");
    assert.equal(paymentRequest.body?.request?.currency, "SAR", "client currency overrode trusted course currency");
    const studentBeforeApproval = await UserModel.findOne({ email: emails.student }).lean();
    assert.equal((studentBeforeApproval as any)?.subscription?.plan, "free", "pending purchase upgraded subscription");
    assert.ok(!(studentBeforeApproval as any)?.subscription?.purchasedCourses?.includes(ids.paidCourse), "pending purchase unlocked paid course");

    const approvePayment = await jsonRequest(`/payments/requests/${encodeURIComponent(paymentRequestId)}/review`, { method: "PATCH", token: tokens.get("admin"), csrf, body: { status: "approved", approvalEvidence: `CI-PROOF-${RUN_MARKER}` } });
    expectStatus("admin approves paid course purchase", approvePayment, 200);
    const studentAfterApproval = await UserModel.findOne({ email: emails.student }).lean();
    assert.equal((studentAfterApproval as any)?.subscription?.plan, "free", "single course purchase incorrectly promoted global premium plan");
    assert.ok((studentAfterApproval as any)?.subscription?.purchasedCourses?.includes(ids.paidCourse), "approved course not mirrored to purchasedCourses");
    assert.ok((studentAfterApproval as any)?.enrolledCourses?.includes(ids.paidCourse), "approved course not mirrored to enrolledCourses");
    pass("direct course purchase remains scoped and does not grant global premium");

    const studentPaidAfter = await jsonRequest(`/courses/${ids.paidCourse}`, { token: tokens.get("student") });
    expectStatus("entitled student receives paid course", studentPaidAfter, 200);
    const paidLessonAfter = studentPaidAfter.body?.modules?.[0]?.lessons?.find((lesson: any) => lesson.id === ids.paidLockedLesson);
    assert.equal(paidLessonAfter?.videoUrl, paidUrls.video, "entitled student did not receive paid video");
    assert.equal(paidLessonAfter?.content, "PRIVATE LESSON CONTENT", "entitled student did not receive paid content");
    assert.equal(paidLessonAfter?.interactiveQuestions?.[0]?.inlineQuestion?.correctOptionIndex, 1, "entitled interactive question payload missing");
    assert.equal(studentPaidAfter.body?.files?.find((file: any) => file.id.includes("file-paid"))?.url, paidUrls.courseFile, "entitled paid file URL missing");
    const paidEnrollAfterPurchase = await jsonRequest(`/courses/${ids.paidCourse}/enroll`, { method: "POST", token: tokens.get("student"), csrf, body: {} });
    expectStatus("approved buyer enroll endpoint is idempotent", paidEnrollAfterPurchase, 200);
    assert.equal(paidEnrollAfterPurchase.body?.alreadyEnrolled, true, "approved buyer was not recognized as enrolled");

    const packageRequest = await jsonRequest("/payments/requests", { method: "POST", token: tokens.get("packageStudent"), csrf, body: { itemType: "package", itemId: ids.package, paymentMethod: "transfer", transferReference: `PACKAGE-BANK-${RUN_MARKER}` } });
    expectStatus("student creates package payment request", packageRequest, 201);
    assert.equal(Number(packageRequest.body?.request?.amount), 180, "package price was not server authoritative");
    const packageRequestId = String(packageRequest.body?.request?.id || packageRequest.body?.request?._id || "");
    const approvePackage = await jsonRequest(`/payments/requests/${encodeURIComponent(packageRequestId)}/review`, { method: "PATCH", token: tokens.get("admin"), csrf, body: { status: "approved", approvalEvidence: `CI-PACKAGE-PROOF-${RUN_MARKER}` } });
    expectStatus("admin approves package purchase", approvePackage, 200);
    const packageStudent = await UserModel.findOne({ email: emails.packageStudent }).lean();
    assert.equal((packageStudent as any)?.subscription?.plan, "free", "package purchase incorrectly promoted global premium plan");
    assert.ok((packageStudent as any)?.subscription?.purchasedPackages?.includes(ids.package), "package id missing from purchasedPackages");
    assert.ok((packageStudent as any)?.subscription?.purchasedCourses?.includes(ids.paidCourse), "included course missing from purchasedCourses");
    assert.ok((packageStudent as any)?.enrolledCourses?.includes(ids.paidCourse), "included course missing from enrolledCourses");
    const packageStudentPaid = await jsonRequest(`/courses/${ids.paidCourse}`, { token: tokens.get("packageStudent") });
    expectStatus("package buyer receives included course payload", packageStudentPaid, 200);
    assert.equal(packageStudentPaid.body?.modules?.[0]?.lessons?.[1]?.videoUrl, paidUrls.video, "package entitlement did not expose included course");
    const packageCatalog = await jsonRequest("/courses?kind=package&limit=50");
    expectStatus("anonymous reads package marketplace", packageCatalog, 200);
    assert.ok((packageCatalog.body?.courses || []).some((item: any) => item.id === ids.package), "package missing from package marketplace");
    const adminPaidDetail = await jsonRequest(`/courses/${ids.paidCourse}`, { token: tokens.get("admin") });
    expectStatus("admin receives full course authoring payload", adminPaidDetail, 200);
    assert.equal(adminPaidDetail.body?.modules?.[0]?.lessons?.[1]?.videoUrl, paidUrls.video, "staff course payload was unexpectedly redacted");
    console.log("Course commercial journey PASS");
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}
main().catch(async (error) => {
  console.error("Course commercial journey FAIL:", error instanceof Error ? error.stack || error.message : String(error));
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
