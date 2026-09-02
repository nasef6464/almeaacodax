import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "").replace(/\/$/, "");
const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "").replace(/\/$/, "");
const RUN_ID = process.env.ASSESSMENT_MOCK_SESSION_AUDIT_RUN_ID || `assessment-mock-session-${Date.now()}`;
const OUT_DIR = path.resolve("audit-artifacts", "ui-audit-exhaustive", RUN_ID);
const CREDENTIALS_FILE = process.env.ROLE_CREDENTIALS_FILE || path.resolve("audit-artifacts", "ROLE_CREDENTIALS.env");

if (!BASE_URL || !API_BASE_URL) throw new Error("UI_AUDIT_BASE_URL and UI_AUDIT_API_BASE_URL are required on the isolated stack.");
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
      method: "POST", credentials: "include",
      headers: { "content-type": "application/json", "x-csrf-token": csrfBody?.csrfToken || "" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.user) return { ok: false, status: response.status, message: payload?.message || "" };
    sessionStorage.setItem("the-hundred-auth-profile", JSON.stringify({
      id: String(payload.user.id || payload.user._id || payload.user.email), email: payload.user.email,
      displayName: payload.user.name, photoURL: payload.user.avatar || "", role: payload.user.role,
      groupIds: Array.isArray(payload.user.groupIds) ? payload.user.groupIds.map(String) : [], schoolId: payload.user.schoolId || null,
    }));
    if (csrfBody?.csrfToken) sessionStorage.setItem("almeaa:csrf-token", csrfBody.csrfToken);
    return { ok: true, user: payload.user };
  }, { apiBaseUrl: API_BASE_URL, ...account });
  if (!result.ok) throw new Error(`Login failed (${result.status}): ${result.message}`);
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

const listOf = (payload, key) => Array.isArray(payload?.[key]) ? payload[key] : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const adminContext = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
  const studentContext = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
  let managerContext;
  let mockQuizId = "";
  let temporaryQuestionId = "";
  try {
    const admin = await login(adminContext, credentials.admin);
    const student = await login(studentContext, credentials.student);
    const [questionsResponse, bootstrapResponse, studentMe] = await Promise.all([
      api(admin.page, "/quizzes/questions?approvalStatus=approved&limit=100"),
      api(admin.page, "/content/bootstrap?scope=full"),
      api(student.page, "/auth/me"),
    ]);
    const questions = listOf(questionsResponse.payload, "questions");
    const firstQuestion = questions.find((question) => question.pathId && (question.subject || question.subjectId));
    let secondQuestion = questions.find((question) => String(question.id || question._id) !== String(firstQuestion?.id || firstQuestion?._id) && String(question.pathId) === String(firstQuestion?.pathId) && String(question.subject || question.subjectId) === String(firstQuestion?.subject || firstQuestion?.subjectId));
    const groupIds = new Set([...(student.user.groupIds || []), ...(studentMe.payload?.groupIds || []), ...(studentMe.payload?.user?.groupIds || [])].map(String));
    const targetGroup = listOf(bootstrapResponse.payload, "groups").find((group) => groupIds.has(String(group.id || group._id)));
    if (!questionsResponse.ok || !firstQuestion || !targetGroup) throw new Error("Fixture lacks an approved scoped question or a target student group.");

    // The isolated operational fixture deliberately stays small. When it has
    // only one approved question in this scope, create a second approved
    // question through the public admin contract so each mock section remains
    // genuinely distinct.
    if (!secondQuestion) {
      temporaryQuestionId = `assessment-mock-question-${Date.now()}`;
      const createdQuestion = await api(admin.page, "/quizzes/questions", {
        method: "POST",
        body: JSON.stringify({
          id: temporaryQuestionId,
          text: `Mock lifecycle verification question ${temporaryQuestionId}`,
          options: ["غير صحيح", "صحيح"],
          correctOptionIndex: 1,
          explanation: "سؤال مؤقت لدليل الجلسة المعزولة.",
          skillIds: [String(firstQuestion.skillIds?.[0] || `assessment-mock-skill-${Date.now()}`)],
          pathId: firstQuestion.pathId,
          subject: firstQuestion.subject || firstQuestion.subjectId,
          approvalStatus: "approved",
        }),
      });
      if (!createdQuestion.ok) throw new Error(`Could not create second mock fixture question: ${JSON.stringify(createdQuestion)}`);
      secondQuestion = createdQuestion.payload;
    }

    const marker = `assessment-mock-session-${Date.now()}`;
    await admin.page.goto(`${BASE_URL}/admin-dashboard?tab=quizzes`, { waitUntil: "networkidle", timeout: 60000 });
    await admin.page.getByTestId("assessment-manager-create").click();
    await admin.page.getByTestId("assessment-builder").waitFor();
    await admin.page.getByTestId("assessment-builder-kind-mock").click();
    await admin.page.getByTestId("assessment-builder-title").fill(marker);
    await admin.page.getByTestId("assessment-builder-path").selectOption(String(firstQuestion.pathId));
    await admin.page.getByTestId("assessment-builder-subject").selectOption(String(firstQuestion.subject || firstQuestion.subjectId));
    await admin.page.getByTestId("assessment-builder-next").click();
    await admin.page.getByTestId("assessment-builder-mock-section-tab-0").click();
    await admin.page.getByTestId("assessment-question-search").fill(String(firstQuestion.id || firstQuestion._id));
    await admin.page.getByTestId(`assessment-question-select-${firstQuestion.id || firstQuestion._id}`).waitFor({ timeout: 30000 });
    await admin.page.getByTestId(`assessment-question-select-${firstQuestion.id || firstQuestion._id}`).click();
    await admin.page.getByTestId("assessment-builder-mock-section-tab-1").click();
    await admin.page.getByTestId("assessment-question-search").fill(String(secondQuestion.id || secondQuestion._id));
    await admin.page.getByTestId(`assessment-question-select-${secondQuestion.id || secondQuestion._id}`).waitFor({ timeout: 30000 });
    await admin.page.getByTestId(`assessment-question-select-${secondQuestion.id || secondQuestion._id}`).click();
    await admin.page.getByTestId("assessment-builder-next").click();
    await admin.page.getByTestId("assessment-builder-next").click();
    await admin.page.getByTestId(`assessment-builder-target-group-${targetGroup.id || targetGroup._id}`).check();
    const createResponsePromise = admin.page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/api/quizzes"), { timeout: 30000 });
    await admin.page.getByTestId("assessment-builder-save").click();
    const createResponse = await createResponsePromise;
    const createdFromWrite = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok()) throw new Error(`Mock builder create failed (${createResponse.status()}): ${createdFromWrite?.message || ""}`);
    const created = listOf((await api(admin.page, "/quizzes?limit=200")).payload, "quizzes").find((quiz) => quiz.title === marker) || createdFromWrite;
    mockQuizId = String(created.id || created._id || "");
    if (!mockQuizId || created.quizKind !== "mock" || !(created.mockExam?.sections?.length >= 2)) throw new Error(`Mock definition was not persisted with two sections: ${JSON.stringify(created)}`);

    // A manager's assessment catalog is intentionally a loaded read model.
    // Open an independent manager session after publication, before the learner
    // starts, then prove its analytics refresh after the persisted submission.
    managerContext = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
    const manager = await login(managerContext, credentials.admin);
    await manager.page.goto(`${BASE_URL}/admin-dashboard?tab=quizzes`, { waitUntil: "networkidle", timeout: 60000 });
    await manager.page.getByTestId(`assessment-manager-preview-${mockQuizId}`).waitFor({ timeout: 30000 });

    await student.page.goto(`${BASE_URL}/quiz/${encodeURIComponent(mockQuizId)}?source=mock-exam`, { waitUntil: "networkidle", timeout: 60000 });
    await student.page.getByTestId("quiz-title").waitFor({ timeout: 30000 });
    await student.page.getByTestId("quiz-mock-section-0").waitFor();
    await student.page.getByTestId("quiz-mock-section-1").waitFor();
    const autosaveResponsePromise = student.page.waitForResponse(
      (response) => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/api/live-exams/progress"),
      { timeout: 30000 },
    );
    await student.page.getByTestId("quiz-answer-option-0").click();
    const autosaveResponse = await autosaveResponsePromise;
    if (!autosaveResponse.ok()) throw new Error(`Mock autosave request failed (${autosaveResponse.status()})`);
    const saved = await api(student.page, `/live-exams/session/${encodeURIComponent(mockQuizId)}`);
    const answers = saved.payload?.answers || {};
    if (!saved.ok || !saved.payload?.session?.assessmentAttemptId || Object.keys(answers).length !== 1) throw new Error(`Mock autosave missing: ${JSON.stringify(saved)}`);
    await student.page.getByTestId("quiz-mock-section-1").click();
    await student.page.waitForFunction(
      () => document.querySelector('[data-testid="quiz-mock-section-1"]')?.className.includes('bg-indigo-600'),
      { timeout: 30000 },
    );
    // The active-section control is the runner contract. Question copy is not:
    // two valid questions may intentionally have matching visible text. The
    // persisted two-answer assertion below proves that the second response is
    // recorded against the resumed mock session without coupling this audit to
    // presentation text.
    const secondAutosaveResponsePromise = student.page.waitForResponse(
      (response) => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/api/live-exams/progress"),
      { timeout: 30000 },
    );
    await student.page.getByTestId("quiz-answer-option-0").click();
    const secondAutosaveResponse = await secondAutosaveResponsePromise;
    if (!secondAutosaveResponse.ok()) throw new Error(`Mock second autosave request failed (${secondAutosaveResponse.status()})`);
    let afterSecondAnswer;
    let allAnswers = {};
    for (let retry = 0; retry < 40; retry += 1) {
      afterSecondAnswer = await api(student.page, `/live-exams/session/${encodeURIComponent(mockQuizId)}`);
      allAnswers = afterSecondAnswer.payload?.answers || {};
      if (Object.keys(allAnswers).length === 2) break;
      await student.page.waitForTimeout(250);
    }
    if (!afterSecondAnswer.ok || Object.keys(allAnswers).length !== 2) throw new Error(`Mock second answer was not saved: ${JSON.stringify(afterSecondAnswer)}`);
    const retryPayload = { quizId: mockQuizId, answeredQuestions: 2, totalQuestions: 2, answers: { ...allAnswers } };
    const [retryOne, retryTwo] = await Promise.all([
      api(student.page, "/live-exams/progress", { method: "POST", body: JSON.stringify(retryPayload) }),
      api(student.page, "/live-exams/progress", { method: "POST", body: JSON.stringify(retryPayload) }),
    ]);
    const resumed = await api(student.page, `/live-exams/session/${encodeURIComponent(mockQuizId)}`);
    if (!retryOne.ok || !retryTwo.ok || String(resumed.payload?.session?.assessmentAttemptId || "") !== String(saved.payload.session.assessmentAttemptId) || Object.keys(resumed.payload?.answers || {}).length !== 2) throw new Error(`Mock retry/resume failed: ${JSON.stringify({ retryOne, retryTwo, resumed })}`);
    await student.page.screenshot({ path: path.join(OUT_DIR, "mock-runner-resumed.png"), fullPage: true });
    await student.page.getByTestId("quiz-finish-button").waitFor({ timeout: 30000 });
    await student.page.getByTestId("quiz-finish-button").click();
    await student.page.getByTestId("quiz-finish-confirm").click();
    await student.page.waitForFunction(() => !document.querySelector('[data-testid="quiz-finish-confirm"]'), { timeout: 30000 });
    // Closing the confirmation dialog starts an asynchronous server submission.
    // Read the persisted result with a short bounded poll, rather than racing
    // the write and falsely classifying a complete mock as an empty result.
    let result;
    let results;
    for (let retry = 0; retry < 20; retry += 1) {
      results = await api(student.page, "/quiz-results/my?limit=50");
      result = listOf(results.payload, "results").find((item) => String(item.quizId || "") === mockQuizId);
      if (Array.isArray(result?.sectionResults) && result.sectionResults.length >= 2) break;
      await student.page.waitForTimeout(250);
    }
    // The manager catalog was loaded after publication. Opening its preview
    // now must fetch current, authorization-scoped analytics after completion.
    await manager.page.getByTestId(`assessment-manager-preview-${mockQuizId}`).click();
    await manager.page.getByTestId("assessment-mock-section-analytics").waitFor({ timeout: 30000 });
    await manager.page.waitForFunction(
      () => document.querySelectorAll('[data-testid^="assessment-mock-section-analytics-row-"]').length >= 2,
      { timeout: 30000 },
    );
    const checks = [
      ["two-section mock definition is published", created.quizKind === "mock" && created.mockExam.sections.length >= 2],
      ["runner exposes both sections", true],
      ["server attempt/autosave survives retry", retryOne.ok && retryTwo.ok && String(resumed.payload?.session?.assessmentAttemptId || "") === String(saved.payload.session.assessmentAttemptId)],
      ["mock result preserves section analysis", Array.isArray(result?.sectionResults) && result.sectionResults.length >= 2],
      ["authorized manager reads section analytics in UI", true],
    ];
    fs.writeFileSync(path.join(OUT_DIR, "SUMMARY.json"), JSON.stringify({ mockQuizId, checks: checks.map(([name, ok]) => ({ name, ok })) }, null, 2));
    const failed = checks.filter(([, ok]) => !ok);
    if (failed.length) throw new Error(`Mock session checks failed: ${failed.map(([name]) => name).join("; ")} :: ${JSON.stringify({ result, results, resumed })}`);
    console.log(`PASS assessment mock session audit: ${mockQuizId}`);
  } finally {
    await managerContext?.close();
    if (mockQuizId) {
      const cleanup = await login(adminContext, credentials.admin);
      await api(cleanup.page, `/quizzes/${encodeURIComponent(mockQuizId)}`, { method: "DELETE" }).catch(() => {});
      if (temporaryQuestionId) await api(cleanup.page, `/quizzes/questions/${encodeURIComponent(temporaryQuestionId)}`, { method: "DELETE" }).catch(() => {});
    }
    await browser.close();
  }
}

await main();
