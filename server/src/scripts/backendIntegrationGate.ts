import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { UserModel } from "../models/User.js";
import { CourseModel } from "../models/Course.js";
import { CertificateModel } from "../models/Certificate.js";

type Role = "student" | "teacher" | "supervisor" | "parent" | "admin";

type JsonResult = {
  status: number;
  body: any;
};

type CsrfContext = {
  token: string;
  cookie: string;
};

const API_BASE = `http://127.0.0.1:${env.PORT}/api`;
const RUN_MARKER = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
const COURSE_ID = `platform-v3-integration-course-${RUN_MARKER}`;
const LESSON_IDS = [`platform-v3-integration-lesson-a-${RUN_MARKER}`, `platform-v3-integration-lesson-b-${RUN_MARKER}`];

const credentials = new Map<Role, { email: string; password: string }>();
const tokens = new Map<Role, string>();

function pass(label: string) {
  console.log(`PASS ${label}`);
}

function expectStatus(label: string, result: JsonResult, expected: number) {
  assert.equal(result.status, expected, `${label}: expected HTTP ${expected}, got ${result.status}`);
  pass(`${label} -> ${expected}`);
}

async function jsonRequest(
  path: string,
  options: {
    method?: string;
    token?: string;
    csrf?: CsrfContext;
    body?: unknown;
  } = {},
): Promise<JsonResult> {
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }
  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
  }
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

  let body: any = null;
  const text = await response.text();
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
  const response = await fetch(`${API_BASE}/auth/csrf-token`, {
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(response.status, 200, `csrf-token: expected HTTP 200, got ${response.status}`);

  const body = (await response.json()) as any;
  assert.equal(typeof body?.csrfToken, "string", "csrf-token: response token missing");

  const setCookie = response.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";")[0] || "";
  assert.ok(cookie.startsWith("almeaa_csrf_token="), "csrf-token: CSRF cookie missing");

  pass("CSRF token and cookie issued");
  return { token: body.csrfToken, cookie };
}

async function seedIsolatedUsers() {
  const roles: Role[] = ["student", "teacher", "supervisor", "parent", "admin"];
  const userIds = new Map<Role, string>();

  for (const role of roles) {
    const password = randomBytes(24).toString("base64url");
    const email = `platform-v3-${role}-${RUN_MARKER}@example.invalid`;
    credentials.set(role, { email, password });

    const user = await UserModel.create({
      name: `Platform V3 ${role}`,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: Date.now(),
      linkedStudentIds: [],
      enrolledCourses: [],
      completedLessons: [],
    });
    userIds.set(role, String(user._id));
  }

  const studentId = userIds.get("student");
  const parentId = userIds.get("parent");
  assert.ok(studentId && parentId, "isolated user ids were not created");
  await UserModel.updateOne({ _id: parentId }, { $set: { linkedStudentIds: [studentId] } });

  await CourseModel.create({
    _id: COURSE_ID,
    title: "Platform V3 Integration Course",
    instructor: "CI",
    isPublished: true,
    showOnPlatform: true,
    certificateEnabled: true,
    modules: [
      {
        id: `platform-v3-integration-module-${RUN_MARKER}`,
        title: "Integration module",
        order: 1,
        lessons: LESSON_IDS.map((id, index) => ({
          id,
          title: `Integration lesson ${index + 1}`,
          order: index + 1,
        })),
      },
    ],
  });

  pass("isolated users and certifiable course seeded");
}

async function loginRole(role: Role, csrf: CsrfContext) {
  const credential = credentials.get(role);
  assert.ok(credential, `${role}: credentials missing in test memory`);

  const result = await jsonRequest("/auth/login", {
    method: "POST",
    csrf,
    body: credential,
  });
  expectStatus(`${role} login`, result, 200);
  assert.equal(result.body?.user?.role, role, `${role}: login returned wrong role`);
  assert.equal(typeof result.body?.token, "string", `${role}: test-mode bearer token missing`);
  tokens.set(role, result.body.token);
}

async function main() {
  assert.equal(env.NODE_ENV, "test", "Backend integration gate requires NODE_ENV=test");
  assert.ok(
    env.MONGODB_URI.startsWith("mongodb://127.0.0.1:27017/almeaa_platform_v3_ci_") ||
      env.MONGODB_URI.startsWith("mongodb://localhost:27017/almeaa_platform_v3_ci_"),
    "Backend integration gate requires a dedicated localhost CI Mongo database",
  );
  assert.ok(API_BASE.startsWith("http://127.0.0.1:") || API_BASE.startsWith("http://localhost:"), "Backend integration gate must target a local API");
  assert.equal(env.AI_PROVIDER, "none", "Backend integration gate must disable external AI providers");

  await mongoose.connect(env.MONGODB_URI);

  try {
    await seedIsolatedUsers();

    const live = await jsonRequest("/health/live");
    expectStatus("health live", live, 200);

    const ready = await jsonRequest("/health/ready");
    expectStatus("health ready", ready, 200);
    assert.equal(ready.body?.ready, true, "health ready did not confirm Mongo connectivity");

    const csrf = await getCsrf();

    const noCsrfLogin = await jsonRequest("/auth/login", {
      method: "POST",
      body: credentials.get("student"),
    });
    expectStatus("login without CSRF is rejected", noCsrfLogin, 403);
    assert.equal(noCsrfLogin.body?.code, "CSRF_TOKEN_INVALID", "login without CSRF returned unexpected error code");

    for (const role of ["student", "teacher", "supervisor", "parent", "admin"] as Role[]) {
      await loginRole(role, csrf);
    }

    const anonymousMine = await jsonRequest("/certificates/mine");
    expectStatus("anonymous certificate list is rejected", anonymousMine, 401);

    const anonymousStudyPlan = await jsonRequest("/ai/study-plan", {
      method: "POST",
      csrf,
      body: { weaknesses: ["algebra"] },
    });
    expectStatus("anonymous study plan is rejected", anonymousStudyPlan, 401);

    const studentAdminUsers = await jsonRequest("/auth/admin/users?limit=10", {
      token: tokens.get("student"),
    });
    expectStatus("student cannot list admin users", studentAdminUsers, 403);

    const teacherAdminUsers = await jsonRequest("/auth/admin/users?limit=10", {
      token: tokens.get("teacher"),
    });
    expectStatus("teacher reaches scoped admin-users handler", teacherAdminUsers, 200);

    const studentQuestion = await jsonRequest("/ai/question", {
      method: "POST",
      token: tokens.get("student"),
      csrf,
      body: { topic: "الجبر" },
    });
    expectStatus("student cannot generate staff AI question", studentQuestion, 403);

    const parentQuestion = await jsonRequest("/ai/question", {
      method: "POST",
      token: tokens.get("parent"),
      csrf,
      body: { topic: "الجبر" },
    });
    expectStatus("parent cannot generate staff AI question", parentQuestion, 403);

    for (const role of ["teacher", "supervisor", "admin"] as Role[]) {
      const result = await jsonRequest("/ai/question", {
        method: "POST",
        token: tokens.get(role),
        csrf,
        body: { topic: "الجبر" },
      });
      expectStatus(`${role} can reach staff AI question handler`, result, 200);
      assert.equal(typeof result.body?.question, "string", `${role}: AI fallback payload missing question`);
    }

    const teacherCertificate = await jsonRequest("/certificates/generate", {
      method: "POST",
      token: tokens.get("teacher"),
      csrf,
      body: { courseId: COURSE_ID },
    });
    expectStatus("teacher cannot issue student certificate", teacherCertificate, 403);

    const studentNoEntitlement = await jsonRequest("/certificates/generate", {
      method: "POST",
      token: tokens.get("student"),
      csrf,
      body: { courseId: COURSE_ID },
    });
    expectStatus("student certificate requires entitlement", studentNoEntitlement, 403);

    const studentCredential = credentials.get("student");
    assert.ok(studentCredential, "student credential missing");
    const student = await UserModel.findOne({ email: studentCredential.email });
    assert.ok(student, "student missing from isolated database");

    student.enrolledCourses = [COURSE_ID];
    await student.save();

    const incompleteCertificate = await jsonRequest("/certificates/generate", {
      method: "POST",
      token: tokens.get("student"),
      csrf,
      body: { courseId: COURSE_ID },
    });
    expectStatus("student certificate requires full completion", incompleteCertificate, 400);
    assert.equal(incompleteCertificate.body?.completionPercentage, 0, "incomplete certificate returned unexpected percentage");

    student.completedLessons = LESSON_IDS;
    await student.save();

    const issuedCertificate = await jsonRequest("/certificates/generate", {
      method: "POST",
      token: tokens.get("student"),
      csrf,
      body: { courseId: COURSE_ID },
    });
    expectStatus("eligible completed student receives isolated certificate", issuedCertificate, 201);
    assert.equal(issuedCertificate.body?.completionPercentage, 100, "issued certificate is not 100% complete");
    assert.equal(typeof issuedCertificate.body?.verificationCode, "string", "issued certificate verification code missing");

    const repeatedCertificate = await jsonRequest("/certificates/generate", {
      method: "POST",
      token: tokens.get("student"),
      csrf,
      body: { courseId: COURSE_ID },
    });
    expectStatus("certificate generation is idempotent", repeatedCertificate, 200);
    assert.equal(
      repeatedCertificate.body?.verificationCode,
      issuedCertificate.body?.verificationCode,
      "idempotent certificate returned a different verification code",
    );

    const mine = await jsonRequest("/certificates/mine", {
      token: tokens.get("student"),
    });
    expectStatus("student can list own certificate", mine, 200);
    assert.equal(Array.isArray(mine.body?.certificates), true, "certificate list shape is invalid");
    assert.equal(mine.body.certificates.length, 1, "student certificate list should contain exactly one isolated certificate");

    const invalidCertificate = await jsonRequest(`/certificates/platform-v3-invalid-${RUN_MARKER}`);
    expectStatus("invalid public certificate fails safely", invalidCertificate, 404);

    const certificateCount = await CertificateModel.countDocuments({ courseId: COURSE_ID });
    assert.equal(certificateCount, 1, "isolated certificate idempotency failed at database level");

    console.log("Backend integration gate PASS");
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

main().catch(async (error) => {
  console.error("Backend integration gate FAIL:", error instanceof Error ? error.message : String(error));
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect().catch(() => undefined);
  }
  process.exit(1);
});
