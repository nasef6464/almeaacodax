import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { env } from "../../server/src/config/env.js";
import { UserModel } from "../../server/src/models/User.js";

const requireFromServer = createRequire(new URL("../../server/package.json", import.meta.url));
const bcrypt = requireFromServer("bcryptjs") as {
  hash(value: string, rounds: number): Promise<string>;
};
const mongoose = requireFromServer("mongoose") as {
  connect(uri: string): Promise<unknown>;
  disconnect(): Promise<void>;
  connection: { readyState: number };
};

const API_BASE = `http://127.0.0.1:${env.PORT}/api`;
const RUN_MARKER = `${Date.now().toString(36)}-${randomBytes(5).toString("hex")}`;
const courseId = `course-sale-price-${RUN_MARKER}`;
const adminEmail = `sale-price-admin-${RUN_MARKER}@example.invalid`;
const studentEmail = `sale-price-student-${RUN_MARKER}@example.invalid`;
const adminPassword = randomBytes(24).toString("base64url");
const studentPassword = randomBytes(24).toString("base64url");

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
    try { body = JSON.parse(text); } catch { body = text; }
  }
  return { status: response.status, body };
}

async function getCsrf(): Promise<CsrfContext> {
  const response = await fetch(`${API_BASE}/auth/csrf-token`, { signal: AbortSignal.timeout(15_000) });
  assert.equal(response.status, 200, "CSRF endpoint failed");
  const body = await response.json() as any;
  const cookie = (response.headers.get("set-cookie") || "").split(";")[0] || "";
  assert.ok(body?.csrfToken && cookie.startsWith("almeaa_csrf_token="), "CSRF context missing");
  return { token: String(body.csrfToken), cookie };
}

async function login(email: string, password: string, csrf: CsrfContext) {
  const result = await jsonRequest("/auth/login", {
    method: "POST",
    csrf,
    body: { email, password },
  });
  assert.equal(result.status, 200, `login failed: ${JSON.stringify(result.body)}`);
  assert.equal(typeof result.body?.token, "string", "login token missing");
  return String(result.body.token);
}

async function main() {
  assert.equal(env.NODE_ENV, "test", "Sale-price gate requires NODE_ENV=test");
  assert.ok(
    env.MONGODB_URI.startsWith("mongodb://127.0.0.1:27017/almeaa_platform_v3_ci_") ||
      env.MONGODB_URI.startsWith("mongodb://localhost:27017/almeaa_platform_v3_ci_"),
    "Sale-price gate requires isolated localhost CI Mongo",
  );

  await mongoose.connect(env.MONGODB_URI);
  try {
    await UserModel.create([
      {
        name: `admin-${RUN_MARKER}`,
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: "admin",
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: Date.now(),
        enrolledCourses: [],
        completedLessons: [],
        subscription: { plan: "free", purchasedCourses: [], purchasedPackages: [] },
      },
      {
        name: `student-${RUN_MARKER}`,
        email: studentEmail,
        passwordHash: await bcrypt.hash(studentPassword, 10),
        role: "student",
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: Date.now(),
        enrolledCourses: [],
        completedLessons: [],
        subscription: { plan: "free", purchasedCourses: [], purchasedPackages: [] },
      },
    ]);

    const csrf = await getCsrf();
    const adminToken = await login(adminEmail, adminPassword, csrf);
    const studentToken = await login(studentEmail, studentPassword, csrf);

    const course = await jsonRequest("/courses", {
      method: "POST",
      token: adminToken,
      csrf,
      body: {
        id: courseId,
        title: "Sale Price Integrity Course",
        instructor: "ALMEAA CI",
        price: 120,
        originalPrice: 200,
        currency: "SAR",
        duration: 1,
        level: "Beginner",
        category: "integration",
        subject: "integration-subject",
        features: ["sale-price-integrity"],
        modules: [],
        isPublished: true,
        showOnPlatform: true,
      },
    });
    assert.equal(course.status, 201, `course create failed: ${JSON.stringify(course.body)}`);
    assert.equal(Number(course.body?.price), 120, "course sale price changed unexpectedly");
    assert.equal(Number(course.body?.originalPrice), 200, "course comparison price missing");

    const payment = await jsonRequest("/payments/requests", {
      method: "POST",
      token: studentToken,
      csrf,
      body: {
        itemType: "course",
        itemId: courseId,
        paymentMethod: "transfer",
        transferReference: `BANK-${RUN_MARKER}`,
      },
    });
    assert.equal(payment.status, 201, `payment request failed: ${JSON.stringify(payment.body)}`);
    assert.equal(Number(payment.body?.request?.originalAmount), 120, "comparison/originalPrice overrode canonical sale price");
    assert.equal(Number(payment.body?.request?.amount), 120, "buyer was not charged canonical sale price");
    assert.equal(payment.body?.request?.currency, "SAR", "course currency was not preserved");

    console.log("Course sale-price payment integrity PASS");
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

main().catch(async (error) => {
  console.error("Course sale-price payment integrity FAIL:", error instanceof Error ? error.stack || error.message : String(error));
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
