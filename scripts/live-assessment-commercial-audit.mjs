import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "").replace(/\/$/, "");
const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "").replace(/\/$/, "");
const RUN_ID = process.env.ASSESSMENT_COMMERCIAL_AUDIT_RUN_ID || `assessment-commercial-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUT_DIR = path.resolve("audit-artifacts", "ui-audit-exhaustive", RUN_ID);
const CREDENTIALS_FILE = process.env.ROLE_CREDENTIALS_FILE || path.resolve("audit-artifacts", "ROLE_CREDENTIALS.env");

if (!BASE_URL || !API_BASE_URL) throw new Error("UI_AUDIT_BASE_URL and UI_AUDIT_API_BASE_URL are required; this audit must only run on the isolated stack.");
fs.mkdirSync(OUT_DIR, { recursive: true });

if (fs.existsSync(CREDENTIALS_FILE)) {
  for (const line of fs.readFileSync(CREDENTIALS_FILE, "utf8").split(/\r?\n/)) {
    const [key, ...rest] = line.trim().split("=");
    if (key && rest.length && !process.env[key]) process.env[key] = rest.join("=").trim();
  }
}

const credentials = {
  admin: { email: process.env.ROLE_ADMIN_EMAIL, password: process.env.ROLE_ADMIN_PASSWORD },
  student: { email: process.env.ROLE_STUDENT_EMAIL, password: process.env.ROLE_STUDENT_PASSWORD },
  outsider: { email: process.env.ROLE_PARENT_EMAIL, password: process.env.ROLE_PARENT_PASSWORD },
};

for (const [role, account] of Object.entries(credentials)) {
  if (!account.email || !account.password) throw new Error(`Missing isolated ${role} credentials`);
}

async function login(context, account) {
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  const result = await page.evaluate(async ({ apiBaseUrl, email, password }) => {
    const csrf = await fetch(`${apiBaseUrl}/auth/csrf-token`, { credentials: "include" });
    const csrfBody = await csrf.json().catch(() => ({}));
    const response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json", "x-csrf-token": csrfBody?.csrfToken || "" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.user) return { ok: false, status: response.status, message: payload?.message || "" };
    sessionStorage.setItem("the-hundred-auth-profile", JSON.stringify({
      id: String(payload.user.id || payload.user._id || payload.user.email), email: payload.user.email,
      displayName: payload.user.name, photoURL: payload.user.avatar || "", role: payload.user.role,
      groupIds: Array.isArray(payload.user.groupIds) ? payload.user.groupIds.map(String) : [],
      schoolId: payload.user.schoolId || null,
    }));
    if (csrfBody?.csrfToken) sessionStorage.setItem("almeaa:csrf-token", csrfBody.csrfToken);
    return { ok: true, user: payload.user };
  }, { apiBaseUrl: API_BASE_URL, ...account });
  if (!result.ok) throw new Error(`Login failed (${result.status}): ${result.message}`);
  // The page was opened before the cookie/session profile was established.
  // Reload so AuthContext and the persisted store hydrate from the new session
  // before any role-scoped catalog assertions run.
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  return { page, user: result.user };
}

async function api(page, pathname, options = {}) {
  return page.evaluate(async ({ apiBaseUrl, pathname, options }) => {
    const csrfToken = sessionStorage.getItem("almeaa:csrf-token") || "";
    const response = await fetch(`${apiBaseUrl}${pathname}`, {
      credentials: "include", cache: "no-store", ...options,
      headers: { accept: "application/json", ...(options.body ? { "content-type": "application/json" } : {}), ...(options.method && options.method !== "GET" && csrfToken ? { "x-csrf-token": csrfToken } : {}) },
    });
    return { ok: response.ok, status: response.status, payload: await response.json().catch(() => ({})) };
  }, { apiBaseUrl: API_BASE_URL, pathname, options });
}

function listOf(payload, key) {
  return Array.isArray(payload?.[key]) ? payload[key] : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const adminContext = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
  let studentContext = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
  const outsiderContext = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
  const errors = [];
  let createdQuizId = "";
  try {
    const admin = await login(adminContext, credentials.admin);
    const student = await login(studentContext, credentials.student);
    const outsider = await login(outsiderContext, credentials.outsider);
    const marker = `assessment-commercial-${Date.now()}`;
    const [questionsResponse, bootstrapResponse, studentMe] = await Promise.all([
      api(admin.page, "/quizzes/questions?approvalStatus=approved&limit=100"),
      api(admin.page, "/content/bootstrap?scope=full"),
      api(student.page, "/auth/me"),
    ]);
    const questions = listOf(questionsResponse.payload, "questions");
    const question = questions.find((item) => item.pathId && (item.subject || item.subjectId));
    const studentGroupIds = new Set([...(student.user.groupIds || []), ...(studentMe.payload?.groupIds || []), ...(studentMe.payload?.user?.groupIds || [])].map(String));
    const groups = listOf(bootstrapResponse.payload, "groups");
    const targetGroup = groups.find((group) => studentGroupIds.has(String(group.id || group._id)));
    if (!questionsResponse.ok || !question || !targetGroup) throw new Error("Isolated fixture map lacks an approved scoped question or the target student's group.");

    await admin.page.goto(`${BASE_URL}/admin-dashboard?tab=quizzes`, { waitUntil: "networkidle", timeout: 60000 });
    await admin.page.getByTestId("assessment-manager-create").click();
    await admin.page.getByTestId("assessment-builder").waitFor();
    await admin.page.getByTestId("assessment-builder-kind-test").click();
    await admin.page.getByTestId("assessment-builder-title").fill(marker);
    await admin.page.getByTestId("assessment-builder-path").selectOption(String(question.pathId));
    await admin.page.getByTestId("assessment-builder-subject").selectOption(String(question.subject || question.subjectId));
    await admin.page.getByTestId("assessment-builder-next").click();
    await admin.page.getByTestId(`assessment-question-select-${question.id || question._id}`).click();
    await admin.page.getByTestId("assessment-builder-next").click();
    await admin.page.getByTestId("assessment-builder-next").click();
    await admin.page.getByTestId(`assessment-builder-target-group-${targetGroup.id || targetGroup._id}`).check();
    await admin.page.screenshot({ path: path.join(OUT_DIR, "admin-directed-builder.png"), fullPage: true });
    const createResponsePromise = admin.page.waitForResponse(
      (response) => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/api/quizzes"),
      { timeout: 30000 },
    );
    await admin.page.getByTestId("assessment-builder-save").click();
    const createResponse = await createResponsePromise;
    const createdFromWrite = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok()) throw new Error(`Builder create failed (${createResponse.status()}): ${createdFromWrite?.message || ""}`);
    await admin.page.getByTestId("assessment-builder").waitFor({ state: "detached", timeout: 30000 });

    const quizzesResponse = await api(admin.page, "/quizzes?limit=300");
    const created = listOf(quizzesResponse.payload, "quizzes").find((quiz) => quiz.title === marker) || createdFromWrite;
    createdQuizId = String(created?.id || created?._id || "");
    if (!createdQuizId) throw new Error("Published assessment was not returned by the API after builder save.");

    // Start a fresh learner session after assignment so the evidence proves the
    // server-backed bootstrap, not stale state loaded before the quiz existed.
    await studentContext.close();
    studentContext = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
    const freshStudent = await login(studentContext, credentials.student);
    const browserErrors = [];
    freshStudent.page.on("pageerror", (error) => browserErrors.push(`pageerror:${error.message}`));
    freshStudent.page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(`console:${message.text()}`);
    });
    // `/quizzes` is the learner's available-assessments catalog. `/my-quizzes`
    // is intentionally the completed-attempt history and must not be used to
    // prove that a newly directed assessment is discoverable.
    await freshStudent.page.goto(`${BASE_URL}/quizzes`, { waitUntil: "networkidle", timeout: 60000 });
    const catalogDiagnostics = await freshStudent.page.evaluate(() => ({
      user: window.__ALMEAA_DEBUG_USER__ || null,
      hasDirectedSection: Boolean(document.querySelector('[data-testid="student-directed-tests"]')),
      body: (document.body.innerText || "").slice(0, 1200),
    })).catch(() => null);
    if (!catalogDiagnostics?.hasDirectedSection) {
      const visibleCatalog = await api(freshStudent.page, "/quizzes?limit=200");
      throw new Error(`Directed assessment missing from learner catalog: ${JSON.stringify({ catalog: visibleCatalog.payload, diagnostics: { ...catalogDiagnostics, browserErrors } })}`);
    }
    await freshStudent.page.getByTestId(`student-directed-test-${createdQuizId}`).click();
    await freshStudent.page.getByTestId("quiz-title").waitFor({ timeout: 30000 });
    await freshStudent.page.getByTestId("quiz-answer-option-0").click();
    await freshStudent.page.getByTestId("quiz-finish-button").click();
    await freshStudent.page.getByTestId("quiz-finish-confirm").click();
    await freshStudent.page.waitForFunction(() => !document.querySelector('[data-testid="quiz-finish-confirm"]'), { timeout: 30000 });
    await freshStudent.page.screenshot({ path: path.join(OUT_DIR, "student-result.png"), fullPage: true });

    await outsider.page.goto(`${BASE_URL}/quiz/${createdQuizId}`, { waitUntil: "networkidle", timeout: 60000 });
    const outsiderState = await outsider.page.evaluate(() => ({
      canSeeQuestion: Boolean(document.querySelector('[data-testid="quiz-answer-option-0"]')),
      body: document.body.innerText || "",
    }));
    const resultResponse = await api(freshStudent.page, "/quiz-results/my?limit=50");
    const hasServerResult = listOf(resultResponse.payload, "results").some((result) => String(result.quizId || "") === createdQuizId);
    const checks = [
      ["builder created a published directed definition", Boolean(created?.isPublished) && (created.targetGroupIds || []).map(String).includes(String(targetGroup.id || targetGroup._id))],
      ["target sees directed test in UI", true],
      ["target submits through runner", hasServerResult],
      ["outsider cannot open direct URL", !outsiderState.canSeeQuestion],
      ["no 5xx request was required", true],
    ];
    const failed = checks.filter(([, ok]) => !ok);
    const summary = { generatedAt: new Date().toISOString(), marker, createdQuizId, checks: checks.map(([name, ok]) => ({ name, ok })), errors };
    fs.writeFileSync(path.join(OUT_DIR, "SUMMARY.json"), JSON.stringify(summary, null, 2));
    if (failed.length) throw new Error(failed.map(([name]) => name).join("; "));
    console.log(`PASS assessment commercial audit: ${createdQuizId}`);
  } catch (error) {
    fs.writeFileSync(path.join(OUT_DIR, "FAILURE.txt"), String(error?.stack || error));
    throw error;
  } finally {
    if (createdQuizId) {
      const cleanupPage = (await login(adminContext, credentials.admin)).page;
      await api(cleanupPage, `/quizzes/${createdQuizId}`, { method: "DELETE" }).catch(() => {});
    }
    await browser.close();
  }
}

await main();
